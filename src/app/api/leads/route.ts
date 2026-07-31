import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createLead, listLeads } from "@/lib/admin-repo";

export async function POST(req: NextRequest) {
  const { name, contact, message, itemId } = await req.json();
  if (!name || !contact) {
    return NextResponse.json({ error: "Name and contact are required." }, { status: 400 });
  }
  const lead = await createLead({ name, contact, message: message || null, itemId: itemId || null });
  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await listLeads();
  return NextResponse.json(leads);
}
