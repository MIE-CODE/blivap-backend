import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { GeoPointDto } from 'src/donor/dtos/donor.dto';
import { BloodType } from 'src/shared/domain/enums';

export class CreateBloodRequestDto {
  @IsEnum(BloodType)
  neededBloodType: BloodType;

  @ValidateNested()
  @Type(() => GeoPointDto)
  location: GeoPointDto;

  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
