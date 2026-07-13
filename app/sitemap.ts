import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Coming-soon phase: the stub is the only public page. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
