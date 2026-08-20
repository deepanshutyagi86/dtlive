import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAllSettings, upsertSetting } from "@/lib/admin-repo";

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
  "coupons",
  "invoice",
];

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getAllSettings(ALLOWED_KEYS);
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates = Object.entries(body).filter(([key]) => ALLOWED_KEYS.includes(key));

  await Promise.all(updates.map(([key, value]) => upsertSetting(key, value)));

  return NextResponse.json({ ok: true });
}
