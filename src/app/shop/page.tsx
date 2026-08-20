import type { Metadata } from "next";
import DirectoryGrid, { DirectoryItem } from "@/components/DirectoryGrid";
import { getItemsByCategory, getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop",
  description: "Physical products from the brands I run. Each listing opens the real marketplace page.",
  alternates: { canonical: "/shop" },
  openGraph: { title: "Shop", description: "Physical products from the brands I run. Each listing opens the real marketplace page.", url: "/shop" },
};

export default async function ShopPage() {
  const [items, footerLinks] = await Promise.all([
    getItemsByCategory("shop"),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);
  const directoryItems: DirectoryItem[] = items.map((i) => ({
    id: i.id,
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
