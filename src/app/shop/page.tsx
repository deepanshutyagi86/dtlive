import DirectoryGrid, { DirectoryItem } from "@/components/DirectoryGrid";
import { getItemsByCategory, getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [items, footerLinks] = await Promise.all([
    getItemsByCategory("shop"),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);
  const directoryItems: DirectoryItem[] = items.map((i) => ({
    slug: i.slug,
    title: i.title,
    description: i.description,
    category: i.category as "shop",
    details: i.details,
    thumbnail: i.thumbnail,
    imageFocal: i.details?.imageFocal ?? null,
  }));
  return (
    <DirectoryGrid
      kind="shop"
      title="Shop"
      blurb="Everywhere my brands sell — this links out to the real marketplace listing, not a cart here."
      items={directoryItems}
      footerLinks={footerLinks}
    />
  );
}
