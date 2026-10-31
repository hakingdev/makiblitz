import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Everything public except API routes and the per-visitor flow/result pages. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/reservieren/kontakt",
          "/reservieren/bestaetigt",
          "/r/",
          "/confirm",
          "/abmelden",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
