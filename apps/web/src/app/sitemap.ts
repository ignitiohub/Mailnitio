import { industries } from "@mailnitio/config";
import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3400";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/product/helpdesk",
    "/product/send",
    ...industries.map((i) => `/industries/${i.slug}`),
    "/pricing",
    "/security",
    "/demo",
    "/legal/terms",
    "/legal/privacy",
    "/legal/aup",
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path.startsWith("/legal") ? "yearly" : "monthly",
    priority: path === "/" ? 1 : path === "/demo" || path === "/pricing" ? 0.9 : 0.7,
  }));
}
