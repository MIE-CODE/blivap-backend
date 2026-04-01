import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { BaseSchema, Schema } from 'src/database/schemas';
import { DB_TABLE_NAMES } from 'src/shared/constants';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

@Schema({
  timestamps: true,
  collection: DB_TABLE_NAMES.passwordResetTokens,
  toJSON: {
    virtuals: true,
    transform(_doc, ret): void {
      delete ret._id;
      delete ret['__v'];
    },
  },
})
export class PasswordResetToken extends BaseSchema {
  @Prop({
    type: Types.ObjectId,
    ref: DB_TABLE_NAMES.users,
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);

PasswordResetTokenSchema.index({ userId: 1, used: 1 });
