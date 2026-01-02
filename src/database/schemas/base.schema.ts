import { applyDecorators } from '@nestjs/common';
import { Prop, Schema as S, SchemaOptions } from '@nestjs/mongoose';
import { merge } from 'lodash';
import { Document } from 'mongoose';

export class BaseSchema {
  _id?: string;

  id?: string;

  updatedAt?: Date;

  createdAt?: Date;

  @Prop({ default: false })
  isDeleted?: boolean;

  @Prop()
  deletedAt?: Date;
}

export const Schema = (options?: SchemaOptions) =>
  applyDecorators(
    S(
      merge(
        {
          timestamps: true,
          toJSON: {
            virtuals: true,
            transform: (_doc: unknown, ret: Document): void => {
              delete ret._id;
              delete ret['__v'];
            },
          },
          toObject: {
            virtuals: true,
          },
        },
        options,
      ),
    ),
  );
