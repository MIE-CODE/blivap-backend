import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'src/database/schemas';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { PushSubscriptionKind } from 'src/shared/domain/enums';

import { PushSubscriptionDocument } from '../schemas/push-subscription.schema';

@Injectable()
export class PushSubscriptionService {
  constructor(
    @InjectModel(DB_TABLE_NAMES.pushSubscriptions)
    private readonly subs: Model<PushSubscriptionDocument>,
  ) {}

  async registerFcm(userId: string, fcmToken: string, userAgent?: string) {
    await this.subs.findOneAndUpdate(
      { userId, kind: PushSubscriptionKind.Fcm, fcmToken },
      { userId, kind: PushSubscriptionKind.Fcm, fcmToken, userAgent },
      { upsert: true, new: true },
    );
  }

  async registerWeb(
    userId: string,
    endpoint: string,
    keys: { p256dh: string; auth: string },
    userAgent?: string,
  ) {
    await this.subs.findOneAndUpdate(
      { userId, kind: PushSubscriptionKind.Web, endpoint },
      {
        userId,
        kind: PushSubscriptionKind.Web,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
      { upsert: true, new: true },
    );
  }

  async getFcmTokensForUser(userId: string): Promise<string[]> {
    const docs = await this.subs.find({
      userId,
      kind: PushSubscriptionKind.Fcm,
      fcmToken: { $exists: true, $ne: null },
    });
    return docs.map((d) => d.fcmToken!).filter(Boolean);
  }

  async getWebSubscriptionsForUser(userId: string) {
    const docs = await this.subs.find({
      userId,
      kind: PushSubscriptionKind.Web,
      endpoint: { $exists: true },
    });
    return docs
      .filter((d) => d.endpoint && d.p256dh && d.auth)
      .map((d) => ({
        endpoint: d.endpoint!,
        keys: { p256dh: d.p256dh!, auth: d.auth! },
      }));
  }
}
