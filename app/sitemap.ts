import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/reservieren", priority: 0.9 },
  { path: "/speisekarte", priority: 0.8 },
  { path: "/restaurant", priority: 0.7 },
  { path: "/impressum", priority: 0.1 },
  { path: "/datenschutz", priority: 0.1 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority,
  }));
}
