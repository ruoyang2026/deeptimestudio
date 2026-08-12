import type { MetadataRoute } from "next";
import { trilobites, isDrillable } from "../lib/trilobites";
import { fashionProducts } from "../lib/fashion";
import {
  lastModifiedForSlug,
  lastModifiedForFashionSlug,
  UPDATES_LAST_GENERATED,
} from "../lib/updates";
import { SITE_URL } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/fossil-fashion-design-inspiration`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/updates`,
      changeFrequency: "daily",
      priority: 0.9,
      lastModified: UPDATES_LAST_GENERATED || undefined,
    },
  ];

  for (const t of trilobites) {
    if (!isDrillable(t.slug)) continue;
    entries.push({
      url: `${SITE_URL}/species/${t.slug}`,
      changeFrequency: "monthly",
      priority: 0.7,
      lastModified: lastModifiedForSlug(t.slug),
    });
  }

  for (const p of fashionProducts) {
    entries.push({
      url: `${SITE_URL}/fashion/${p.slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
      lastModified: lastModifiedForFashionSlug(p.slug),
    });
  }

  return entries;
}
