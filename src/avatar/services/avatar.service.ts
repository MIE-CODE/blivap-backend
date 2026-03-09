import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export type AvatarItem = {
  id: string;
  url: string;
  publicId: string;
};

@Injectable()
export class AvatarService {
  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async getAvatars(): Promise<AvatarItem[]> {
    const folder =
      this.configService.get<string>('cloudinary.avatarFolder') ??
      'blivap-avatars';
    const cloudName = this.configService.get<string>('cloudinary.cloudName');

    if (!cloudName) {
      return [];
    }

    try {
      const result = await cloudinary.api.resources_by_asset_folder(folder, {
        max_results: 100,
      });

      const resources = result.resources ?? [];

      return resources.map((r) => ({
        id: r.public_id.split('/').pop(),
        publicId: r.public_id,
        url: r.secure_url,
      }));
    } catch (error) {
      console.error('Cloudinary avatar fetch failed:', error);
      return [];
    }
  }

  async getAvatarUrl(publicId: string): Promise<string | null> {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    if (!cloudName) {
      return null;
    }
    return cloudinary.url(publicId, { secure: true });
  }
}
