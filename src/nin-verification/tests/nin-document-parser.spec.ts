import {
  extractDobFromSlipText,
  extractFirstNameFromSlipText,
  extractLastNameFromSlipText,
  extractNinFromSlipText,
  extractedNinMatchesUserProfile,
  parseDobFlexible,
  parseNinSlipText,
} from '../nin-document-parser';

/** Synthetic OCR similar to a NIMC digital slip (image PDF). */
const OCR_LIKE_SLIP = `
FEDERAL REPUBLIC OF NIGERIA
DIGITAL NIN SLIP
SURNAME/NOM 5 ws Tr
: MENYAGA Ni Le
Bl GIVEN NAMES/PRENOMS [=] LR ly |
"ISRAEL, ENYO o
REX DATE OF BIRTH SEX/SEXE
 COCRASDEX 10 AUG 2004 maLe
\\ National Identification Number (NIN) A >
9725 188 1954
`;

describe('nin-document-parser', () => {
  describe('parseDobFlexible', () => {
    it('parses DD MMM YYYY', () => {
      const d = parseDobFlexible('10 AUG 2004');
      expect(d).toBeTruthy();
      expect(d!.toISOString().slice(0, 10)).toBe('2004-08-10');
    });

    it('parses ISO date', () => {
      const d = parseDobFlexible('2004-08-10');
      expect(d).toBeTruthy();
      expect(d!.toISOString().slice(0, 10)).toBe('2004-08-10');
    });

    it('parses DD/MM/YYYY', () => {
      const d = parseDobFlexible('10/08/2004');
      expect(d).toBeTruthy();
      expect(d!.toISOString().slice(0, 10)).toBe('2004-08-10');
    });
  });

  describe('OCR-like NIN slip', () => {
    it('extracts spaced NIN after noisy label', () => {
      expect(extractNinFromSlipText(OCR_LIKE_SLIP)).toBe('97251881954');
    });

    it('extracts surname across SURNAME/NOM and colon line', () => {
      const last = extractLastNameFromSlipText(OCR_LIKE_SLIP);
      expect(last).toBeTruthy();
      expect(last!.toLowerCase()).toContain('menyaga');
    });

    it('extracts given names with comma', () => {
      const first = extractFirstNameFromSlipText(OCR_LIKE_SLIP);
      expect(first).toBeTruthy();
      expect(first!.toLowerCase()).toContain('israel');
      expect(first!.toLowerCase()).toContain('enyo');
    });

    it('extracts DOB with month name', () => {
      const dob = extractDobFromSlipText(OCR_LIKE_SLIP);
      expect(dob).toBeTruthy();
      expect(dob!.toISOString().slice(0, 10)).toBe('2004-08-10');
    });

    it('parses full slip', () => {
      const r = parseNinSlipText(OCR_LIKE_SLIP);
      expect(r).toEqual({
        nin: '97251881954',
        firstName: expect.stringMatching(/israel/i),
        lastName: expect.stringMatching(/menyaga/i),
        dateOfBirth: expect.any(Date),
      });
      expect(r!.dateOfBirth.toISOString().slice(0, 10)).toBe('2004-08-10');
    });

    it('matches user profile with ISO DOB and flexible names', () => {
      const extracted = parseNinSlipText(OCR_LIKE_SLIP)!;
      expect(
        extractedNinMatchesUserProfile(extracted, {
          firstname: 'Israel',
          lastname: 'Menyaga',
          dateOfBirth: '2004-08-10T00:00:00.000Z',
        }),
      ).toBe(true);
    });

    it('matches when profile first name is single token of compound slip', () => {
      const extracted = parseNinSlipText(OCR_LIKE_SLIP)!;
      expect(
        extractedNinMatchesUserProfile(extracted, {
          firstname: 'Israel',
          lastname: 'Menyaga',
          dateOfBirth: new Date(Date.UTC(2004, 7, 10)),
        }),
      ).toBe(true);
    });
  });

  describe('NIN 4-3-4 without label nearby', () => {
    it('extracts spaced format', () => {
      const t = 'Some header\n1234 567 8901\nfooter';
      expect(extractNinFromSlipText(t)).toBe('12345678901');
    });
  });
});
