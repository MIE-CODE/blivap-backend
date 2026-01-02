import { Cache } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { compare } from 'bcryptjs';
import * as moment from 'moment';

import { NotificationService } from 'src/notification/services/notification.service';
import { EmailTemplateID } from 'src/notification/types';
import { User } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';

import { AuthenticationService } from '../services/authentication.service';

jest.mock('bcryptjs');

const userService = {
  find: jest.fn(),
  findUserByResetToken: jest.fn(),
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

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Cache, useValue: cache },
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
        id: '123',
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

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      const user = {
        id: '123',
        email: 'test@test.com',
        firstname: 'Test',
        lastname: 'User',
      } as User;

      userService.find.mockResolvedValue([user]);
      userService.updateOne.mockResolvedValue(null);
      notificationService.sendEmail = jest.fn();

      await service.forgotPassword({ email: user.email });

      expect(userService.updateOne).toHaveBeenCalledWith(
        { _id: user.id },
        {
          passwordResetCode: expect.any(String),
          passwordResetCodeExpiresAt: expect.any(Date),
        },
      );
      expect(notificationService.sendEmail).toHaveBeenCalledWith({
        subject: 'Password Reset',
        to: [{ email: user.email, name: `${user.firstname} ${user.lastname}` }],
        templateId: EmailTemplateID.RESET_PASSWORD,
        templateData: {
          name: user.firstname,
          resetCode: expect.any(String),
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

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const user = {
        id: '123',
        email: 'test@test.com',
      } as User;

      userService.findUserByResetToken.mockResolvedValue(user);
      userService.updateOne.mockResolvedValue(null);
      userService.find.mockResolvedValue([user]);
      jest.spyOn(service, 'getLoggedInUser').mockResolvedValue({
        user,
        accessToken: 'token',
        accessTokenExpires: new Date(),
      });

      const result = await service.resetPassword({
        resetToken: 'VALID_TOKEN',
        password: 'newPassword',
      });

      expect(result).toEqual({
        user,
        accessToken: 'token',
        accessTokenExpires: expect.any(Date),
      });
    });

    it('should throw BadRequestException with invalid token', async () => {
      userService.findUserByResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          resetToken: 'INVALID_TOKEN',
          password: 'newPassword',
        }),
      ).rejects.toThrow('Invalid reset token');
    });
  });

  describe('editProfile', () => {
    it('should update user profile and return updated user', async () => {
      const user = {
        id: '123',
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
        id: '123',
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
        id: '123',
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
        id: '123',
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

      // Mock Date.now to return a fixed value
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      jest
        .spyOn(service, 'getExpirationDateFromToken')
        .mockReturnValue(expiresAt);

      cache.get.mockResolvedValue(false);
      cache.set.mockResolvedValue(true);

      await service.logOut(token);

      expect(cache.get).toHaveBeenCalledWith(token);
      expect(cache.set).toHaveBeenCalledWith(token, true, expiresAtInMs);

      // Restore the original Date.now
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
