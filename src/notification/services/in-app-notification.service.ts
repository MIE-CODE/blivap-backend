import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'src/database/schemas';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { NotificationEventType } from 'src/shared/domain/enums';

import {
  InAppNotification,
  InAppNotificationDocument,
} from '../schemas/in-app-notification.schema';

@Injectable()
export class InAppNotificationService {
  constructor(
    @InjectModel(DB_TABLE_NAMES.notifications)
    private readonly notifications: Model<InAppNotificationDocument>,
  ) {}

  async create(
    userId: string,
    type: NotificationEventType,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ): Promise<InAppNotification> {
    return this.notifications.create({
      userId,
      type,
      title,
      body,
      data,
    });
  }

  async listForUser(userId: string, skip = 0, limit = 30) {
    return this.notifications
      .find({ userId, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async markRead(userId: string, id: string) {
    await this.notifications.updateOne(
      { _id: id, userId },
      { $set: { readAt: new Date() } },
    );
  }
}
