import { describe, expect, it } from "vitest";
import { escapeHtml, formatDateTimeForEmail, leadTeamNotificationTemplate } from "./templates";

describe("system email templates", () => {
  it("escapes user-supplied values in HTML", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    const email = leadTeamNotificationTemplate({
      name: "Tunde <b>Bakare</b>",
      workEmail: "tunde@acme.example",
      company: "Acme Utilities",
      role: "IT or operations",
      country: "Nigeria",
      monthlyVolume: "1,000 to 10,000 emails a month",
      emailPlatform: "Microsoft 365 / Outlook",
      crm: "No CRM",
      interest: null,
      message: null,
      preferredSlot: null,
    });
    expect(email.html).not.toContain("<b>Bakare</b>");
    expect(email.html).toContain("Tunde &lt;b&gt;Bakare&lt;/b&gt;");
    expect(email.subject).toBe("New demo request: Acme Utilities");
  });

  it("formats slot times in West Africa Time", () => {
    expect(formatDateTimeForEmail(new Date("2026-10-27T09:00:00Z"))).toBe("27 Oct 2026, 10:00 WAT");
  });
});
