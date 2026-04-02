import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';

import { GeoPoint } from 'src/database/schemas/geo.schema';
import { BloodType, DonorGender } from 'src/shared/domain/enums';

export class GeoPointDto implements GeoPoint {
  @IsIn(['Point'])
  type: 'Point';

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates: [number, number];
}

export class RegisterDonorDto {
  @IsEnum(BloodType)
  bloodType: BloodType;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointDto)
  location?: GeoPointDto;
}

export class SubmitQuestionnaireDto {
  @IsEnum(DonorGender)
  gender: DonorGender;

  @IsBoolean()
  age18to64: boolean;

  @IsBoolean()
  weightUnder50kg: boolean;

  @IsBoolean()
  organOrTissueTransplant: boolean;

  @IsBoolean()
  injectedDrugsOrDoping: boolean;

  @IsBoolean()
  diabetes: boolean;

  @IsBoolean()
  bloodProductsOrTransfusion: boolean;

  @IsBoolean()
  chronicOrSeriousCondition: boolean;

  @IsBoolean()
  hepatitisBVaccineLast2Weeks: boolean;
}
