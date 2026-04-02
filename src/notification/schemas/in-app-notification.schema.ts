import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { BaseSchema, Schema } from 'src/database/schemas';
import { NotificationEventType } from 'src/shared/domain/enums';

export type InAppNotificationDocument = InAppNotification & Document;

@Schema({
  toJSON: {
    virtuals: true,
    transform(_doc, ret): void {
      delete ret._id;
      delete ret['__v'];
    },
  },
})
export class InAppNotification extends BaseSchema {
  @Prop({ required: true, ref: 'users' })
  userId: string;

  @Prop({ enum: NotificationEventType, required: true })
  type: NotificationEventType;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  body: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, unknown>;

  @Prop({ default: null })
  readAt?: Date | null;
}

export const InAppNotificationSchema =
  SchemaFactory.createForClass(InAppNotification);

InAppNotificationSchema.index({ userId: 1, createdAt: -1 });
InAppNotificationSchema.index({ userId: 1, readAt: 1 });
