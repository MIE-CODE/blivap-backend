import {
  IsDateString,
  IsMongoId,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateBookingDto {
  @IsMongoId()
  donorUserId: string;

  @IsMongoId()
  hospitalId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsMongoId()
  bloodRequestId?: string;
}

export class RespondBookingDto {
  @IsBoolean()
  accept: boolean;
}
