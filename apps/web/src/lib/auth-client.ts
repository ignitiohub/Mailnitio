"use client";

import { organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Same-origin: /api/auth/* is proxied to the API by next.config rewrites. */
export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = "/login/verify";
      },
    }),
    organizationClient(),
  ],
});

/** Map Better Auth error codes to plain-language messages. */
export function authErrorMessage(
  error: { code?: string; message?: string; status?: number } | null | undefined,
): string {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "The email or password is not correct.";
    case "EMAIL_NOT_VERIFIED":
      return "Verify your email address first. We have sent you a new link.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Sign in instead.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 10 characters for your password.";
    case "INVALID_CODE":
    case "INVALID_TWO_FACTOR_CODE":
      return "That code is not correct or has expired. Try the latest code from your app.";
    case "INVALID_PASSWORD":
      return "The password is not correct.";
    case "INVALID_TOKEN":
      return "This link is invalid or has expired. Request a new one.";
    default:
      if (error?.status === 429) return "Too many attempts. Wait a minute and try again.";
      return "Something went wrong. Try again in a moment.";
  }
}
