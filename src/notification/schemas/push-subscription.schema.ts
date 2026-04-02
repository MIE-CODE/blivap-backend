import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { BaseSchema, Schema } from 'src/database/schemas';
import { PushSubscriptionKind } from 'src/shared/domain/enums';

export type PushSubscriptionDocument = PushSubscription & Document;

@Schema({
  toJSON: {
    virtuals: true,
    transform(_doc, ret): void {
      delete ret._id;
      delete ret['__v'];
    },
  },
})
export class PushSubscription extends BaseSchema {
  @Prop({ required: true, ref: 'users' })
  userId: string;

  @Prop({ enum: PushSubscriptionKind, required: true })
  kind: PushSubscriptionKind;

  /** FCM device token when kind === fcm */
  @Prop({ default: null })
  fcmToken?: string | null;

  /** Web Push endpoint when kind === web */
  @Prop({ default: null })
  endpoint?: string | null;

  @Prop({ default: null })
  p256dh?: string | null;

  @Prop({ default: null })
  auth?: string | null;

  @Prop({ default: null })
  userAgent?: string | null;
}

export const PushSubscriptionSchema =
  SchemaFactory.createForClass(PushSubscription);

PushSubscriptionSchema.index(
  { userId: 1, kind: 1, endpoint: 1 },
  { unique: true, partialFilterExpression: { endpoint: { $type: 'string' } } },
);
PushSubscriptionSchema.index(
  { userId: 1, kind: 1, fcmToken: 1 },
  { unique: true, partialFilterExpression: { fcmToken: { $type: 'string' } } },
);
