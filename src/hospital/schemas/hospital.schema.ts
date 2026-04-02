import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { BaseSchema, Schema } from 'src/database/schemas';
import { GeoPoint, GeoPointSchema } from 'src/database/schemas/geo.schema';

export type HospitalDocument = Hospital & Document;

@Schema({
  toJSON: {
    virtuals: true,
    transform(_doc, ret): void {
      delete ret._id;
      delete ret['__v'];
    },
  },
})
export class Hospital extends BaseSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  addressLine: string;

  @Prop({ default: '' })
  city: string;

  @Prop({ default: '' })
  state: string;

  @Prop({ type: GeoPointSchema, required: true })
  location: GeoPoint;
}

export const HospitalSchema = SchemaFactory.createForClass(Hospital);

HospitalSchema.index({ location: '2dsphere' });
HospitalSchema.index({ name: 'text', city: 'text' });
