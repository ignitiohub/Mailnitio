import { z } from "zod";

const responseSchema = z.object({ success: z.boolean(), "error-codes": z.array(z.string()).optional() });

export type CaptchaVerifier = (token: string, remoteIp?: string) => Promise<boolean>;

/**
 * Cloudflare Turnstile server-side check. Without a secret (local development) every token passes;
 * staging and production must set TURNSTILE_SECRET_KEY.
 */
export function createTurnstileVerifier(
  secret: string | undefined,
  fetchImpl: typeof fetch = fetch,
): CaptchaVerifier {
  if (!secret) return async () => true;
  return async (token, remoteIp) => {
    if (!token) return false;
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    try {
      const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(5000),
      });
      const parsed = responseSchema.safeParse(await response.json());
      return parsed.success && parsed.data.success;
    } catch {
      return false;
    }
  };
}
