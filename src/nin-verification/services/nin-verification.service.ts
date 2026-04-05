import { promises as fs } from 'fs';

import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PDFParse } from 'pdf-parse';
import * as tesseract from 'tesseract.js';

import config from 'src/shared/config';
import {
  deriveKeyFromSecret,
  encryptNin,
  hmacNinHash,
} from 'src/shared/crypto/identity-crypto';
import { Response, ResponseObject } from 'src/shared/response';
import { User } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';

import {
  extractedNinMatchesUserProfile,
  parseNinSlipText,
} from '../nin-document-parser';

export type NinVerificationSuccess = {
  nationalIdentificationNumberLast4: string;
  nationalIdentificationNumberVerified: boolean;
};

@Injectable()
export class NinVerificationService {
  private readonly logger = new Logger(NinVerificationService.name);

  constructor(
    private readonly userService: UserService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * End-to-end: read temp file, extract & parse NIN data, match user, update DB.
   */
  async verifyUploadedPdf(
    user: User,
    filePath: string,
  ): Promise<ResponseObject<NinVerificationSuccess>> {
    try {
      let buffer: Buffer;

      try {
        buffer = await fs.readFile(filePath);
      } catch (e) {
        this.logger.error('Failed to read uploaded NIN PDF', e);
        throw new InternalServerErrorException(
          'Unable to extract text from PDF',
        );
      }

      const text = await this.extractDocumentText(buffer);
      const extracted = parseNinSlipText(text);

      if (!extracted) {
        throw new UnprocessableEntityException(
          'Required fields not found in NIN document',
        );
      }

      if (!user.dateOfBirth) {
        throw new UnprocessableEntityException(
          'User profile must include date of birth to verify NIN',
        );
      }

      if (!extractedNinMatchesUserProfile(extracted, user)) {
        this.events.emit('verification.rejected', {
          userId: user.id,
          reason: 'profile_mismatch',
        });
        throw new UnprocessableEntityException(
          'Verification failed: Extracted NIN information does not match user data',
        );
      }

      const cfg = config();
      const hash = hmacNinHash(extracted.nin, cfg.identity.ninHmacSecret);
      const [holder] = await this.userService.find({
        nationalIdentificationNumberHash: hash,
      });
      if (holder && holder.id !== user.id) {
        this.events.emit('verification.rejected', {
          userId: user.id,
          reason: 'duplicate_identity',
        });
        throw new ConflictException(
          'This national identification number is already registered',
        );
      }

      const key = deriveKeyFromSecret(cfg.identity.ninEncryptionSecret);
      const enc = encryptNin(extracted.nin, key);

      await this.userService.updateOne(
        { _id: user.id },
        {
          nationalIdentificationNumberHash: hash,
          nationalIdentificationNumberEnc: enc,
          nationalIdentificationNumberVerified: true,
        },
        { nationalIdentificationNumber: true },
      );

      this.events.emit('verification.approved', { userId: user.id });

      return Response.json('NIN verified successfully', {
        nationalIdentificationNumberLast4: extracted.nin.slice(-4),
        nationalIdentificationNumberVerified: true,
      });
    } finally {
      // Always remove the temp upload after processing (success or failure).
      await fs.unlink(filePath).catch(() => undefined);
    }
  }

  /**
   * Step 1–2: Load PDF, pull text with pdf-parse; if fields are missing or text is thin,
   * render page 1 and run Tesseract.js OCR, then merge text for parsing.
   */
  private async extractDocumentText(buffer: Buffer): Promise<string> {
    let parser: PDFParse | undefined;

    try {
      parser = new PDFParse({ data: new Uint8Array(buffer) });

      // Primary path: embedded / selectable text in the PDF.
      const textResult = await parser.getText();
      let text = (textResult.text ?? '').trim();

      const extractedFromText = parseNinSlipText(text);

      if (extractedFromText) {
        return text;
      }

      // Secondary path: scanned PDFs or layouts our regex did not match — OCR page 1 with Tesseract.js.
      const screenshot = await parser.getScreenshot({
        partial: [1],
        scale: 2,
        imageBuffer: true,
        imageDataUrl: false,
      });

      const pageData = screenshot.pages[0]?.data;
      if (pageData?.length) {
        const { data } = await tesseract.recognize(
          Buffer.from(pageData),
          'eng',
          {
            logger: () => undefined,
          },
        );
        text = `${text}\n${data.text ?? ''}`.trim();
      }

      return text;
    } catch (e) {
      this.logger.error('PDF text extraction or OCR failed', e);
      throw new InternalServerErrorException('Unable to extract text from PDF');
    } finally {
      if (parser) {
        await parser.destroy().catch(() => undefined);
      }
    }
  }
}
