import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { JwtGuard } from 'src/authentication/guards/jwt.guard';
import { CurrentUser } from 'src/shared/current-user.decorator';
import { Response } from 'src/shared/response';
import { User } from 'src/user/schemas/user.schema';

import { RegisterFcmDto, RegisterWebPushDto } from '../dtos/notification.dto';
import { InAppNotificationService } from '../services/in-app-notification.service';
import { PushSubscriptionService } from '../services/push-subscription.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly inApp: InAppNotificationService,
    private readonly pushSubs: PushSubscriptionService,
  ) {}

  @Get()
  @UseGuards(JwtGuard)
  async list(
    @CurrentUser() user: User,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    const rows = await this.inApp.listForUser(
      user.id,
      skip ? Number(skip) : 0,
      limit ? Number(limit) : 30,
    );
    return Response.json('OK', rows);
  }

  @Patch(':id/read')
  @UseGuards(JwtGuard)
  async markRead(@CurrentUser() user: User, @Param('id') id: string) {
    await this.inApp.markRead(user.id, id);
    return Response.json('OK', { id });
  }

  @Post('push-subscriptions/fcm')
  @UseGuards(JwtGuard)
  async registerFcm(@CurrentUser() user: User, @Body() body: RegisterFcmDto) {
    await this.pushSubs.registerFcm(user.id, body.fcmToken, body.userAgent);
    return Response.json('Registered', {});
  }

  @Post('push-subscriptions/web')
  @UseGuards(JwtGuard)
  async registerWeb(
    @CurrentUser() user: User,
    @Body() body: RegisterWebPushDto,
  ) {
    await this.pushSubs.registerWeb(
      user.id,
      body.endpoint,
      { p256dh: body.p256dh, auth: body.auth },
      body.userAgent,
    );
    return Response.json('Registered', {});
  }
}
