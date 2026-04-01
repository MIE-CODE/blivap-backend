import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { JwtGuard } from 'src/authentication/guards/jwt.guard';
import { CurrentUser } from 'src/shared/current-user.decorator';
import { User } from 'src/user/schemas/user.schema';

import { NinVerificationUploadDto } from '../dtos/nin-verification.dto';
import { NinVerificationService } from '../services/nin-verification.service';

@ApiTags('NIN Verification')
@UseGuards(JwtGuard)
@Controller('nin-verification')
export class NinVerificationController {
  constructor(
    private readonly ninVerificationService: NinVerificationService,
  ) {}

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload a PDF of your Nigerian NIN document',
    type: NinVerificationUploadDto,
  })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async verify(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    return this.ninVerificationService.verifyUploadedPdf(user, file.path);
  }
}
