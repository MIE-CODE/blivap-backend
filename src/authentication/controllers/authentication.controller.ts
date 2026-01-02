import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/shared/current-user.decorator';
import { Response } from 'src/shared/response';
import { User } from 'src/user/schemas/user.schema';

import {
  SignupDTO,
  VerifyEmailDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  EditProfileDTO,
  ChangePasswordDTO,
} from '../dtos/authentication.dto';
import { JwtGuard } from '../guards/jwt.guard';
import { AuthenticationService } from '../services/authentication.service';

@ApiTags('Authentication')
@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @Post('/login')
  async login(@CurrentUser() user: User) {
    const res = await this.authService.getLoggedInUser(user);
    return Response.json('login successful', res);
  }

  @Post('/signup')
  async signup(@Body() payload: SignupDTO) {
    const res = await this.authService.signup(payload);
    return Response.json('signup successful', res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/verify-email')
  async verifyEmail(@Body() payload: VerifyEmailDTO) {
    await this.authService.veirfyEmail(payload);
    return Response.json('verification successful');
  }

  @HttpCode(HttpStatus.OK)
  @Post('/resend-email-verification-link')
  async resendEmailVerificationLink(@Query('email') email: string) {
    this.authService.resendEmailVerification(email);
    return Response.json('verification link resent');
  }

  @HttpCode(HttpStatus.OK)
  @Post('/forgot-password')
  async forgotPassword(@Body() payload: ForgotPasswordDTO) {
    this.authService.forgotPassword(payload);
    return Response.json('success');
  }

  @HttpCode(HttpStatus.OK)
  @Post('/reset-password')
  async resetPassword(@Body() payload: ResetPasswordDTO) {
    const res = await this.authService.resetPassword(payload);
    return Response.json('password reset successful', res);
  }

  @Get('/me')
  @UseGuards(JwtGuard)
  async me(@CurrentUser() user: User) {
    const me = await this.authService.me(user);
    return Response.json('me', me);
  }

  @Put('/me')
  @UseGuards(JwtGuard)
  async editProfile(
    @CurrentUser() user: User,
    @Body() payload: EditProfileDTO,
  ) {
    const updatedUser = await this.authService.editProfile(user, payload);
    return Response.json('profile update successful', updatedUser);
  }

  @Put('/change-password')
  @UseGuards(JwtGuard)
  async changePassword(
    @CurrentUser() user: User,
    @Body() payload: ChangePasswordDTO,
  ) {
    const res = await this.authService.changePassword(user, payload);
    return Response.json('password changed', res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/logout')
  @UseGuards(JwtGuard)
  async logout(@Headers('authorization') authHeader: string) {
    const token = authHeader.split(' ')[1];
    await this.authService.logOut(token);
    return Response.json('logged out');
  }
}
