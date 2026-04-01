import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BadRequestException, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { UserModule } from 'src/user/user.module';

import { NinVerificationController } from './controllers/nin-verification.controller';
import { NinVerificationService } from './services/nin-verification.service';

const NIN_UPLOAD_SUBDIR = 'nin-verify';

@Module({
  imports: [
    UserModule,
    MulterModule.register({
      limits: { fileSize: 5 * 1024 * 1024 },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join(os.tmpdir(), NIN_UPLOAD_SUBDIR);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, _file, cb) => {
          cb(null, `nin-${randomUUID()}.pdf`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const isPdfMime = file.mimetype === 'application/pdf';
        const isPdfName = file.originalname?.toLowerCase().endsWith('.pdf');
        if (!isPdfMime && !isPdfName) {
          return cb(
            new BadRequestException(
              'Only PDF files are allowed',
            ) as unknown as Error,
            false,
          );
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [NinVerificationController],
  providers: [NinVerificationService],
})
export class NinVerificationModule {}
