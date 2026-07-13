import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Coming-soon phase: only the landing page itself may be indexed.
 * "Allow: /$" wins over "Disallow: /" because it is the more specific rule.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/$",
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
