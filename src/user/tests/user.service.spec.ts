import { Test, TestingModule } from '@nestjs/testing';
import { UpdateResult } from 'mongodb';

import { Model } from 'src/database/schemas';
import { DB_TABLE_NAMES } from 'src/shared/constants';

import { User, UserDocument } from '../schemas/user.schema';
import { UserService } from '../services/user.service';

const userModel = {
  find: jest.fn(),
  updateOne: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
} as unknown as jest.Mocked<Model<UserDocument>>;

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: `${DB_TABLE_NAMES.users}Model`, useValue: userModel },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('find', () => {
    it('should find users with query', async () => {
      const query = { email: 'test@test.com' };
      const users = [{ email: 'test@test.com' }] as Awaited<
        ReturnType<typeof userModel.find>
      >;

      userModel.find.mockResolvedValue(users);

      const result = await service.find(query);
      expect(result).toEqual(users);
      expect(userModel.find).toHaveBeenCalledWith(query);
    });

    it('should find users with query and select fields', async () => {
      const query = { email: 'test@test.com' };
      const select = ['email', 'firstname'];
      const expectedResult = [{ email: 'test@test.com', firstname: 'Test' }];

      const mockQuery = Promise.resolve(expectedResult);
      const mockSelect = jest.fn().mockReturnValue(mockQuery);

      // Make the promise have a select method (Mongoose query pattern)
      (mockQuery as unknown as { select: jest.Mock }).select = mockSelect;

      userModel.find.mockReturnValue(
        mockQuery as unknown as ReturnType<typeof userModel.find>,
      );

      const result = await service.find(query, select);
      expect(userModel.find).toHaveBeenCalledWith(query);
      expect(mockSelect).toHaveBeenCalledWith(select);
      expect(result).toEqual(expectedResult);
    });

    it('should return empty array when no users found', async () => {
      const query = { email: 'nonexistent@test.com' };
      const emptyUsers = [] as Awaited<ReturnType<typeof userModel.find>>;

      userModel.find.mockResolvedValue(emptyUsers);

      const result = await service.find(query);
      expect(result).toEqual(emptyUsers);
      expect(userModel.find).toHaveBeenCalledWith(query);
    });

    it('should find users without select parameter', async () => {
      const query = { email: 'test@test.com' };
      const users = [
        { email: 'test@test.com', firstname: 'Test', lastname: 'User' },
      ] as Awaited<ReturnType<typeof userModel.find>>;

      userModel.find.mockResolvedValue(users);

      const result = await service.find(query);
      expect(result).toEqual(users);
      expect(userModel.find).toHaveBeenCalledWith(query);
    });

    it('should find users with complex query', async () => {
      const query = {
        email: 'test@test.com',
        emailVerified: true,
        nationalIdentificationNumberVerified: false,
      };
      const users = [
        { email: 'test@test.com', emailVerified: true },
      ] as Awaited<ReturnType<typeof userModel.find>>;

      userModel.find.mockResolvedValue(users);

      const result = await service.find(query);
      expect(result).toEqual(users);
      expect(userModel.find).toHaveBeenCalledWith(query);
    });
  });

  describe('updateOne', () => {
    it('should update user with set operation', async () => {
      const query = { email: 'test@test.com' };
      const set = { firstname: 'Updated' };

      userModel.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      } as UpdateResult);

      await service.updateOne(query, set);
      expect(userModel.updateOne).toHaveBeenCalledWith(query, {
        $set: set,
      });
    });

    it('should update user with unset operation', async () => {
      const query = { email: 'test@test.com' };
      const unset = { emailValidationToken: true };

      userModel.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      } as UpdateResult);

      await service.updateOne(query, undefined, unset);
      expect(userModel.updateOne).toHaveBeenCalledWith(query, {
        $unset: unset,
      });
    });

    it('should update user with both set and unset operations', async () => {
      const query = { email: 'test@test.com' };
      const set = { firstname: 'Updated' };
      const unset = { emailValidationToken: true };

      userModel.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      } as UpdateResult);

      await service.updateOne(query, set, unset);
      expect(userModel.updateOne).toHaveBeenCalledWith(query, {
        $set: set,
        $unset: unset,
      });
    });

    it('should not update if no set or unset operations provided', async () => {
      const query = { email: 'test@test.com' };

      userModel.updateOne.mockClear();

      await service.updateOne(query);
      expect(userModel.updateOne).not.toHaveBeenCalled();
    });

    it('should update user with multiple fields in set operation', async () => {
      const query = { email: 'test@test.com' };
      const set = {
        firstname: 'Updated',
        lastname: 'Name',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      };

      userModel.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      } as UpdateResult);

      await service.updateOne(query, set);
      expect(userModel.updateOne).toHaveBeenCalledWith(query, {
        $set: set,
      });
    });

    it('should update user with multiple fields in unset operation', async () => {
      const query = { email: 'test@test.com' };
      const unset = {
        emailValidationToken: true,
        passwordResetCode: true,
        passwordResetCodeExpiresAt: true,
      };

      userModel.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      } as UpdateResult);

      await service.updateOne(query, undefined, unset);
      expect(userModel.updateOne).toHaveBeenCalledWith(query, {
        $unset: unset,
      });
    });

    it('should handle update with empty set object', async () => {
      const query = { email: 'test@test.com' };
      const set = {};
      const unset = { emailValidationToken: true };

      userModel.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 0,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      } as UpdateResult);

      await service.updateOne(query, set, unset);
      expect(userModel.updateOne).toHaveBeenCalledWith(query, {
        $set: set,
        $unset: unset,
      });
    });

    it('should handle update with complex query', async () => {
      const query = {
        email: 'test@test.com',
        emailVerified: false,
      };
      const set = { emailVerified: true, emailVerifiedAt: new Date() };

      userModel.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
        matchedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      } as UpdateResult);

      await service.updateOne(query, set);
      expect(userModel.updateOne).toHaveBeenCalledWith(query, {
        $set: set,
      });
    });
  });

  describe('createOne', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@test.com',
        password: 'Password123!',
        firstname: 'Test',
        lastname: 'User',
      } as User;
      const createdUser = { ...userData, id: '123' } as unknown as Awaited<
        ReturnType<typeof userModel.create>
      >;

      userModel.create.mockResolvedValue(createdUser);

      const result = await service.createOne(userData);
      expect(result).toEqual(createdUser);
      expect(userModel.create).toHaveBeenCalledWith(userData);
    });

    it('should create a user with all optional fields', async () => {
      const userData = {
        email: 'test@test.com',
        password: 'Password123!',
        firstname: 'Test',
        lastname: 'User',
        phonenumber: '+2348012345678',
        profileImage: 'https://example.com/image.jpg',
        nationalIdentificationNumber: '12345678901',
        dateOfBirth: new Date('1990-01-01'),
      } as User;
      const createdUser = { ...userData, id: '123' } as unknown as Awaited<
        ReturnType<typeof userModel.create>
      >;

      userModel.create.mockResolvedValue(createdUser);

      const result = await service.createOne(userData);
      expect(result).toEqual(createdUser);
      expect(userModel.create).toHaveBeenCalledWith(userData);
    });

    it('should create a user with minimal required fields', async () => {
      const userData = {
        email: 'minimal@test.com',
        password: 'Password123!',
        firstname: 'Minimal',
        lastname: 'User',
      } as User;
      const createdUser = { ...userData, id: '456' } as unknown as Awaited<
        ReturnType<typeof userModel.create>
      >;

      userModel.create.mockResolvedValue(createdUser);

      const result = await service.createOne(userData);
      expect(result).toEqual(createdUser);
      expect(userModel.create).toHaveBeenCalledWith(userData);
    });
  });

  describe('findUserByResetToken', () => {
    it('should find user with valid reset token', async () => {
      const resetToken = 'VALID_TOKEN';
      const user = {
        email: 'test@test.com',
        passwordResetCode: resetToken,
        passwordResetCodeExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      } as Awaited<ReturnType<typeof userModel.findOne>>;

      userModel.findOne.mockResolvedValue(user);

      const result = await service.findUserByResetToken(resetToken);
      expect(result).toEqual(user);
      expect(userModel.findOne).toHaveBeenCalledWith({
        passwordResetCode: resetToken,
        passwordResetCodeExpiresAt: { $gt: expect.any(Date) },
      });
    });

    it('should return null for expired reset token', async () => {
      const resetToken = 'EXPIRED_TOKEN';

      userModel.findOne.mockResolvedValue(null);

      const result = await service.findUserByResetToken(resetToken);
      expect(result).toBeNull();
      expect(userModel.findOne).toHaveBeenCalledWith({
        passwordResetCode: resetToken,
        passwordResetCodeExpiresAt: { $gt: expect.any(Date) },
      });
    });

    it('should return null for non-existent reset token', async () => {
      const resetToken = 'NON_EXISTENT_TOKEN';

      userModel.findOne.mockResolvedValue(null);

      const result = await service.findUserByResetToken(resetToken);
      expect(result).toBeNull();
      expect(userModel.findOne).toHaveBeenCalledWith({
        passwordResetCode: resetToken,
        passwordResetCodeExpiresAt: { $gt: expect.any(Date) },
      });
    });

    it('should check expiration date is in the future', async () => {
      const resetToken = 'TOKEN_WITH_FUTURE_EXPIRY';
      const futureDate = new Date(Date.now() + 7200000); // 2 hours from now
      const user = {
        email: 'test@test.com',
        passwordResetCode: resetToken,
        passwordResetCodeExpiresAt: futureDate,
      } as Awaited<ReturnType<typeof userModel.findOne>>;

      userModel.findOne.mockResolvedValue(user);

      const result = await service.findUserByResetToken(resetToken);
      expect(result).toEqual(user);
      const callArgs = userModel.findOne.mock.calls[0][0] as unknown as {
        passwordResetCode: string;
        passwordResetCodeExpiresAt: { $gt: Date };
      };
      expect(callArgs.passwordResetCodeExpiresAt.$gt).toBeInstanceOf(Date);
      expect(callArgs.passwordResetCodeExpiresAt.$gt.getTime()).toBeLessThan(
        futureDate.getTime(),
      );
    });
  });
});
