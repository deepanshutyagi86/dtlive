import { NextResponse } from "next/server";
import { getLiveSettings } from "@/lib/site-settings";
import { liveSessionBySlug } from "@/lib/settings-types";
import { publicLiveSession } from "@/lib/live-public";

// What the open browsers poll during a webinar. Returns exactly the same
// shape the page server-rendered, so LiveBoard can swap one for the other
// without a special case — see live-public.ts for why that matters.
//
// force-dynamic and no-store are the whole point: a cached response here
// would mean flipping a block visible in /admin/live changed nothing on
// the screens of the people already watching, which is the one thing this
// route exists to prevent.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const settings = await getLiveSettings();
  const session = liveSessionBySlug(settings, params.slug);

  // 404 rather than an empty session: the page uses this to notice that
  // the whole thing has been switched off, not just emptied.
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(await publicLiveSession(session, settings.holdingLine), {
    headers: { "Cache-Control": "no-store" },
  });
}
