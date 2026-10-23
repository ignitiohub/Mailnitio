/**
 * PII masking before any LLM call (architecture rule 6, middleware spec §10.6).
 * Order matters: longer and more specific patterns run first so a card number is not partly masked as a
 * phone number. Custom tenant patterns become [CUSTID].
 */

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// 13–19 digits, optionally separated by spaces or dashes.
const CARD = /\b(?:\d[ -]?){12,18}\d\b/g;
// Nigerian mobile (0803..., +234 803 ...) and generic international numbers.
const PHONE =
  /(?:\+?234[\s-]?|\b0)[789][01]\d[\s-]?\d{3}[\s-]?\d{4}\b|\+\d{1,3}[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g;
const ID11 = /\b\d{11}\b/g;
const ACCT10 = /\b\d{10}\b/g;

export interface MaskOptions {
  /** The sender's own address is kept (it is needed for context); every other address is masked. */
  senderEmail?: string;
  customPatterns?: string[];
}

export interface MaskResult {
  text: string;
  /** Counts per token type, recorded for audit; the original values are never stored. */
  counts: Record<string, number>;
}

export function maskPii(input: string, options: MaskOptions = {}): MaskResult {
  const counts: Record<string, number> = {};
  const bump = (token: string) => {
    counts[token] = (counts[token] ?? 0) + 1;
    return token;
  };
  let text = input;

  for (const pattern of options.customPatterns ?? []) {
    text = text.replace(new RegExp(pattern, "g"), () => bump("[CUSTID]"));
  }

  const sender = options.senderEmail?.toLowerCase();
  text = text.replace(EMAIL, (match) => (sender && match.toLowerCase() === sender ? match : bump("[EMAIL]")));

  text = text.replace(CARD, (match) => {
    const digits = match.replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19 && luhnValid(digits) ? bump("[CARD]") : match;
  });
  text = text.replace(PHONE, () => bump("[PHONE]"));
  text = text.replace(ID11, () => bump("[ID11]"));
  text = text.replace(ACCT10, () => bump("[ACCT]"));

  return { text, counts };
}
