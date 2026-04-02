import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { BaseSchema, Schema } from 'src/database/schemas';
import { GeoPoint, GeoPointSchema } from 'src/database/schemas/geo.schema';
import { BloodType, BloodRequestStatus } from 'src/shared/domain/enums';

export type BloodRequestDocument = BloodRequest & Document;

@Schema({
  toJSON: {
    virtuals: true,
    transform(_doc, ret): void {
      delete ret._id;
      delete ret['__v'];
    },
  },
})
export class BloodRequest extends BaseSchema {
  @Prop({ required: true, ref: 'users' })
  requesterId: string;

  @Prop({ enum: BloodType, required: true })
  neededBloodType: BloodType;

  @Prop({ type: GeoPointSchema, required: true })
  location: GeoPoint;

  @Prop({ default: false })
  urgent: boolean;

  @Prop({ enum: BloodRequestStatus, default: BloodRequestStatus.Open })
  status: BloodRequestStatus;

  @Prop({ default: null })
  notes?: string;
}

export const BloodRequestSchema = SchemaFactory.createForClass(BloodRequest);

BloodRequestSchema.index({ requesterId: 1, createdAt: -1 });
BloodRequestSchema.index({ location: '2dsphere' });
BloodRequestSchema.index({ status: 1, createdAt: -1 });
