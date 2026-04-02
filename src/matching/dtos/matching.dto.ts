import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

import { BloodType } from 'src/shared/domain/enums';

export class DonorSearchQueryDto {
  @IsEnum(BloodType)
  neededBloodType: BloodType;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @Type(() => Number)
  @IsNumber()
  lat: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
