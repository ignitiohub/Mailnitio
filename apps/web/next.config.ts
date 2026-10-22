import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Local development keeps one .env at the repo root; hosted environments set variables directly.
try {
  process.loadEnvFile("../../.env");
} catch {
  // No root .env (CI, Render).
}

// On Render the API is reached over the private network (API_HOSTPORT comes from the blueprint).
const apiOrigin =
  process.env.API_ORIGIN ??
  (process.env.API_HOSTPORT ? `http://${process.env.API_HOSTPORT}` : "http://localhost:3401");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@mailnitio/ui", "@mailnitio/config", "@mailnitio/shared"],
  /**
   * The browser only ever talks to the web origin; auth and API calls are proxied to the API service.
   * This keeps auth cookies first-party (onrender.com subdomains cannot share cookies).
   */
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${apiOrigin}/api/auth/:path*` },
      { source: "/v1/:path*", destination: `${apiOrigin}/v1/:path*` },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_WEB,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      widenClientFileUpload: true,
    })
  : nextConfig;
