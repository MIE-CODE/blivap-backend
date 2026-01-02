import { Prop, SchemaFactory } from '@nestjs/mongoose';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Matches,
  IsUrl,
  IsPhoneNumber,
  IsDate,
} from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { BaseSchema, Schema } from 'src/database/schemas';

export type UserDocument = User & Document;

@Schema({
  toJSON: {
    virtuals: true,
    transform(_doc, ret): void {
      delete ret._id;
      delete ret['__v'];
      delete ret['password'];
      delete ret['emailVerifiedAt'];
      delete ret['emailValidationToken'];
      delete ret['passwordResetCode'];
      delete ret['passwordResetCodeExpiresAt'];
      delete ret['nationalIdentificationNumberVerificationResponses'];
      delete ret['nationalIdentificationNumberVerificationAttempts'];
    },
  },
})
export class User extends BaseSchema {
  @IsString()
  @IsNotEmpty()
  @Prop({ required: true })
  firstname: string;

  @IsString()
  @IsNotEmpty()
  @Prop({ required: true })
  lastname: string;

  @IsPhoneNumber()
  @IsOptional()
  @Prop({ default: null })
  phonenumber?: string;

  @IsEmail()
  @IsNotEmpty()
  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W)[A-Za-z\d\W]{8,}$/, {
    message:
      'Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character.',
  })
  @Prop({ required: true })
  password: string;

  @Prop({ default: null })
  emailValidationToken?: string;

  @Prop({ default: false })
  emailVerified?: boolean;

  @Prop({ default: null })
  emailVerifiedAt?: Date;

  @Prop({ default: null })
  passwordResetCode?: string;

  @Prop({ default: null })
  passwordResetCodeExpiresAt?: Date;

  @IsUrl()
  @IsOptional()
  @Prop({ default: null })
  profileImage?: string;

  @Prop({ default: null })
  lastActive?: Date;

  @Prop({ default: true })
  hasAcceptedTermsAndConditions?: boolean;

  @IsString()
  @IsOptional()
  @Prop({ default: null })
  nationalIdentificationNumber?: string;

  @Prop({ default: false })
  nationalIdentificationNumberVerified?: boolean;

  @Prop({ type: [SchemaTypes.Mixed] })
  nationalIdentificationNumberVerificationResponses?: unknown[];

  @Prop({ default: 0 })
  nationalIdentificationNumberVerificationAttempts?: number;

  @IsDate()
  @IsOptional()
  @Prop({ default: null })
  dateOfBirth?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
