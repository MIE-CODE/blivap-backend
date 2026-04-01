import { createHash, randomBytes } from 'crypto';

import { Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { hash, compare } from 'bcryptjs';
import { pick } from 'lodash';
import * as moment from 'moment';
import { Model, Types } from 'mongoose';

import { NotificationService } from 'src/notification/services/notification.service';
import { EmailTemplateID } from 'src/notification/types';
import config from 'src/shared/config';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { Util } from 'src/shared/util';
import { User } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';

import {
  ChangePasswordDTO,
  EditProfileDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  SignupDTO,
  VerifyEmailDTO,
} from '../dtos/authentication.dto';
import { PasswordResetTokenDocument } from '../schemas/password-reset-token.schema';
import { LoginPayload } from '../types';

const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;

function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly cache: Cache,
    @InjectModel(DB_TABLE_NAMES.passwordResetTokens)
    private readonly passwordResetTokenModel: Model<PasswordResetTokenDocument>,
  ) {}

  async login(payload: LoginPayload) {
    const [user] = await this.userService.find({
      email: payload.email.trim().toLowerCase(),
    });

    const isValidPassword = await compare(
      payload.password,
      user?.password ?? '',
    );
    if (!user || !isValidPassword) {
      this.logger.log('Failed login attempt', {
        payload: { ...payload, password: '' },
        user,
      });

      throw new UnauthorizedException('invalid credentials');
    }

    this.logger.log('Successful login', {
      payload: { ...payload, password: '' },
      user,
    });

    return user;
  }

  getExpirationDateFromToken(token: string) {
    try {
      const [, payload] = token.split('.');
      const parsedPayload = Buffer.from(`${payload}==`, 'base64').toString();
      const payloadJSON = JSON.parse(parsedPayload);

      return moment(payloadJSON.exp * 1000).toDate();
    } catch (error) {
      this.logger.error('Failed to parse token expiration date', { error });

      return new Date('Invalid Date');
    }
  }

  async getAuthTokens(user: User) {
    const payloadId = await hash(`${user.email}${user.password}`, 8);
    const payload = { ...pick(user, ['id']), payloadId };
    const accessToken = this.jwtService.sign(payload);
    const accessTokenExpires = this.getExpirationDateFromToken(accessToken);

    return {
      accessToken,
      accessTokenExpires,
    };
  }

  async getLoggedInUser(user: User) {
    const tokens = await this.getAuthTokens(user);

    this.userService
      .updateOne({ _id: user.id }, { lastActive: new Date() })
      .then(() => {
        /** tiktok */
      });

    return { user, ...tokens };
  }

  async signup(payload: SignupDTO) {
    const [existingUser] = await this.userService.find({
      email: payload.email.trim().toLowerCase(),
    });

    if (existingUser) {
      this.logger.log('Failed signup attempt', {
        payload: { ...payload, password: '' },
      });

      throw new ConflictException('email already in use');
    }

    const hashedPassword = await hash(payload.password, 8);
    const emailValidationToken = Util.generateRandomString(6).toUpperCase();

    const newUser = await this.userService.createOne({
      ...payload,
      email: payload.email.trim().toLowerCase(),
      password: hashedPassword,
      emailValidationToken,
      emailVerified: false,
    });

    this.sendEmailVerificationLink(newUser);
    this.sendWelcomeEmail(newUser);

    this.logger.log('Successful signup', {
      payload: { ...payload, password: '' },
      newUser,
    });

    return this.getLoggedInUser(newUser);
  }

  async sendEmailVerificationLink(user: User) {
    if (!user.emailVerified) {
      this.notificationService.sendEmail({
        subject: 'Confirm your email address',
        to: [{ email: user.email, name: `${user.firstname} ${user.lastname}` }],
        templateId: EmailTemplateID.VERIFY_EMAIL_ADDRESS,
        templateData: {
          emailValidationToken: user.emailValidationToken,
          name: user.firstname,
        },
      });
    }
  }

  /** Queues welcome email for new accounts (uses CLIENT_BASE_URL for app link). */
  sendWelcomeEmail(user: User) {
    const appUrl = config().client.baseUrl || 'https://blivap.com';

    this.notificationService.sendEmail({
      subject: 'Welcome to Blivap',
      to: [{ email: user.email, name: `${user.firstname} ${user.lastname}` }],
      templateId: EmailTemplateID.WELCOME_EMAIL,
      templateData: {
        name: user.firstname,
        appUrl,
      },
    });
  }

  async resendEmailVerification(email: string) {
    const [user] = await this.userService.find({
      email: email.trim().toLowerCase(),
    });

    if (!user || user.emailVerified) {
      return;
    }

    this.sendEmailVerificationLink(user);
  }

  async veirfyEmail(payload: VerifyEmailDTO) {
    const [user] = await this.userService.find(
      {
        emailValidationToken: payload.emailValidationToken,
        email: payload.email.trim().toLowerCase(),
      },
      ['_id'],
    );
    if (!user) {
      throw new BadRequestException('invalid email validation token');
    }

    await this.userService.updateOne(
      { _id: user.id },
      { emailVerified: true, emailVerifiedAt: new Date() },
    );
  }

  /**
   * Request a password reset email with a single-use link (10-minute expiry).
   * Same generic outcome whether or not the email is registered (no enumeration).
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const [user] = await this.userService.find({ email: normalized });

    if (!user) {
      return;
    }

    await this.passwordResetTokenModel.updateMany(
      { userId: new Types.ObjectId(user.id), used: false },
      { $set: { used: true } },
    );

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.passwordResetTokenModel.create({
      userId: new Types.ObjectId(user.id),
      tokenHash,
      expiresAt,
      used: false,
    });

    const baseUrl = config().passwordReset.frontendBaseUrl;
    if (!baseUrl && config().isProd) {
      this.logger.error(
        'CLIENT_BASE_URL / FRONTEND_URL / PASSWORD_RESET_BASE_URL is not set; cannot build password reset link',
      );
    }

    const resetLink = baseUrl
      ? `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`
      : `#reset-password?token=${encodeURIComponent(rawToken)}`;

    await this.notificationService.sendEmail({
      to: [
        {
          email: user.email,
          name: `${user.firstname} ${user.lastname}`,
        },
      ],
      subject: 'Password Reset',
      templateId: EmailTemplateID.RESET_PASSWORD,
      templateData: {
        name: user.firstname,
        resetLink,
        expiresInMinutes: 10,
      },
    });
  }

  async forgotPassword(payload: ForgotPasswordDTO) {
    await this.requestPasswordReset(payload.email);
  }

  /**
   * Complete password reset using opaque token from email link (hashed in DB).
   */
  async resetPasswordWithToken(payload: {
    token: string;
    newPassword: string;
  }) {
    const tokenHash = hashResetToken(payload.token);
    const tokenDoc = await this.passwordResetTokenModel.findOne({ tokenHash });

    if (!tokenDoc) {
      throw new BadRequestException('Invalid or unknown reset token');
    }

    if (tokenDoc.used) {
      throw new ConflictException(
        'This password reset link has already been used',
      );
    }

    if (tokenDoc.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('This password reset link has expired');
    }

    const hashedPassword = await hash(payload.newPassword, 8);

    await this.userService.updateOne(
      { _id: tokenDoc.userId.toString() },
      { password: hashedPassword },
      {
        passwordResetCode: true,
        passwordResetCodeExpiresAt: true,
      },
    );

    await this.passwordResetTokenModel.updateOne(
      { _id: tokenDoc._id },
      { $set: { used: true } },
    );

    const [user] = await this.userService.find({
      _id: tokenDoc.userId.toString(),
    });

    return this.getLoggedInUser(user);
  }

  async resetPassword(payload: ResetPasswordDTO) {
    return this.resetPasswordWithToken({
      token: payload.resetToken,
      newPassword: payload.password,
    });
  }

  async editProfile(user: User, payload: EditProfileDTO) {
    await this.userService.updateOne({ _id: user.id }, payload);

    return this.userService.find({ _id: user.id });
  }

  async changePassword(user: User, payload: ChangePasswordDTO) {
    const isValidOldPassword = await compare(
      payload.oldPassword,
      user.password,
    );
    if (!isValidOldPassword) {
      throw new BadRequestException('Invalid password');
    }

    const password = await hash(payload.password, 8);

    await this.userService.updateOne({ _id: user.id }, { password });

    const [updatedUser] = await this.userService.find({ _id: user.id });

    return this.getLoggedInUser(updatedUser);
  }

  async me(user: User) {
    return user;
  }

  async logOut(token: string) {
    const expiresAt = this.getExpirationDateFromToken(token);
    const expiresAtInMs = expiresAt.getTime() - Date.now();
    const isLoggedOut = await this.cache.get(token);

    if (!isLoggedOut && expiresAtInMs > 0) {
      await this.cache.set(token, true, expiresAtInMs);
    }
  }
}
