import AdsManager from "./AdsManager";
import { listAllItems } from "@/lib/admin-repo";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminAdsPage() {
  const items = await listAllItems();

  // Only what a page can actually sell or register for. An agency or shop
  // entry has no checkout and no registration form.
  const options = items
    .filter((i) => i.category === "course" || i.category === "workshop")
    .map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      price: (i.details as CourseDetails | WorkshopDetails)?.price ?? null,
    }));

  return <AdsManager items={options} />;
}
