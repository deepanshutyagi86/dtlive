import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";

// TEMPORARY — one-off endpoint to apply the leads.answers column against
// production. Remove once run; db/schema.sql is the source of truth.
export async function POST() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS answers JSONB`;
  return NextResponse.json({ ok: true });
}
