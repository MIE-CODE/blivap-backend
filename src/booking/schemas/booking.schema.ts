import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { BaseSchema, Schema } from 'src/database/schemas';
import { BookingStatus } from 'src/shared/domain/enums';

export type BookingDocument = Booking & Document;

@Schema({
  toJSON: {
    virtuals: true,
    transform(_doc, ret): void {
      delete ret._id;
      delete ret['__v'];
    },
  },
})
export class Booking extends BaseSchema {
  @Prop({ required: true, ref: 'users' })
  requesterId: string;

  @Prop({ required: true, ref: 'users' })
  donorUserId: string;

  @Prop({ required: true, ref: 'hospitals' })
  hospitalId: string;

  @Prop({ default: null, ref: 'bloodRequests' })
  bloodRequestId?: string | null;

  @Prop({ required: true })
  scheduledAt: Date;

  /** Exclusive end for overlap checks */
  @Prop({ required: true })
  slotEndAt: Date;

  @Prop({ enum: BookingStatus, default: BookingStatus.Pending })
  status: BookingStatus;

  @Prop({ default: null })
  respondedAt?: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.index({ requesterId: 1, createdAt: -1 });
BookingSchema.index({ donorUserId: 1, scheduledAt: 1 });
BookingSchema.index({ donorUserId: 1, status: 1, scheduledAt: 1 });
