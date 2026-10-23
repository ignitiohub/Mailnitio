/**
 * System email templates. Plain, accessible HTML with a text alternative; no images or tracking.
 * Every interpolated value is escaped.
 */

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** "22 Oct 2026, 14:05 WAT" for emails (Africa/Lagos unless a timezone is given). */
export function formatDateTimeForEmail(date: Date, timeZone = "Africa/Lagos"): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
    timeZoneName: "short",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const zone = timeZone === "Africa/Lagos" ? "WAT" : get("timeZoneName");
  return `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")} ${zone}`;
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#F7F8FA;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0E1525">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E3E6EC;border-radius:8px">
<tr><td style="padding:24px 32px;border-bottom:1px solid #E3E6EC;font-weight:600;font-size:16px;color:#3B3FC4">Mailnitio</td></tr>
<tr><td style="padding:32px;font-size:14px;line-height:20px">${bodyHtml}</td></tr>
</table>
<p style="font-size:12px;line-height:16px;color:#6B7385;margin-top:16px">Mailnitio, AI email operations for growing companies.</p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#3B3FC4;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600">${escapeHtml(label)}</a></p>`;
}

export function verifyEmailTemplate(input: { name: string; url: string }): RenderedEmail {
  const subject = "Verify your email address";
  return {
    subject,
    text: `Hello ${input.name},\n\nConfirm your email address to finish setting up your Mailnitio account:\n${input.url}\n\nThe link expires in 24 hours. If you did not create an account, you can ignore this email.`,
    html: layout(
      subject,
      `<p>Hello ${escapeHtml(input.name)},</p><p>Confirm your email address to finish setting up your Mailnitio account.</p>${button(input.url, "Verify email address")}<p style="color:#4A5568">The link expires in 24 hours. If you did not create an account, you can ignore this email.</p>`,
    ),
  };
}

export function resetPasswordTemplate(input: { name: string; url: string }): RenderedEmail {
  const subject = "Reset your password";
  return {
    subject,
    text: `Hello ${input.name},\n\nUse this link to choose a new password:\n${input.url}\n\nThe link expires in 1 hour. If you did not ask to reset your password, you can ignore this email.`,
    html: layout(
      subject,
      `<p>Hello ${escapeHtml(input.name)},</p><p>Use the button below to choose a new password.</p>${button(input.url, "Reset password")}<p style="color:#4A5568">The link expires in 1 hour. If you did not ask to reset your password, you can ignore this email.</p>`,
    ),
  };
}

export function invitationTemplate(input: {
  inviterName: string;
  workspaceName: string;
  role: string;
  url: string;
}): RenderedEmail {
  const subject = `${input.inviterName} invited you to ${input.workspaceName} on Mailnitio`;
  return {
    subject,
    text: `${input.inviterName} invited you to join ${input.workspaceName} on Mailnitio as ${input.role}.\n\nAccept the invitation:\n${input.url}\n\nThe invitation expires in 7 days.`,
    html: layout(
      subject,
      `<p>${escapeHtml(input.inviterName)} invited you to join <strong>${escapeHtml(input.workspaceName)}</strong> on Mailnitio as ${escapeHtml(input.role)}.</p>${button(input.url, "Accept invitation")}<p style="color:#4A5568">The invitation expires in 7 days.</p>`,
    ),
  };
}

export interface LeadSummary {
  name: string;
  workEmail: string;
  company: string;
  role: string;
  country: string;
  monthlyVolume: string;
  emailPlatform: string;
  crm: string;
  interest: string | null;
  message: string | null;
  preferredSlot: string | null;
}

function leadRows(lead: LeadSummary): [string, string][] {
  return [
    ["Name", lead.name],
    ["Work email", lead.workEmail],
    ["Company", lead.company],
    ["Role", lead.role],
    ["Country", lead.country],
    ["Monthly email volume", lead.monthlyVolume],
    ["Email platform", lead.emailPlatform],
    ["CRM", lead.crm],
    ["Interested in", lead.interest ?? "Not specified"],
    ["Preferred slot", lead.preferredSlot ?? "No slot chosen"],
    ["Message", lead.message ?? ""],
  ];
}

export function leadTeamNotificationTemplate(lead: LeadSummary): RenderedEmail {
  const subject = `New demo request: ${lead.company}`;
  const rows = leadRows(lead);
  return {
    subject,
    text: `New demo request\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}`,
    html: layout(
      subject,
      `<p style="font-weight:600">New demo request</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px">${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 12px 6px 0;color:#4A5568;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`,
        )
        .join("")}</table>`,
    ),
  };
}

export function leadConfirmationTemplate(lead: Pick<LeadSummary, "name" | "preferredSlot">): RenderedEmail {
  const subject = "We have received your demo request";
  const slotLine = lead.preferredSlot
    ? `You asked for ${lead.preferredSlot}. We will confirm this time or suggest another within one working day.`
    : "We will contact you within one working day to arrange a time.";
  return {
    subject,
    text: `Hello ${lead.name},\n\nThank you for your interest in Mailnitio. ${slotLine}\n\nIn the demo we will show how Mailnitio reads, routes and tickets your customer emails, using examples from your industry.\n\nThe Mailnitio team`,
    html: layout(
      subject,
      `<p>Hello ${escapeHtml(lead.name)},</p><p>Thank you for your interest in Mailnitio. ${escapeHtml(slotLine)}</p><p>In the demo we will show how Mailnitio reads, routes and tickets your customer emails, using examples from your industry.</p><p>The Mailnitio team</p>`,
    ),
  };
}
