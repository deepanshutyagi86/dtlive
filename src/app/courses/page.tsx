import type { Metadata } from "next";
import CategoryGrid, { GridItem } from "@/components/CategoryGrid";
import { getItemsByCategory, getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Courses",
  description: "Self-paced business and AI courses you buy once and keep forever. Start the minute you pay.",
  alternates: { canonical: "/courses" },
  openGraph: { title: "Courses", description: "Self-paced business and AI courses you buy once and keep forever. Start the minute you pay.", url: "/courses" },
};

export default async function CoursesPage() {
  const [items, footerLinks] = await Promise.all([
    getItemsByCategory("course"),
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
  return <CategoryGrid category="course" items={gridItems} footerLinks={footerLinks} />;
}
