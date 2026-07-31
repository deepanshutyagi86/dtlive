import DirectoryGrid from "@/components/DirectoryGrid";
import { getItemsByCategory, getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [items, footerLinks] = await Promise.all([
    getItemsByCategory("shop"),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);
  return (
    <DirectoryGrid
      kind="shop"
      title="Shop"
      blurb="Everywhere my brands sell — this links out to the real marketplace listing, not a cart here."
      items={items as any}
      footerLinks={footerLinks}
    />
  );
}
