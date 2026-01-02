import { Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcryptjs';
import { pick } from 'lodash';
import * as moment from 'moment';

import { NotificationService } from 'src/notification/services/notification.service';
import { EmailTemplateID } from 'src/notification/types';
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
import { LoginPayload } from '../types';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly cache: Cache,
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

  async forgotPassword(payload: ForgotPasswordDTO) {
    const [user] = await this.userService.find({
      email: payload.email.trim().toLowerCase(),
    });

    if (!user) {
      return;
    }

    const resetCode = Util.generateRandomString(8).toUpperCase();
    await this.userService.updateOne(
      { _id: user.id },
      {
        passwordResetCode: resetCode,
        passwordResetCodeExpiresAt: moment().add(1, 'hour').toDate(),
      },
    );

    const [userAfterUpdate] = await this.userService.find({
      _id: user.id,
    });

    await this.notificationService.sendEmail({
      to: [
        {
          email: userAfterUpdate.email,
          name: `${userAfterUpdate.firstname} ${userAfterUpdate.lastname}`,
        },
      ],
      subject: 'Password Reset',
      templateId: EmailTemplateID.RESET_PASSWORD,
      templateData: { resetCode, name: user.firstname },
    });
  }

  async resetPassword(payload: ResetPasswordDTO) {
    let user = await this.userService.findUserByResetToken(payload.resetToken);

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    const password = await hash(payload.password, 8);

    await this.userService.updateOne(
      { _id: user.id },
      { password },
      {
        passwordResetCode: true,
        passwordResetCodeExpiresAt: true,
      },
    );

    [user] = await this.userService.find({ _id: user.id });

    return this.getLoggedInUser(user);
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

    [user] = await this.userService.find({ _id: user.id });

    return this.getLoggedInUser(user);
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
