import DirectoryGrid, { DirectoryItem } from "@/components/DirectoryGrid";
import { getItemsByCategory, getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function VenturesPage() {
  const [items, footerLinks] = await Promise.all([
    getItemsByCategory("venture"),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);
  const directoryItems: DirectoryItem[] = items.map((i) => ({
    slug: i.slug,
    title: i.title,
    description: i.description,
    category: i.category as "venture",
    details: i.details,
    thumbnail: i.thumbnail,
    imageFocal: i.details?.imageFocal ?? null,
  }));
  return (
    <DirectoryGrid
      kind="venture"
      title="Ventures"
      blurb="Businesses I hold equity in and build on, day to day."
      items={directoryItems}
      footerLinks={footerLinks}
    />
  );
}
