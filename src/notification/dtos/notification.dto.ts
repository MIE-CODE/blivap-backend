import { IsOptional, IsString } from 'class-validator';

export class RegisterFcmDto {
  @IsString()
  fcmToken: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class RegisterWebPushDto {
  @IsString()
  endpoint: string;

  @IsString()
  p256dh: string;

  @IsString()
  auth: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
