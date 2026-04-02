import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { BaseSchema, Schema } from 'src/database/schemas';
import { AuditAction } from 'src/shared/domain/enums';

export type AuditLogDocument = AuditLog & Document;

@Schema({
  toJSON: {
    virtuals: true,
    transform(_doc, ret): void {
      delete ret._id;
      delete ret['__v'];
    },
  },
})
export class AuditLog extends BaseSchema {
  @Prop({ default: null, ref: 'users' })
  actorId?: string | null;

  @Prop({ enum: AuditAction, required: true })
  action: AuditAction;

  @Prop({ required: true })
  resourceType: string;

  @Prop({ default: null })
  resourceId?: string | null;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  @Prop({ default: null })
  ip?: string | null;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
