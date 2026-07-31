import CategoryGrid from "@/components/CategoryGrid";
import { getItemsByCategory } from "@/lib/items";
import { getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const [items, footerLinks] = await Promise.all([
    getItemsByCategory("course"),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);
  return <CategoryGrid category="course" items={items} footerLinks={footerLinks} />;
}
