import type { Metadata } from "next";
import CategoryGrid, { GridItem } from "@/components/CategoryGrid";
import { getItemsByCategory, getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agency",
  description: "Websites, apps and growth work delivered for your business. Fixed scope, fixed price, shipped.",
  alternates: { canonical: "/agency" },
  openGraph: { title: "Agency", description: "Websites, apps and growth work delivered for your business. Fixed scope, fixed price, shipped.", url: "/agency" },
};

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
