import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3400";

export default function robots(): MetadataRoute.Robots {
  // Staging must never be indexed.
  if (process.env.NEXT_PUBLIC_APP_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/onboarding", "/design-system", "/api", "/v1"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
