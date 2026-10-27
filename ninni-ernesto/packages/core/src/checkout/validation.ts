import { SHIPPABLE_COUNTRIES } from '../config/shipping.ts';
import { ERR, bool, isEmail, isFutureExpiry, isPhone, isPostalCode, luhn, str, type FieldErrors, type ValidationResult } from '../forms/validators.ts';
import type { CardInput, CustomerDetails, ShippingDetails } from './types.ts';

/** Step "I tuoi dati". Accepts a plain object or FormData with the `CustomerDetails` field names. */
export function validateCustomer(input: Record<string, unknown> | FormData): ValidationResult<CustomerDetails> {
  const get = (k: string): unknown => (input instanceof FormData ? input.get(k) ?? undefined : input[k]);
  const data: CustomerDetails = {
    firstName: str(get('firstName')),
    lastName: str(get('lastName')),
    email: str(get('email')),
    phone: str(get('phone')),
    address1: str(get('address1')),
    address2: str(get('address2')),
    postalCode: str(get('postalCode')).toUpperCase(),
    city: str(get('city')),
    province: str(get('province')),
    country: str(get('country')).toUpperCase(),
    notes: str(get('notes')),
    wantsInvoice: bool(get('wantsInvoice')),
    taxCode: str(get('taxCode')).toUpperCase(),
    sdiOrPec: str(get('sdiOrPec')),
  };
  const errors: FieldErrors<CustomerDetails> = {};
  for (const key of ['firstName', 'lastName', 'email', 'phone', 'address1', 'postalCode', 'city', 'country'] as const) {
    if (!data[key]) errors[key] = ERR.required;
  }
  if (data.email && !isEmail(data.email)) errors.email = ERR.email;
  if (data.phone && !isPhone(data.phone)) errors.phone = ERR.phone;
  if (data.country && !SHIPPABLE_COUNTRIES.includes(data.country)) errors.country = ERR.country;
  if (data.postalCode && data.country && !errors.country && !isPostalCode(data.postalCode, data.country)) errors.postalCode = ERR.postalCode;
  if (data.wantsInvoice && !data.taxCode) errors.taxCode = ERR.required;
  return { valid: Object.keys(errors).length === 0, errors, data };
}

export function validateShipping(input: Record<string, unknown> | FormData): ValidationResult<ShippingDetails> {
  const get = (k: string): unknown => (input instanceof FormData ? input.get(k) ?? undefined : input[k]);
  const data: ShippingDetails = { isGift: bool(get('isGift')), giftMessage: str(get('giftMessage')).slice(0, 500) };
  return { valid: true, errors: {}, data };
}

/** Card format checks (number with Luhn, future expiry, 3–4 digit CVC, holder). Does NOT authorise anything. */
export function validateCard(input: Partial<CardInput>, now: Date = new Date()): ValidationResult<CardInput> {
  const data: CardInput = {
    number: str(input.number).replace(/[\s-]/g, ''),
    expiry: str(input.expiry),
    cvc: str(input.cvc),
    holder: str(input.holder),
  };
  const errors: FieldErrors<CardInput> = {};
  if (!data.number) errors.number = ERR.required;
  else if (!/^\d{12,19}$/.test(data.number) || !luhn(data.number)) errors.number = ERR.cardNumber;
  if (!data.expiry) errors.expiry = ERR.required;
  else if (!isFutureExpiry(data.expiry, now)) errors.expiry = ERR.cardExpiry;
  if (!data.cvc) errors.cvc = ERR.required;
  else if (!/^\d{3,4}$/.test(data.cvc)) errors.cvc = ERR.cardCvc;
  if (!data.holder) errors.holder = ERR.required;
  return { valid: Object.keys(errors).length === 0, errors, data };
}
