import type { Item } from "@/lib/db";
import type { AgencyDetails, CourseDetails, ShopDetails, VentureDetails, WorkshopDetails } from "@/lib/types";

export function metaFor(item: Item): string {
  const d = item.details as any;
  switch (item.category) {
    case "course":
      return `₹${(d as CourseDetails).price} · ${(d as CourseDetails).duration ?? "self-paced"}`;
    case "workshop": {
      const w = d as WorkshopDetails;
      const date = new Date(w.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      return `${date} · ${w.seatsLeft} seats left`;
    }
    case "agency": {
      const a = d as AgencyDetails;
      return a.priceType === "quote" ? "Custom quote" : `from ₹${a.priceValue}`;
    }
    case "shop":
      return `${(d as ShopDetails).platform} ↗`;
    case "venture":
      return (d as VentureDetails).externalUrl?.replace(/^https?:\/\//, "") ?? "";
    default:
      return "";
  }
}

export function externalFor(item: Item): string | null {
  const d = item.details as any;
  if (item.category === "shop") return (d as ShopDetails).externalUrl;
  if (item.category === "venture") return (d as VentureDetails).externalUrl ?? null;
  return null;
}
