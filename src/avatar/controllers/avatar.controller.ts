import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { JwtGuard } from 'src/authentication/guards/jwt.guard';
import { Response } from 'src/shared/response';

import { AvatarService } from '../services/avatar.service';

@ApiTags('Avatar')
@UseGuards(JwtGuard)
@Controller('avatar')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Get()
  async list() {
    const avatars = await this.avatarService.getAvatars();
    return Response.json('avatars', avatars);
  }

  @Get(':publicId')
  async getUrl(@Param('publicId') publicId: string) {
    const url = await this.avatarService.getAvatarUrl(publicId);
    if (!url) {
      throw new NotFoundException('avatar not found');
    }
    return Response.json('avatar', { url, publicId });
  }
}
