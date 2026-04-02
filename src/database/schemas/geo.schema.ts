import { Prop, SchemaFactory } from '@nestjs/mongoose';

import { Schema } from './base.schema';

@Schema()
export class GeoPoint {
  @Prop({ enum: ['Point'], required: true })
  type: 'Point';

  @Prop({ type: [Number], required: true })
  coordinates: [number, number];
}

export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);
