import type { Metadata } from "next";
import CategoryGrid, { GridItem } from "@/components/CategoryGrid";
import { getItemsByCategory, getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workshops",
  description: "Live, hands-on sessions run on Zoom. A real date, a real seat, and you leave having built something.",
  alternates: { canonical: "/workshops" },
  openGraph: { title: "Workshops", description: "Live, hands-on sessions run on Zoom. A real date, a real seat, and you leave having built something.", url: "/workshops" },
};

export default async function WorkshopsPage() {
  const [items, footerLinks] = await Promise.all([
    getItemsByCategory("workshop"),
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
  return <CategoryGrid category="workshop" items={gridItems} footerLinks={footerLinks} />;
}
