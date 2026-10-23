import type { Logger } from "@mailnitio/observability";
import { Resend } from "resend";

export interface SystemEmail {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

/** System email (verification, notifications). Product email (Send) lives in packages/send, not here. */
export interface SystemMailer {
  send(email: SystemEmail): Promise<{ id: string | null }>;
}

export function createResendMailer(apiKey: string, from: string): SystemMailer {
  const resend = new Resend(apiKey);
  return {
    async send(email) {
      const { data, error } = await resend.emails.send({
        from,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
        replyTo: email.replyTo,
      });
      if (error) throw new Error(`System email failed: ${error.name}`);
      return { id: data?.id ?? null };
    },
  };
}

/** Local development: logs the email instead of sending it, so verification links are visible in the console. */
export function createConsoleMailer(logger: Logger): SystemMailer {
  return {
    async send(email) {
      logger.info({ to: email.to, subject: email.subject }, `[dev mail]\n${email.text}`);
      return { id: null };
    },
  };
}

export function createSystemMailer(logger: Logger, env: NodeJS.ProcessEnv = process.env): SystemMailer {
  if (env.RESEND_API_KEY) {
    return createResendMailer(
      env.RESEND_API_KEY,
      env.SYSTEM_EMAIL_FROM ?? "Mailnitio <no-reply@mailnitio.com>",
    );
  }
  if (env.NODE_ENV === "production") {
    logger.warn("RESEND_API_KEY is not set; system email will only be logged");
  }
  return createConsoleMailer(logger);
}
