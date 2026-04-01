import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Response } from 'src/shared/response';

import {
  RequestPasswordResetDto,
  ResetPasswordWithTokenDto,
} from '../dtos/authentication.dto';
import { AuthenticationService } from '../services/authentication.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthenticationService) {}

  @HttpCode(HttpStatus.OK)
  @Post('request-password-reset')
  async requestPasswordReset(@Body() payload: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(payload.email);
    return Response.json(
      'If an account exists for this email, you will receive password reset instructions.',
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPasswordWithToken(@Body() payload: ResetPasswordWithTokenDto) {
    const res = await this.authService.resetPasswordWithToken(payload);
    return Response.json('password reset successful', res);
  }
}
