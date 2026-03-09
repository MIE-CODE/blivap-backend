import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { UserService } from 'src/user/services/user.service';

import { AvatarService } from '../services/avatar.service';

const mockResourcesByAssetFolder = jest.fn();
const mockUrl = jest.fn();

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    api: {
      resources_by_asset_folder: (...args: unknown[]) =>
        mockResourcesByAssetFolder(...args),
    },
    url: (...args: unknown[]) => mockUrl(...args),
  },
}));

describe('AvatarService', () => {
  let service: AvatarService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockUserService = {
    updateOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, unknown> = {
        'cloudinary.cloudName': 'test-cloud',
        'cloudinary.apiKey': 'test-key',
        'cloudinary.apiSecret': 'test-secret',
        'cloudinary.avatarFolder': 'avatars',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvatarService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<AvatarService>(AvatarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvatars', () => {
    it('should return list of avatars from Cloudinary', async () => {
      const cloudinaryResources = [
        {
          public_id: 'avatar1',
          secure_url:
            'https://res.cloudinary.com/test-cloud/image/upload/v1/avatar1.jpg',
        },
        {
          public_id: 'avatar2',
          secure_url:
            'https://res.cloudinary.com/test-cloud/image/upload/v1/avatar2.png',
        },
      ];
      mockResourcesByAssetFolder.mockResolvedValue({
        resources: cloudinaryResources,
      });

      const result = await service.getAvatars();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'avatar1',
        publicId: 'avatar1',
        url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/avatar1.jpg',
      });
      expect(result[1]).toEqual({
        id: 'avatar2',
        publicId: 'avatar2',
        url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/avatar2.png',
      });
      expect(mockResourcesByAssetFolder).toHaveBeenCalledWith('avatars', {
        max_results: 100,
      });
    });

    it('should return empty array when cloud name is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const module = await Test.createTestingModule({
        providers: [
          AvatarService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: UserService, useValue: mockUserService },
        ],
      }).compile();
      const svc = module.get<AvatarService>(AvatarService);

      const result = await svc.getAvatars();

      expect(result).toEqual([]);
      expect(mockResourcesByAssetFolder).not.toHaveBeenCalled();
    });

    it('should return empty array when Cloudinary returns no resources', async () => {
      mockResourcesByAssetFolder.mockResolvedValue({ resources: [] });

      const result = await service.getAvatars();

      expect(result).toEqual([]);
    });

    it('should use custom avatar folder from config', async () => {
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'cloudinary.avatarFolder' ? 'custom-avatars' : 'test-cloud',
      );
      mockResourcesByAssetFolder.mockResolvedValue({ resources: [] });

      const module = await Test.createTestingModule({
        providers: [
          AvatarService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: UserService, useValue: mockUserService },
        ],
      }).compile();
      const svc = module.get<AvatarService>(AvatarService);

      await svc.getAvatars();

      expect(mockResourcesByAssetFolder).toHaveBeenCalledWith(
        'custom-avatars',
        expect.objectContaining({ max_results: 100 }),
      );
    });
  });

  describe('getAvatarUrl', () => {
    it('should return hosted URL for given public id', async () => {
      const expectedUrl =
        'https://res.cloudinary.com/test-cloud/image/upload/avatars/avatar1';
      mockUrl.mockReturnValue(expectedUrl);

      const result = await service.getAvatarUrl('avatars/avatar1');

      expect(result).toBe(expectedUrl);
      expect(mockUrl).toHaveBeenCalledWith('avatars/avatar1', {
        secure: true,
      });
    });

    it('should return null when cloud name is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const module = await Test.createTestingModule({
        providers: [
          AvatarService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: UserService, useValue: mockUserService },
        ],
      }).compile();
      const svc = module.get<AvatarService>(AvatarService);

      const result = await svc.getAvatarUrl('avatars/avatar1');

      expect(result).toBeNull();
      expect(mockUrl).not.toHaveBeenCalled();
    });
  });

  describe('updateAvatar', () => {
    it('should update the user profile image', async () => {
      mockUserService.updateOne.mockResolvedValue(undefined);
      mockUserService.find.mockResolvedValue([
        { profileImage: 'https://example.com/avatar.png' },
      ]);

      const result = await service.updateAvatar(
        { email: 'test@test.com' },
        'https://example.com/avatar.png',
      );

      expect(mockUserService.updateOne).toHaveBeenCalledWith(
        { email: 'test@test.com' },
        { profileImage: 'https://example.com/avatar.png' },
      );
      expect(mockUserService.find).toHaveBeenCalledWith(
        { email: 'test@test.com' },
        ['profileImage'],
      );
      expect(result).toEqual({
        profileImage: 'https://example.com/avatar.png',
      });
    });

    it('should throw when the user cannot be found after update', async () => {
      mockUserService.updateOne.mockResolvedValue(undefined);
      mockUserService.find.mockResolvedValue([]);

      await expect(
        service.updateAvatar(
          { email: 'missing@test.com' },
          'https://example.com/avatar.png',
        ),
      ).rejects.toThrow('user not found');
    });
  });
});
