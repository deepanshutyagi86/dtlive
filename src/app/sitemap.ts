import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-settings";
import { getLiveStreamItems } from "@/lib/items";
import { getLiveGuides } from "@/lib/guides";

// Regenerated on every request rather than at build time: the item list is
// DB-driven and a code push cannot change it, so a build-time snapshot
// would go stale the moment something goes live in /admin.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { path: "", priority: 1, freq: "daily" as const },
    { path: "/courses", priority: 0.9, freq: "daily" as const },
    { path: "/workshops", priority: 0.9, freq: "daily" as const },
    { path: "/agency", priority: 0.8, freq: "weekly" as const },
    { path: "/guide", priority: 0.8, freq: "weekly" as const },
    { path: "/shop", priority: 0.6, freq: "weekly" as const },
    { path: "/ventures", priority: 0.6, freq: "weekly" as const },
    { path: "/contact", priority: 0.5, freq: "monthly" as const },
    { path: "/terms", priority: 0.2, freq: "yearly" as const },
    { path: "/privacy", priority: 0.2, freq: "yearly" as const },
    { path: "/refund-policy", priority: 0.2, freq: "yearly" as const },
    { path: "/shipping-policy", priority: 0.2, freq: "yearly" as const },
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  // A DB outage must not 500 the sitemap — a sitemap missing its item URLs
  // for one crawl is recoverable; a 500 tells Google the file is broken.
  try {
    const items = await getLiveStreamItems();
    for (const item of items) {
      if (item.category !== "course" && item.category !== "workshop") continue;
      entries.push({
        url: `${SITE_URL}/items/${item.slug}`,
        lastModified: item.updatedAt ? new Date(item.updatedAt) : undefined,
        changeFrequency: "daily",
        priority: 0.9,
      });
    }
  } catch {
    /* fall through with the static routes only */
  }

  try {
    const guides = await getLiveGuides();
    for (const g of guides) {
      entries.push({
        url: `${SITE_URL}/guide/${g.slug}`,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch {
    /* same reasoning as above */
  }

  return entries;
}
