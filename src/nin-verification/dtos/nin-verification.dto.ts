import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger-only shape for multipart uploads. The client sends field name `file`
 * (application/pdf) with the NIN document.
 */
export class NinVerificationUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description:
      'PDF of Nigerian National Identification Number (NIN) document',
  })
  file: Express.Multer.File;
}
