import CategoryGrid, { GridItem } from "@/components/CategoryGrid";
import { getItemsByCategory, getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function AgencyPage() {
  const [items, footerLinks] = await Promise.all([
    getItemsByCategory("agency"),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);
  const gridItems: GridItem[] = items.map((i) => ({
    id: i.id,
    slug: i.slug,
    title: i.title,
    description: i.description,
    category: i.category,
    details: i.details,
    thumbnail: i.thumbnail,
    imageFocal: i.details?.imageFocal ?? null,
  }));
  return <CategoryGrid category="agency" items={gridItems} footerLinks={footerLinks} />;
}
