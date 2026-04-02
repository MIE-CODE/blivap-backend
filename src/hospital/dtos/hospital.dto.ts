import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

import { GeoPointDto } from 'src/donor/dtos/donor.dto';

export class CreateHospitalDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @ValidateNested()
  @Type(() => GeoPointDto)
  location: GeoPointDto;
}
