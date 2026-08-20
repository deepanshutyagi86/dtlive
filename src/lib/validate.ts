// Shared, dependency-free validators. Imported by BOTH the client modals
// and the API routes on purpose: the client copy is the fast feedback, the
// server copy is the actual rule. Never let only one side run — a form
// posts from a click handler, not a native submit, so `type="email"` is
// decoration and enforces nothing.

/**
 * Deliberately permissive: one @, a dot in the domain, no whitespace, no
 * consecutive dots. Anything stricter starts rejecting real addresses
 * (plus-tags, long TLDs, unicode domains) which costs more than it saves.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (v.length < 6 || v.length > 254) return false;
  if (v.includes("..")) return false;
  return EMAIL_RE.test(v);
}

/**
 * Strips everything that isn't a digit or a leading +, so a pasted
 * "+91 98706 00903" or "098706-00903" both normalise. Returns digits only,
 * with a country code kept when one was given.
 */
export function normalisePhone(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Accepts any country: 8–15 digits is the E.164 range. A bare 10-digit
 * number (what most Indian buyers type) is accepted as-is; the country
 * code is optional, never forced. We refuse only what cannot be a phone
 * number at all, because a rejected real customer costs far more than a
 * junk row.
 */
export function isValidPhone(value: string): boolean {
  const digits = normalisePhone(value).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  // An Indian mobile is 10 digits starting 6-9, optionally prefixed 91.
  // Reject the classic typo of a 10-digit number starting 0-5.
  if (digits.length === 10 && !/^[6-9]/.test(digits)) return false;
  return true;
}

/** For an <input> that must only ever contain digits, spaces and a +. */
export function stripToPhoneChars(value: string): string {
  return value.replace(/[^\d+\s-]/g, "").replace(/(?!^)\+/g, "");
}

export interface ContactErrors {
  email?: string;
  phone?: string;
}

export function validateContact(input: { email?: string | null; phone?: string | null }): ContactErrors {
  const errors: ContactErrors = {};
  if (input.email !== undefined && input.email !== null && input.email !== "" && !isValidEmail(input.email)) {
    errors.email = "That email doesn't look right — check for a typo.";
  }
  if (input.phone !== undefined && input.phone !== null && input.phone !== "" && !isValidPhone(input.phone)) {
    errors.phone = "That phone number doesn't look right — 10 digits, or include the country code.";
  }
  return errors;
}
