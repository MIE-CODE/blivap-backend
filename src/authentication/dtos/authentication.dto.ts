import { PickType, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, Matches } from 'class-validator';

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

export class RequestPasswordResetDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDTO extends PickType(User, ['password']) {
  @IsString()
  @IsNotEmpty()
  resetToken: string;
}

export class ResetPasswordWithTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W)[A-Za-z\d\W]{8,}$/, {
    message:
      'Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character.',
  })
  newPassword: string;
}

export class EditProfileDTO extends PartialType(
  PickType(User, ['firstname', 'lastname', 'phonenumber', 'profileImage']),
) {}

export class ChangePasswordDTO extends PickType(User, ['password']) {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;
}
