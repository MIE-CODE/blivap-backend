import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { AvatarService } from '../services/avatar.service';

const mockResources = jest.fn();
const mockUrl = jest.fn();

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    api: {
      resources: (...args: unknown[]) => mockResources(...args),
    },
    url: (...args: unknown[]) => mockUrl(...args),
  },
}));

describe('AvatarService', () => {
  let service: AvatarService;

  const mockConfigService = {
    get: jest.fn(),
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
          public_id: 'avatars/avatar1',
          secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/avatars/avatar1.jpg',
        },
        {
          public_id: 'avatars/avatar2',
          secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/avatars/avatar2.png',
        },
      ];
      mockResources.mockResolvedValue({ resources: cloudinaryResources });

      const result = await service.getAvatars();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'avatar1',
        publicId: 'avatars/avatar1',
        url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/avatars/avatar1.jpg',
      });
      expect(result[1]).toEqual({
        id: 'avatar2',
        publicId: 'avatars/avatar2',
        url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/avatars/avatar2.png',
      });
      expect(mockResources).toHaveBeenCalledWith({
        type: 'upload',
        prefix: 'avatars',
        max_results: 100,
        resource_type: 'image',
      });
    });

    it('should return empty array when cloud name is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const module = await Test.createTestingModule({
        providers: [
          AvatarService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const svc = module.get<AvatarService>(AvatarService);

      const result = await svc.getAvatars();

      expect(result).toEqual([]);
      expect(mockResources).not.toHaveBeenCalled();
    });

    it('should return empty array when Cloudinary returns no resources', async () => {
      mockResources.mockResolvedValue({ resources: [] });

      const result = await service.getAvatars();

      expect(result).toEqual([]);
    });

    it('should use custom avatar folder from config', async () => {
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'cloudinary.avatarFolder' ? 'custom-avatars' : 'test-cloud',
      );
      mockResources.mockResolvedValue({ resources: [] });

      const module = await Test.createTestingModule({
        providers: [
          AvatarService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const svc = module.get<AvatarService>(AvatarService);

      await svc.getAvatars();

      expect(mockResources).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: 'custom-avatars' }),
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
        ],
      }).compile();
      const svc = module.get<AvatarService>(AvatarService);

      const result = await svc.getAvatarUrl('avatars/avatar1');

      expect(result).toBeNull();
      expect(mockUrl).not.toHaveBeenCalled();
    });
  });
});
