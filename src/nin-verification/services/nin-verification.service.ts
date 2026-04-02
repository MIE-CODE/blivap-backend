import { promises as fs } from 'fs';

import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as moment from 'moment';
import { PDFParse } from 'pdf-parse';
import * as tesseract from 'tesseract.js';

import { Response, ResponseObject } from 'src/shared/response';
import { User } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';

export type NinVerificationSuccess = {
  nationalIdentificationNumber: string;
  nationalIdentificationNumberVerified: boolean;
};

type ExtractedNinData = {
  nin: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
};

@Injectable()
export class NinVerificationService {
  private readonly logger = new Logger(NinVerificationService.name);

  constructor(private readonly userService: UserService) {}

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
      const extracted = this.parseNinFields(text);

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

      if (!this.fieldsMatchUser(extracted, user)) {
        throw new UnprocessableEntityException(
          'Verification failed: Extracted NIN information does not match user data',
        );
      }

      await this.userService.updateOne(
        { _id: user.id },
        {
          nationalIdentificationNumber: extracted.nin,
          nationalIdentificationNumberVerified: true,
        },
      );

      return Response.json('NIN verified successfully', {
        nationalIdentificationNumber: extracted.nin,
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

      const extractedFromText = this.parseNinFields(text);

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

  /**
   * Step 3: Regex-based parsing for NIN (11 digits), names, and DOB.
   */
  private parseNinFields(raw: string): ExtractedNinData | null {
    const text = this.normalizeExtractedText(raw.replace(/\r\n/g, '\n'));

    const nin = this.extractNin(text);
    const firstName = this.extractFirstName(text);
    const lastName = this.extractLastName(text);
    const dateOfBirth = this.extractDob(text);

    if (!nin || !firstName || !lastName || !dateOfBirth) {
      return null;
    }

    return { nin, firstName, lastName, dateOfBirth };
  }

  /** Collapse whitespace and trim so OCR/layout noise is easier to parse. */
  private normalizeExtractedText(raw: string): string {
    return raw.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  private extractNin(text: string): string | null {
    const labeled = text.match(
      /(?:N\.?\s*I\.?\s*N\.?|NIN|National\s+Identification\s+Number)\s*[#:.\s-]*(\d[\d\s]{9,14}\d)/i,
    );
    if (labeled?.[1]) {
      const digits = labeled[1].replace(/\D/g, '');
      if (digits.length === 11) {
        return digits;
      }
    }

    const standalone = text.match(/\b(\d{11})\b/);
    return standalone ? standalone[1] : null;
  }

  private extractLastName(text: string): string | null {
    const patterns = [
      /(?:Surname|Last\s*Name|Family\s*Name)\s*[#:.\s|-]+\s*([^\n\r]+?)(?=\s*(?:First\s*Name|Given\s*Name|Date|$))/i,
      /(?:Surname|Last\s*Name|Family\s*Name)\s*[#:.\s|-]+\s*([^\n\r]+)/i,
    ];

    for (const re of patterns) {
      const raw =
        text.match(re)?.[1]?.trim().replace(/\s+/g, ' ') ?? '';
      if (raw.length) {
        return raw;
      }
    }

    return null;
  }

  /**
   * NIMC slips use "First Name" and separate "Other Name(s)" for middle names.
   * Do not read "Other Names" as the first name.
   */
  private extractFirstName(text: string): string | null {
    const patterns = [
      /(?:First\s*Name|Given\s*Name)\s*[#:.\s|-]+\s*([^\n\r]+?)(?=\s*(?:Other\s*Names?|Middle\s*Name|Surname|Date|$))/i,
      /(?:First\s*Name|Given\s*Name)\s*[#:.\s|-]+\s*([^\n\r]+)/i,
    ];

    for (const re of patterns) {
      const raw =
        text.match(re)?.[1]?.trim().replace(/\s+/g, ' ') ?? '';
      if (raw.length) {
        return raw;
      }
    }

    return null;
  }

  private extractDob(text: string): Date | null {
    const labeled = text.match(
      /(?:Date\s*of\s*Birth|D\.?\s*O\.?\s*B\.?|Birth\s*Date)\s*[#:.\s|-]+\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})/i,
    );

    if (labeled?.[1]) {
      return this.parseDobString(labeled[1]);
    }

    const slash = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
    if (slash) {
      return this.parseDobString(slash[1]);
    }

    const iso = text.match(/\b(\d{4}-\d{1,2}-\d{1,2})\b/);
    return iso ? this.parseDobString(iso[1]) : null;
  }

  private parseDobString(s: string): Date | null {
    if (s.includes('/')) {
      const parts = s.split('/').map((p) => Number(p.trim()));
      if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
        return null;
      }
      const [d, m, y] = parts;
      if (!d || !m || !y) {
        return null;
      }

      return new Date(Date.UTC(y, m - 1, d));
    }

    const parts = s.split('-').map((p) => Number(p.trim()));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
      return null;
    }
    const [y, m, d] = parts;
    if (!d || !m || !y) {
      return null;
    }

    return new Date(Date.UTC(y, m - 1, d));
  }

  private normalizeName(s: string): string {
    return s
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[…\.]+$/u, '')
      .trim();
  }

  /**
   * Same person as profile: exact match, or prefix match when the slip truncates
   * long names or OCR drops trailing characters (min length guards false positives).
   */
  private nameMatchesProfile(fromDoc: string, fromProfile: string): boolean {
    const a = this.normalizeName(fromDoc);
    const b = this.normalizeName(fromProfile);
    if (!a.length || !b.length) {
      return false;
    }
    if (a === b) {
      return true;
    }
    const minLen = Math.min(a.length, b.length);
    if (minLen < 3) {
      return false;
    }
    return a.startsWith(b) || b.startsWith(a);
  }

  /**
   * Step 4: Compare extracted identity with the authenticated user record.
   * If the user already saved an 11-digit NIN, it must match the document.
   */
  private fieldsMatchUser(extracted: ExtractedNinData, user: User): boolean {
    const existingNin = (user.nationalIdentificationNumber ?? '').replace(
      /\D/g,
      '',
    );
    if (existingNin.length === 11 && existingNin !== extracted.nin) {
      return false;
    }

    const firstOk = this.nameMatchesProfile(
      extracted.firstName,
      user.firstname ?? '',
    );
    const lastOk = this.nameMatchesProfile(
      extracted.lastName,
      user.lastname ?? '',
    );
    const dobOk =
      moment(extracted.dateOfBirth).format('YYYY-MM-DD') ===
      moment(user.dateOfBirth).format('YYYY-MM-DD');

    return firstOk && lastOk && dobOk;
  }
}
