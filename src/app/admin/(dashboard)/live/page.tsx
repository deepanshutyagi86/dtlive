import LiveManager from "./LiveManager";
import { listAllItems } from "@/lib/admin-repo";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  const items = await listAllItems();

  // Only what a block can actually point at. An agency or shop entry has
  // no checkout and no registration form, so offering it here would let
  // someone build a block that cannot work.
  const options = items
    .filter((i) => i.category === "course" || i.category === "workshop")
    .map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      price: (i.details as CourseDetails | WorkshopDetails)?.price ?? null,
    }));

  return <LiveManager items={options} />;
}
