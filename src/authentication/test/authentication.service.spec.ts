import { Cache } from '@nestjs/cache-manager';
import {
  ConflictException,
  GoneException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { compare } from 'bcryptjs';
import * as moment from 'moment';

import { AuthenticationService } from 'src/authentication/services/authentication.service';
import { NotificationService } from 'src/notification/services/notification.service';
import { EmailTemplateID } from 'src/notification/types';
import config from 'src/shared/config';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { User } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';

jest.mock('src/shared/config', () => ({
  default: jest.fn(),
}));

jest.mock('bcryptjs');
jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    randomBytes: jest.fn(() => Buffer.alloc(32, 0xab)),
  };
});

const userService = {
  find: jest.fn(),
  updateOne: jest.fn(),
  createOne: jest.fn(),
} as unknown as jest.Mocked<UserService>;
const jwtService = {
  sign: jest.fn(),
} as unknown as jest.Mocked<JwtService>;
const notificationService = {
  sendEmail: jest.fn(),
} as unknown as jest.Mocked<NotificationService>;
const cache = {
  get: jest.fn(),
  set: jest.fn(),
} as unknown as jest.Mocked<Cache>;
const passwordResetTokenModel = {
  updateMany: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
};

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(async () => {
    (config as jest.Mock).mockReturnValue({
      passwordReset: { frontendBaseUrl: 'https://app.example.com' },
      client: { baseUrl: 'https://app.example.com' },
      isProd: false,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Cache, useValue: cache },
        {
          provide: getModelToken(DB_TABLE_NAMES.passwordResetTokens),
          useValue: passwordResetTokenModel,
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should login a user', async () => {
      const user = {} as User;
      const payload = { email: 'test@test.com', password: 'password' };

      userService.find.mockResolvedValue([user]);
      (compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(payload);
      expect(result).toEqual(user);
    });

    it('should throw an error if the user is not found', async () => {
      const payload = { email: 'test@test.com', password: 'password' };

      userService.find.mockResolvedValue([]);
      (compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(payload)).rejects.toThrow(
        new UnauthorizedException('invalid credentials'),
      );
    });

    it('should throw an error if the password is incorrect', async () => {
      const user = {} as User;
      const payload = { email: 'test@test.com', password: 'password' };

      userService.find.mockResolvedValue([user]);
      (compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(payload)).rejects.toThrow(
        new UnauthorizedException('invalid credentials'),
      );
    });
  });

  describe('getAuthTokens', () => {
    it('should return auth tokens', async () => {
      const user = {} as User;

      jwtService.sign.mockReturnValue('accessToken');

      jest
        .spyOn(service, 'getExpirationDateFromToken')
        .mockReturnValue(new Date('2025-01-01'));

      const result = await service.getAuthTokens(user);
      expect(result).toEqual({
        accessToken: 'accessToken',
        accessTokenExpires: new Date('2025-01-01'),
      });
    });
  });

  describe('getExpirationDateFromToken', () => {
    it('should return the expiration date from the token', () => {
      const token = `.${Buffer.from(
        JSON.stringify({ exp: new Date('2025-01-01').getTime() / 1000 }),
      ).toString('base64')}`;
      const result = service.getExpirationDateFromToken(token);
      expect(result).toEqual(new Date('2025-01-01'));
    });
  });

  describe('getLoggedInUser', () => {
    it('should return the logged in user', async () => {
      const user = {} as User;

      userService.updateOne.mockResolvedValue(null);

      jest.spyOn(service, 'getAuthTokens').mockResolvedValue({
        accessToken: 'accessToken',
        accessTokenExpires: new Date('2025-01-01'),
      });

      const result = await service.getLoggedInUser(user);

      expect(result).toEqual({
        user,
        accessToken: 'accessToken',
        accessTokenExpires: new Date('2025-01-01'),
      });
    });
  });

  describe('signup', () => {
    it('should create a new user and return logged in user data', async () => {
      const payload = {
        email: 'test@test.com',
        password: 'password',
        firstname: 'Test',
        lastname: 'User',
      };
      const newUser = { ...payload, id: '123' } as User;

      userService.find.mockResolvedValue([]);
      userService.createOne.mockResolvedValue(newUser);
      jest.spyOn(service, 'getLoggedInUser').mockResolvedValue({
        user: newUser,
        accessToken: 'token',
        accessTokenExpires: new Date(),
      });

      const result = await service.signup(payload);
      expect(result).toEqual({
        user: newUser,
        accessToken: 'token',
        accessTokenExpires: expect.any(Date),
      });
      expect(notificationService.sendEmail).toHaveBeenCalledTimes(2);
      expect(notificationService.sendEmail).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          templateId: EmailTemplateID.VERIFY_EMAIL_ADDRESS,
        }),
      );
      expect(notificationService.sendEmail).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          templateId: EmailTemplateID.WELCOME_EMAIL,
          subject: 'Welcome to Blivap',
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      const payload = {
        email: 'test@test.com',
        password: 'password',
        firstname: 'Test',
        lastname: 'User',
      };
      const existingUser = { ...payload, id: '123' } as User;

      userService.find.mockResolvedValue([existingUser]);

      await expect(service.signup(payload)).rejects.toThrow(
        'email already in use',
      );
    });
  });

  describe('sendEmailVerificationLink', () => {
    it('should send verification email if user is not verified', async () => {
      const user = {
        email: 'test@test.com',
        firstname: 'Test',
        lastname: 'User',
        emailVerified: false,
        emailValidationToken: 'ABC123',
      } as User;

      await service.sendEmailVerificationLink(user);
      expect(notificationService.sendEmail).toHaveBeenCalledWith({
        subject: 'Confirm your email address',
        to: [{ email: user.email, name: `${user.firstname} ${user.lastname}` }],
        templateId: EmailTemplateID.VERIFY_EMAIL_ADDRESS,
        templateData: {
          emailValidationToken: user.emailValidationToken,
          name: user.firstname,
        },
      });
    });

    it('should not send verification email if user is already verified', async () => {
      const user = {
        email: 'test@test.com',
        firstname: 'Test',
        lastname: 'User',
        emailVerified: true,
        emailValidationToken: 'ABC123',
      } as User;

      notificationService.sendEmail = jest.fn();

      await service.sendEmailVerificationLink(user);
      expect(notificationService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('resendEmailVerification', () => {
    it('should resend verification email for unverified user', async () => {
      const user = {
        email: 'test@test.com',
        firstname: 'Test',
        lastname: 'User',
        emailVerified: false,
        emailValidationToken: 'ABC123',
      } as User;

      userService.find.mockResolvedValue([user]);
      jest.spyOn(service, 'sendEmailVerificationLink').mockResolvedValue();

      await service.resendEmailVerification(user.email);
      expect(service.sendEmailVerificationLink).toHaveBeenCalledWith(user);
    });

    it('should not resend verification email if user is already verified', async () => {
      const user = {
        email: 'test@test.com',
        firstname: 'Test',
        lastname: 'User',
        emailVerified: true,
      } as User;

      userService.find.mockResolvedValue([user]);
      jest.spyOn(service, 'sendEmailVerificationLink').mockResolvedValue();

      await service.resendEmailVerification(user.email);
      expect(service.sendEmailVerificationLink).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email with valid token', async () => {
      const user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@test.com',
        emailValidationToken: 'ABC123',
      } as User;

      userService.find.mockResolvedValue([user]);
      userService.updateOne.mockResolvedValue(null);

      await service.veirfyEmail({
        email: user.email,
        emailValidationToken: user.emailValidationToken,
      });

      expect(userService.updateOne).toHaveBeenCalledWith(
        { _id: user.id },
        { emailVerified: true, emailVerifiedAt: expect.any(Date) },
      );
    });

    it('should throw BadRequestException with invalid token', async () => {
      userService.find.mockResolvedValue([]);

      await expect(
        service.veirfyEmail({
          email: 'test@test.com',
          emailValidationToken: 'INVALID',
        }),
      ).rejects.toThrow('invalid email validation token');
    });
  });

  describe('requestPasswordReset', () => {
    it('should return without creating a token when user does not exist', async () => {
      userService.find.mockResolvedValue([]);

      await service.requestPasswordReset('nobody@example.com');

      expect(passwordResetTokenModel.updateMany).not.toHaveBeenCalled();
      expect(passwordResetTokenModel.create).not.toHaveBeenCalled();
      expect(notificationService.sendEmail).not.toHaveBeenCalled();
    });

    it('should invalidate old tokens, create a new token, and send email', async () => {
      const user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@test.com',
        firstname: 'Test',
        lastname: 'User',
      } as User;

      userService.find.mockResolvedValue([user]);
      passwordResetTokenModel.updateMany.mockResolvedValue({});
      passwordResetTokenModel.create.mockResolvedValue({});

      await service.requestPasswordReset(user.email);

      expect(passwordResetTokenModel.updateMany).toHaveBeenCalled();
      expect(passwordResetTokenModel.create).toHaveBeenCalled();
      expect(notificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Password Reset',
          templateId: EmailTemplateID.RESET_PASSWORD,
          templateData: expect.objectContaining({
            name: user.firstname,
            resetLink: expect.stringContaining('token='),
            expiresInMinutes: 10,
          }),
        }),
      );
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      const user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@test.com',
        firstname: 'Test',
        lastname: 'User',
      } as User;

      userService.find.mockResolvedValue([user]);
      passwordResetTokenModel.updateMany.mockResolvedValue({});
      passwordResetTokenModel.create.mockResolvedValue({});
      notificationService.sendEmail = jest.fn();

      await service.forgotPassword({ email: user.email });

      expect(passwordResetTokenModel.updateMany).toHaveBeenCalled();
      expect(passwordResetTokenModel.create).toHaveBeenCalled();
      expect(notificationService.sendEmail).toHaveBeenCalledWith({
        subject: 'Password Reset',
        to: [{ email: user.email, name: `${user.firstname} ${user.lastname}` }],
        templateId: EmailTemplateID.RESET_PASSWORD,
        templateData: {
          name: user.firstname,
          resetLink: expect.any(String),
          expiresInMinutes: 10,
        },
      });
    });

    it('should not send email if user does not exist', async () => {
      userService.find.mockResolvedValue([]);
      notificationService.sendEmail = jest.fn();

      await service.forgotPassword({ email: 'nonexistent@test.com' });

      expect(notificationService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPasswordWithToken', () => {
    it('should throw ConflictException when token was already used', async () => {
      passwordResetTokenModel.findOne.mockResolvedValue({
        _id: 'tid',
        userId: { toString: () => '507f1f77bcf86cd799439011' },
        used: true,
        expiresAt: new Date(Date.now() + 600000),
      });

      await expect(
        service.resetPasswordWithToken({
          token: 'any',
          newPassword: 'NewPassword1!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw GoneException when token is expired', async () => {
      passwordResetTokenModel.findOne.mockResolvedValue({
        _id: 'tid',
        userId: { toString: () => '507f1f77bcf86cd799439011' },
        used: false,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.resetPasswordWithToken({
          token: 'any',
          newPassword: 'NewPassword1!',
        }),
      ).rejects.toThrow(GoneException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@test.com',
      } as User;

      passwordResetTokenModel.findOne.mockResolvedValue({
        _id: 'tid',
        userId: { toString: () => '123' },
        used: false,
        expiresAt: new Date(Date.now() + 600000),
      });
      userService.updateOne.mockResolvedValue(null);
      passwordResetTokenModel.updateOne.mockResolvedValue({});
      userService.find.mockResolvedValue([user]);
      jest.spyOn(service, 'getLoggedInUser').mockResolvedValue({
        user,
        accessToken: 'token',
        accessTokenExpires: new Date(),
      });
      (compare as jest.Mock).mockResolvedValue(true);

      const result = await service.resetPassword({
        resetToken: 'a'.repeat(64),
        password: 'NewPassword1!',
      });

      expect(result).toEqual({
        user,
        accessToken: 'token',
        accessTokenExpires: expect.any(Date),
      });
      expect(passwordResetTokenModel.updateOne).toHaveBeenCalled();
    });

    it('should throw BadRequestException with invalid token', async () => {
      passwordResetTokenModel.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          resetToken: 'INVALID_TOKEN',
          password: 'NewPassword1!',
        }),
      ).rejects.toThrow('Invalid or unknown reset token');
    });
  });

  describe('editProfile', () => {
    it('should update user profile and return updated user', async () => {
      const user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@test.com',
      } as User;
      const updateData = {
        firstname: 'Updated',
        lastname: 'Name',
      };

      userService.updateOne.mockResolvedValue(null);
      userService.find.mockResolvedValue([{ ...user, ...updateData }]);

      const result = await service.editProfile(user, updateData);
      expect(result[0]).toEqual({ ...user, ...updateData });
    });
  });

  describe('changePassword', () => {
    it('should change password with valid old password', async () => {
      const user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@test.com',
        password: 'oldPassword',
      } as User;
      const payload = {
        oldPassword: 'oldPassword',
        password: 'newPassword',
      };

      (compare as jest.Mock).mockResolvedValue(true);
      userService.updateOne.mockResolvedValue(null);
      userService.find.mockResolvedValue([user]);
      jest.spyOn(service, 'getLoggedInUser').mockResolvedValue({
        user,
        accessToken: 'token',
        accessTokenExpires: new Date(),
      });

      const result = await service.changePassword(user, payload);
      expect(result).toEqual({
        user,
        accessToken: 'token',
        accessTokenExpires: expect.any(Date),
      });
    });

    it('should throw BadRequestException with invalid old password', async () => {
      const user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@test.com',
        password: 'oldPassword',
      } as User;
      const payload = {
        oldPassword: 'wrongPassword',
        password: 'newPassword',
      };

      (compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(user, payload)).rejects.toThrow(
        'Invalid password',
      );
    });
  });

  describe('me', () => {
    it('should return the current user', async () => {
      const user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@test.com',
      } as User;

      const result = await service.me(user);
      expect(result).toEqual(user);
    });
  });

  describe('logOut', () => {
    it('should log out a user', async () => {
      const token = 'token';
      const fixedNow = Date.now();
      const expiresAt = moment().add(1, 'day').toDate();
      const expiresAtInMs = expiresAt.getTime() - fixedNow;

      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      jest
        .spyOn(service, 'getExpirationDateFromToken')
        .mockReturnValue(expiresAt);

      cache.get.mockResolvedValue(false);
      cache.set.mockResolvedValue(true);

      await service.logOut(token);

      expect(cache.get).toHaveBeenCalledWith(token);
      expect(cache.set).toHaveBeenCalledWith(token, true, expiresAtInMs);

      jest.restoreAllMocks();
    });

    it('should skip logging out if the token is already logged out', async () => {
      const token = 'token';
      const expiresAt = moment().add(1, 'day').toDate();

      jest
        .spyOn(service, 'getExpirationDateFromToken')
        .mockReturnValue(expiresAt);

      cache.set.mockClear();

      cache.get.mockResolvedValue(true);
      cache.set.mockResolvedValue(true);

      await service.logOut(token);

      expect(cache.get).toHaveBeenCalledWith(token);
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should skip logging out if the token is expired', async () => {
      const token = 'token';
      const expiresAt = moment().subtract(1, 'day').toDate();

      jest
        .spyOn(service, 'getExpirationDateFromToken')
        .mockReturnValue(expiresAt);

      cache.set.mockClear();

      cache.get.mockResolvedValue(false);
      cache.set.mockResolvedValue(true);

      await service.logOut(token);

      expect(cache.get).toHaveBeenCalledWith(token);
      expect(cache.set).not.toHaveBeenCalled();
    });
  });
});
