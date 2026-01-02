import { PickType, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

import { User } from 'src/user/schemas/user.schema';

export class SignupDTO extends User {}

export class VerifyEmailDTO {
  @IsString()
  @IsNotEmpty()
  emailValidationToken: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ForgotPasswordDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDTO extends PickType(User, ['password']) {
  @IsString()
  @IsNotEmpty()
  resetToken: string;
}

export class EditProfileDTO extends PartialType(
  PickType(User, ['firstname', 'lastname', 'phonenumber', 'profileImage']),
) {}

export class ChangePasswordDTO extends PickType(User, ['password']) {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;
}
