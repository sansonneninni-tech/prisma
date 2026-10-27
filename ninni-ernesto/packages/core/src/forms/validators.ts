/**
 * Small, dependency-free field validators shared by checkout and forms.
 * Errors are text keys of `testi/*.json` (e.g. `errori.email`), so every site shows them in its language.
 */

export type FieldErrors<T> = Partial<Record<Extract<keyof T, string>, string>>;

export interface ValidationResult<T> {
  valid: boolean;
  errors: FieldErrors<T>;
  /** Trimmed/normalised values (only meaningful when `valid`). */
  data: T;
}

export const ERR = {
  required: 'errori.obbligatorio',
  email: 'errori.email',
  phone: 'errori.telefono',
  postalCode: 'errori.cap',
  country: 'errori.paese_non_servito',
  cardNumber: 'errori.carta_numero',
  cardExpiry: 'errori.carta_scadenza',
  cardCvc: 'errori.carta_cvc',
  cardDeclined: 'errori.carta_rifiutata',
  cardDemoOnly: 'errori.carta_demo',
  consent: 'errori.consenso',
  terms: 'errori.termini',
  messageTooShort: 'errori.messaggio_breve',
  fileType: 'errori.file_formato',
  fileSize: 'errori.file_peso',
  generic: 'errori.generico',
} as const;

export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function bool(value: unknown): boolean {
  return value === true || value === 'on' || value === 'true' || value === '1';
}

export function isEmail(value: string): boolean {
  // Pragmatic check: something@domain.tld, no spaces. Real verification happens by sending an email.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

/** Accepts international formats: digits, spaces, dots, dashes, brackets, optional leading +. 6–15 digits. */
export function isPhone(value: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15;
}

/** Italian CAP: 5 digits. Other countries: 2–10 letters/digits/spaces/dashes (generic). */
export function isPostalCode(value: string, country: string): boolean {
  if (country.toUpperCase() === 'IT') return /^\d{5}$/.test(value);
  return /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/.test(value);
}

/** Luhn checksum for card numbers. */
export function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

/** `"12/28"` or `"12/2028"` → expiry still valid at `now`. */
export function isFutureExpiry(value: string, now: Date = new Date()): boolean {
  const m = /^\s*(\d{1,2})\s*\/\s*(\d{2}|\d{4})\s*$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  let year = Number(m[2]);
  if (month < 1 || month > 12) return false;
  if (year < 100) year += 2000;
  // valid through the last day of the month
  const endOfMonth = new Date(year, month, 1);
  return endOfMonth.getTime() > now.getTime();
}

export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

/** Optional image upload (JPG, PNG, HEIC; max 10 MB). Returns an error key or `null`. */
export function checkImageFile(file: FileLike | null | undefined): string | null {
  if (!file || file.size === 0) return null;
  const typeOk = IMAGE_TYPES.includes(file.type.toLowerCase()) || /\.(jpe?g|png|heic|heif)$/i.test(file.name);
  if (!typeOk) return ERR.fileType;
  if (file.size > MAX_UPLOAD_BYTES) return ERR.fileSize;
  return null;
}
