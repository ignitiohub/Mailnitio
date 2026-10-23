import { describe, expect, it } from "vitest";
import { maskPii } from "./pii";
import { prefilter } from "./prefilter";

describe("PII masking (spec §10.6)", () => {
  it("masks BVN, NUBAN, card, phone and third-party emails", () => {
    const input =
      "BVN 22345678901, account 0123456789, card 4111 1111 1111 1111, call 0803 123 4567 or +234 803 123 4567, cc lawyer@okeke-legal.example";
    const { text, counts } = maskPii(input, { senderEmail: "ada@example.com" });
    expect(text).toBe("BVN [ID11], account [ACCT], card [CARD], call [PHONE] or [PHONE], cc [EMAIL]");
    expect(counts).toEqual({ "[ID11]": 1, "[ACCT]": 1, "[CARD]": 1, "[PHONE]": 2, "[EMAIL]": 1 });
  });

  it("keeps the sender's own address", () => {
    expect(maskPii("reply to Ada@Example.com", { senderEmail: "ada@example.com" }).text).toBe(
      "reply to Ada@Example.com",
    );
  });

  it("does not mask digit runs that fail the Luhn check as cards", () => {
    expect(maskPii("ref 4111111111111112").text).not.toContain("[CARD]");
  });

  it("applies tenant patterns as [CUSTID] before anything else", () => {
    expect(maskPii("customer AAM-123456 here", { customPatterns: ["\\bAAM-\\d{6}\\b"] }).text).toBe(
      "customer [CUSTID] here",
    );
  });

  it("leaves amounts, dates and short numbers alone", () => {
    const text = "I paid ₦250,000 on 12/10/2026 for 3 units";
    expect(maskPii(text).text).toBe(text);
  });
});

describe("pre-filter (spec §12.3)", () => {
  const own = { ownAddresses: ["complaints@acmeasset.ng"] };
  const email = { from: "ada@example.com", subject: "My redemption", headers: {} };

  it("lets normal customer email through", () => {
    expect(prefilter(email, own)).toBeNull();
  });

  it.each([
    [{ headers: { "Auto-Submitted": "auto-replied" } }, "auto_submitted"],
    [{ headers: { "auto-submitted": "no" } }, null],
    [{ headers: { "X-Autoreply": "yes" } }, "auto_reply_header"],
    [{ headers: { Precedence: "bulk" } }, "bulk_precedence"],
    [{ subject: "Automatic reply: Out of office" }, "auto_reply_subject"],
    [{ subject: "Undeliverable: Your request" }, "auto_reply_subject"],
    [{ from: "MAILER-DAEMON@googlemail.com" }, "system_sender"],
    [{ from: "no-reply@bank.example" }, "system_sender"],
    [{ from: "complaints@acmeasset.ng" }, "own_mailbox"],
    [{ headers: { "X-Mailnitio-Ref": "abc" } }, "own_message"],
  ] as const)("%o → %s", (overrides, expected) => {
    expect(prefilter({ ...email, ...overrides }, own)).toBe(expected);
  });
});
