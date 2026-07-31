import CategoryGrid from "@/components/CategoryGrid";
import { getItemsByCategory, getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function AgencyPage() {
  const [items, footerLinks] = await Promise.all([
    getItemsByCategory("agency"),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);
  return <CategoryGrid category="agency" items={items} footerLinks={footerLinks} />;
}
