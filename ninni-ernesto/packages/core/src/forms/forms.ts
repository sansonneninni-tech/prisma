/** Validation for the commission, contact and waiting-list forms (demo: nothing is sent). */
import { ERR, bool, checkImageFile, isEmail, isPhone, str, type FieldErrors, type FileLike, type ValidationResult } from './validators.ts';

export interface CommissionRequest {
  name: string;
  email: string;
  phone: string;
  city: string;
  /** "Dove andrà il quadro?" */
  room: string;
  /** "Raccontami l'idea" */
  message: string;
  /** "C'è una data a cui tieni?" */
  when: string;
  photo: FileLike | null;
  privacy: boolean;
}

export const COMMISSION_MIN_MESSAGE = 20;

/** Accepts a plain object or `FormData` (field names = the interface keys). */
export function validateCommission(input: Record<string, unknown> | FormData): ValidationResult<CommissionRequest> {
  const get = reader(input);
  const photo = get('photo');
  const data: CommissionRequest = {
    name: str(get('name')),
    email: str(get('email')),
    phone: str(get('phone')),
    city: str(get('city')),
    room: str(get('room')),
    message: str(get('message')),
    when: str(get('when')),
    photo: isFileLike(photo) && photo.size > 0 ? photo : null,
    privacy: bool(get('privacy')),
  };
  const errors: FieldErrors<CommissionRequest> = {};
  if (!data.name) errors.name = ERR.required;
  if (!data.email) errors.email = ERR.required;
  else if (!isEmail(data.email)) errors.email = ERR.email;
  if (data.phone && !isPhone(data.phone)) errors.phone = ERR.phone;
  if (!data.message) errors.message = ERR.required;
  else if (data.message.length < COMMISSION_MIN_MESSAGE) errors.message = ERR.messageTooShort;
  const fileError = checkImageFile(data.photo);
  if (fileError) errors.photo = fileError;
  if (!data.privacy) errors.privacy = ERR.consent;
  return { valid: Object.keys(errors).length === 0, errors, data };
}

export const CONTACT_TOPICS = ['opera', 'commissione', 'ordine', 'stampa', 'altro'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export interface ContactMessage {
  name: string;
  email: string;
  phone: string;
  topic: ContactTopic;
  message: string;
  privacy: boolean;
  newsletter: boolean;
}

export const CONTACT_MIN_MESSAGE = 10;

export function validateContact(input: Record<string, unknown> | FormData): ValidationResult<ContactMessage> {
  const get = reader(input);
  const topic = str(get('topic'));
  const data: ContactMessage = {
    name: str(get('name')),
    email: str(get('email')),
    phone: str(get('phone')),
    topic: (CONTACT_TOPICS as readonly string[]).includes(topic) ? (topic as ContactTopic) : 'altro',
    message: str(get('message')),
    privacy: bool(get('privacy')),
    newsletter: bool(get('newsletter')),
  };
  const errors: FieldErrors<ContactMessage> = {};
  if (!data.name) errors.name = ERR.required;
  if (!data.email) errors.email = ERR.required;
  else if (!isEmail(data.email)) errors.email = ERR.email;
  if (data.phone && !isPhone(data.phone)) errors.phone = ERR.phone;
  if (!data.message) errors.message = ERR.required;
  else if (data.message.length < CONTACT_MIN_MESSAGE) errors.message = ERR.messageTooShort;
  if (!data.privacy) errors.privacy = ERR.consent;
  return { valid: Object.keys(errors).length === 0, errors, data };
}

export interface WaitlistSignup {
  email: string;
  /** Coming-soon category ids. */
  interests: string[];
}

export function validateWaitlist(input: Record<string, unknown> | FormData): ValidationResult<WaitlistSignup> {
  const email = str(input instanceof FormData ? input.get('email') : input.email);
  const rawInterests = input instanceof FormData ? input.getAll('interests') : input.interests;
  const interests = (Array.isArray(rawInterests) ? rawInterests : rawInterests ? [rawInterests] : []).map(String).filter(Boolean);
  const errors: FieldErrors<WaitlistSignup> = {};
  if (!email) errors.email = ERR.required;
  else if (!isEmail(email)) errors.email = ERR.email;
  return { valid: Object.keys(errors).length === 0, errors, data: { email, interests } };
}

function reader(input: Record<string, unknown> | FormData): (key: string) => unknown {
  if (typeof FormData !== 'undefined' && input instanceof FormData) return (key) => input.get(key) ?? undefined;
  return (key) => (input as Record<string, unknown>)[key];
}

function isFileLike(value: unknown): value is FileLike {
  return !!value && typeof value === 'object' && 'size' in value && 'name' in value && 'type' in value;
}
