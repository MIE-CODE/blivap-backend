import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { JwtGuard } from 'src/authentication/guards/jwt.guard';
import { CurrentUser } from 'src/shared/current-user.decorator';
import { Response } from 'src/shared/response';
import { User } from 'src/user/schemas/user.schema';

import { UpdateAvatarDTO } from '../dtos/avatar.dto';
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

  @Post()
  async updateAvatar(
    @CurrentUser() user: User,
    @Body() payload: UpdateAvatarDTO,
  ) {
    const updatedAvatar = await this.avatarService.updateAvatar(
      user,
      payload.profileImage,
    );
    return Response.json('avatar updated', updatedAvatar);
  }
}
