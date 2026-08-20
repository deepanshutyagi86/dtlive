import { NextResponse } from "next/server";
import { getItemBySlug } from "@/lib/items";
import { buildIcs } from "@/lib/ics";
import type { WorkshopDetails } from "@/lib/types";
import { SITE_URL } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

// Streams a real .ics rather than linking to Google Calendar. A Google
// link only works for people using Google Calendar and silently does
// nothing on an iPhone's default Calendar app — an .ics opens in all of
// them, including Outlook.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const item = await getItemBySlug(params.slug);
  if (!item || !item.live || item.category !== "workshop") {
    return new NextResponse("Not found", { status: 404 });
  }

  const d = item.details as WorkshopDetails & {
    joining?: { meetingUrl?: string; location?: string; durationMinutes?: number; note?: string };
  };
  const joining = d.joining ?? {};

  const parts = [item.description];
  if (joining.meetingUrl) parts.push(`Join: ${joining.meetingUrl}`);
  if (joining.note) parts.push(joining.note);
  parts.push(`${SITE_URL}/items/${item.slug}`);

  const ics = buildIcs({
    // Stable per item, so re-downloading updates the existing entry in the
    // calendar instead of creating a duplicate.
    uid: `item-${item.id}@deepanshutyagi.live`,
    title: item.title,
    description: parts.filter(Boolean).join("\n\n"),
    startISO: d.date,
    durationMinutes: joining.durationMinutes ?? 90,
    url: joining.meetingUrl || `${SITE_URL}/items/${item.slug}`,
    location: joining.location || joining.meetingUrl || "Online",
  });

  if (!ics) return new NextResponse("This workshop has no date set.", { status: 409 });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // Whitelist-sanitised: this lands in a response header, so an
      // admin-typed title is a header-injection vector, not just an ugly
      // filename. Same rule as the guide download route.
      "Content-Disposition": `attachment; filename="${item.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "workshop"}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
