/**
 * Privacy & PII redaction guard for outbound third-party AI/Search calls.
 * Prevents accidental transmission of customer phone numbers, emails, or ID numbers
 * entered by call center agents during live calls.
 */

export interface RedactionResult {
  sanitized: string;
  redactedTypes: string[];
}

const PHONE_REGEX =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const NATIONAL_ID_REGEX = /\b\d{14}\b/g;

export function redactCustomerPII(text: string): RedactionResult {
  const redactedTypes = new Set<string>();
  let out = text;

  out = out.replace(EMAIL_REGEX, () => {
    redactedTypes.add("email");
    return "[EMAIL_REDACTED]";
  });

  out = out.replace(NATIONAL_ID_REGEX, () => {
    redactedTypes.add("national_id");
    return "[ID_REDACTED]";
  });

  // Avoid redacting legitimate product units/prices (e.g. 5000 AED, 100 unit, 2026)
  out = out.replace(PHONE_REGEX, (match) => {
    const digitsOnly = match.replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      redactedTypes.add("phone");
      return "[PHONE_REDACTED]";
    }
    return match;
  });

  return {
    sanitized: out,
    redactedTypes: Array.from(redactedTypes),
  };
}

