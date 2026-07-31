import DirectoryGrid from "@/components/DirectoryGrid";
import { getItemsByCategory, getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function VenturesPage() {
  const [items, footerLinks] = await Promise.all([
    getItemsByCategory("venture"),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);
  return (
    <DirectoryGrid
      kind="venture"
      title="Ventures"
      blurb="Businesses I hold equity in and build on, day to day."
      items={items as any}
      footerLinks={footerLinks}
    />
  );
}
