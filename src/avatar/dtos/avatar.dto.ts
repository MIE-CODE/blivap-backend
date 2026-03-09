import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class UpdateAvatarDTO {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  profileImage: string;
}
