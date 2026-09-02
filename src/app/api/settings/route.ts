import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { getAllSettings, hasTaxDetailsColumn, upsertSetting } from "@/lib/admin-repo";

// The allowlist IS the security boundary for this route — anything not
// named here cannot be written through it, no matter what the form posts.
// Every new admin-editable feature adds a KEY, never a column: migrations
// against the production database are blocked, so the settings table is
// where new structured config lives.
const ALLOWED_KEYS = [
  "ticker",
  "testimonials",
  "footerLinks",
  "notifyEmail",
  "heroCopy",
  "emailCopy",
  "branding",
  "nav",
  "bio",
  "starter",
  "guideCta",
  "syllabus",
  "stream",
  "coupons",
  "tax",
  "invoice",
  "business",
  "booth",
  "live",
  "adPages",
];

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getAllSettings(ALLOWED_KEYS);
  // Not a setting — a capability. The B2B switch in the Tax section stays
  // disabled until the orders table can actually store a buyer's GSTIN, so
  // it can never be turned on into a void.
  return NextResponse.json({ ...result, b2bReady: await hasTaxDetailsColumn() });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates = Object.entries(body).filter(([key]) => ALLOWED_KEYS.includes(key));

  await Promise.all(updates.map(([key, value]) => upsertSetting(key, value)));

  // The ad page is now genuine ISR (see the force-static comment in
  // src/app/w/[slug]/page.tsx), so without this an admin edit would sit
  // invisible behind the CDN for up to 30 seconds — and cachedAdPage has
  // carried a `tags: ["ad-pages"]` label since the day it was written with
  // nothing anywhere in the repo ever invalidating it. This is the other
  // half of that contract: change the row, drop the cache, see it live.
  //
  // Deliberately after the write and deliberately not awaited into the
  // response's success condition — a failed cache bust must never make a
  // saved setting report as unsaved. The worst case is the old 30s wait.
  if (updates.some(([key]) => key === "adPages")) {
    try {
      revalidateTag("ad-pages");
    } catch (err) {
      console.error("Settings saved, but the ad-page cache could not be busted:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
