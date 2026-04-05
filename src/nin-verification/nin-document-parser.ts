import * as moment from 'moment';

/** Parsed identity fields from a Nigerian NIN slip (PDF text / OCR). */
export type NinSlipExtracted = {
  nin: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
};

export type NinProfileForMatch = {
  firstname?: string | null;
  lastname?: string | null;
  dateOfBirth?: Date | string | null;
  nationalIdentificationNumber?: string | null;
};

/**
 * Collapse whitespace and trim so OCR/layout noise is easier to parse.
 */
export function normalizeSlipText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * NIN: labeled block with junk between label and digits, spaced groups (4-3-4),
 * or 11 contiguous digits.
 */
export function extractNinFromSlipText(text: string): string | null {
  const t = text.replace(/\r\n/g, '\n');
  const labelRe =
    /(?:National\s+Identification\s+Number(?:\s*\([^)]*\))?|\bN\.?\s*I\.?\s*N\.?\b)/gi;
  let m: RegExpExecArray | null;
  while ((m = labelRe.exec(t)) !== null) {
    const start = m.index + m[0].length;
    const window = t.slice(start, start + 360);
    const nin = elevenDigitsFromWindow(window);
    if (nin) {
      return nin;
    }
  }

  const spaced = t.match(/\b(\d{4})\s+(\d{3})\s+(\d{4})\b/);
  if (spaced) {
    const cand = `${spaced[1]}${spaced[2]}${spaced[3]}`;
    if (cand.length === 11) {
      return cand;
    }
  }

  const contiguous = t.match(/\b(\d{11})\b/);
  return contiguous ? contiguous[1] : null;
}

/** Pull 11-digit NIN from a short window after the label (handles spaces/OCR noise). */
function elevenDigitsFromWindow(window: string): string | null {
  const d = window.replace(/\D/g, '');
  if (d.length === 11) {
    return d;
  }
  if (d.length < 11) {
    return null;
  }
  // Prefer trailing 11 digits (slip order: other numbers often appear before NIM block).
  return d.slice(-11);
}

/**
 * Surname line: allow SURNAME/NOM (slash), OCR noise, and ":" value line (NIMC layout).
 */
export function extractLastNameFromSlipText(text: string): string | null {
  const patterns: RegExp[] = [
    // NIMC: "SURNAME/NOM" … noise … newline … ": MENYAGA …"
    /(?:Surname|Last\s*Name|Family\s*Name)(?:\/[A-Za-z]+)?\s*[\s\S]{0,200}?:\s*([A-Za-z][A-Za-z\s,'.-]{1,80}?)(?=\s*(?:\n|First|Given|GIVEN|Other|DATE|Date|NIN|National|\(|$))/i,
    /(?:Surname|Last\s*Name|Family\s*Name)(?:\/[A-Za-z]+)?\s*[\s\S]{0,120}?\n?\s*:?\s*([A-Za-z][A-Za-z\s,'.-]{1,80}?)(?=\s*(?:\n|First|Given|GIVEN|Other|DATE|Date|NIN|National|\(|$))/i,
    /(?:Surname|Last\s*Name|Family\s*Name)\s*[#:.\s/|-]+\s*([^\n\r]+?)(?=\s*(?:First\s*Name|Given|GIVEN|Date|DATE|$))/im,
    /(?:Surname|Last\s*Name|Family\s*Name)\s*[#:.\s/|-]+\s*([^\n\r]+)/im,
  ];

  for (const re of patterns) {
    const raw = text.match(re)?.[1]?.trim().replace(/\s+/g, ' ') ?? '';
    const cleaned = sanitizeExtractedNameLine(raw);
    if (cleaned.length) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Given / first name: NIMC "GIVEN NAMES/PRENOMS", "Given Name", "First Name".
 */
export function extractFirstNameFromSlipText(text: string): string | null {
  const patterns: RegExp[] = [
    // Prefer explicit ":" value after header (some slips).
    /(?:First\s*Name|Given\s*Names?|PRENOMS?)(?:\/[A-Za-z]+)?\s*[\s\S]{0,200}?:\s*([("']?[A-Za-z][A-Za-z\s,.'-]{1,80}?)(?=\s*(?:\n|Other\s*Names?|Middle|Surname|SURNAME|DATE|Date|NIN|National|\(|$))/i,
    /(?:First\s*Name|Given\s*Names?|PRENOMS?)(?:\/[A-Za-z]+)?\s*[\s\S]{0,160}?\n?\s*:?\s*([("']?[A-Za-z][A-Za-z\s,.'-]{1,80}?)(?=\s*(?:\n|Other\s*Names?|Middle|Surname|SURNAME|DATE|Date|NIN|National|\(|$))/i,
    /(?:First\s*Name|Given\s*Names?|Given\s*Name)\s*[#:.\s/|-]+\s*([^\n\r]+?)(?=\s*(?:Other\s*Names?|Middle\s*Name|Surname|Date|DATE|$))/im,
    /(?:First\s*Name|Given\s*Names?|Given\s*Name)\s*[#:.\s/|-]+\s*([^\n\r]+)/im,
  ];

  for (const re of patterns) {
    const raw = text.match(re)?.[1]?.trim().replace(/\s+/g, ' ') ?? '';
    const cleaned = sanitizeExtractedNameLine(raw.replace(/^["'(]+|["')]+$/g, ''));
    if (cleaned.length) {
      return cleaned;
    }
  }

  return null;
}

/** Strip leading label noise from OCR; keep readable name tokens (commas → word boundaries). */
function sanitizeExtractedNameLine(raw: string): string {
  let s = raw.replace(/^[^A-Za-z"'(]+/, '').trim();
  s = s.replace(/[,;]+/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = s.split(/\s+/).filter(Boolean).map((w) => w.replace(/[^A-Za-z'-]/g, ''));
  const letters = tokens.filter((w) => /^[A-Za-z][A-Za-z'-]*$/.test(w));
  if (!letters.length) {
    return '';
  }
  // Drop obvious OCR noise tokens (very short, not initials we care about on their own).
  const noise = new Set(['o', 'a', 'i', 'lr', 'ly', 'bl', 'tr', 'ws', 'nom']);
  const filtered = letters.filter(
    (w) => w.length >= 2 && !noise.has(w.toLowerCase()),
  );
  if (filtered.length) {
    return filtered.join(' ');
  }
  return letters.join(' ');
}

/**
 * DOB: DD/MM/YYYY, YYYY-MM-DD, or DD MMM YYYY (NIMC / OCR).
 */
export function extractDobFromSlipText(text: string): Date | null {
  const labeled = text.match(
    /(?:Date\s*of\s*Birth|D\.?\s*O\.?\s*B\.?|Birth\s*Date)\s*[#:.\s/|-]*\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})/i,
  );
  if (labeled?.[1]) {
    const d = parseDobFlexible(labeled[1]);
    if (d) {
      return d;
    }
  }

  const monthNameLoose = text.match(
    /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/i,
  );
  if (monthNameLoose?.[1]) {
    const d = parseDobFlexible(monthNameLoose[1]);
    if (d) {
      return d;
    }
  }

  const slash = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  if (slash) {
    return parseDobFlexible(slash[1]);
  }

  const iso = text.match(/\b(\d{4}-\d{1,2}-\d{1,2})\b/);
  return iso ? parseDobFlexible(iso[1]) : null;
}

export function parseDobFlexible(s: string): Date | null {
  const trimmed = s.trim();
  if (!trimmed) {
    return null;
  }

  const mMonthFirst = moment.utc(
    trimmed,
    ['DD MMM YYYY', 'D MMM YYYY', 'DD MMMM YYYY', 'D MMMM YYYY'],
    true,
  );
  if (mMonthFirst.isValid()) {
    return mMonthFirst.toDate();
  }

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map((p) => Number(p.trim()));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
      return null;
    }
    const [d, m, y] = parts;
    if (!d || !m || !y) {
      return null;
    }
    return new Date(Date.UTC(y, m - 1, d));
  }

  const parts = trimmed.split('-').map((p) => Number(p.trim()));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  const [a, b, c] = parts;
  if (a > 31) {
    return new Date(Date.UTC(a, b - 1, c));
  }
  return new Date(Date.UTC(c, b - 1, a));
}

export function parseNinSlipText(raw: string): NinSlipExtracted | null {
  const text = normalizeSlipText(raw.replace(/\r\n/g, '\n'));

  const nin = extractNinFromSlipText(text);
  const firstName = extractFirstNameFromSlipText(text);
  const lastName = extractLastNameFromSlipText(text);
  const dateOfBirth = extractDobFromSlipText(text);

  if (!nin || !firstName || !lastName || !dateOfBirth) {
    return null;
  }

  return { nin, firstName, lastName, dateOfBirth };
}

function normalizeName(s: string): string {
  return s
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[,;'"]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[…\.]+$/u, '')
    .trim();
}

/**
 * Whole-string match or prefix match (truncation / OCR drop).
 */
function nameMatchesProfileLoose(fromDoc: string, fromProfile: string): boolean {
  const a = normalizeName(fromDoc);
  const b = normalizeName(fromProfile);
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
 * Profile tokens appear in order within doc tokens (e.g. "menyaga" vs "menyaga ni le").
 */
function nameSubsequenceMatch(docRaw: string, profileRaw: string): boolean {
  const doc = normalizeName(docRaw).split(/\s+/).filter(Boolean);
  const prof = normalizeName(profileRaw).split(/\s+/).filter(Boolean);
  if (!doc.length || !prof.length) {
    return false;
  }

  let j = 0;
  for (const w of prof) {
    let found = false;
    while (j < doc.length) {
      const t = doc[j];
      if (t === w) {
        found = true;
        j++;
        break;
      }
      if (
        w.length >= 3 &&
        t.length >= 3 &&
        (t.startsWith(w) || w.startsWith(t))
      ) {
        found = true;
        j++;
        break;
      }
      j++;
    }
    if (!found) {
      return false;
    }
  }
  return true;
}

function deepNameMatch(fromDoc: string, fromProfile: string): boolean {
  if (nameMatchesProfileLoose(fromDoc, fromProfile)) {
    return true;
  }
  if (nameSubsequenceMatch(fromDoc, fromProfile)) {
    return true;
  }
  return nameSubsequenceMatch(fromProfile, fromDoc);
}

function sameCalendarDateUtc(a: Date, b: Date | string): boolean {
  const da = moment.utc(a).format('YYYY-MM-DD');
  const db = moment.utc(b).format('YYYY-MM-DD');
  return da === db;
}

/**
 * Compare extracted slip data to stored user profile (ISO DOB supported).
 */
export function extractedNinMatchesUserProfile(
  extracted: NinSlipExtracted,
  user: NinProfileForMatch,
): boolean {
  const existingNin = (user.nationalIdentificationNumber ?? '').replace(
    /\D/g,
    '',
  );
  if (existingNin.length === 11 && existingNin !== extracted.nin) {
    return false;
  }

  if (!user.dateOfBirth) {
    return false;
  }

  const firstOk = deepNameMatch(extracted.firstName, user.firstname ?? '');
  const lastOk = deepNameMatch(extracted.lastName, user.lastname ?? '');
  const dobOk = sameCalendarDateUtc(extracted.dateOfBirth, user.dateOfBirth);

  return firstOk && lastOk && dobOk;
}
