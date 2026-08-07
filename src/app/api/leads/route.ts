import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { claimMetaLeadEvent, createLead, listLeads } from "@/lib/admin-repo";
import { sendMetaLeadEvent } from "@/lib/meta-capi";

export async function POST(req: NextRequest) {
  const { name, email, phone, itemId, fbc, fbp, eventSourceUrl } = await req.json();
  if (!name || (!email && !phone)) {
    return NextResponse.json({ error: "Name and at least one of email/phone are required." }, { status: 400 });
  }

  // x-forwarded-for can carry a "client, proxy1, proxy2" chain — the first
  // entry is the registrant's IP, which is what Meta expects.
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const clientUserAgent = req.headers.get("user-agent");

  const lead = await createLead({
    name,
    contact: email || phone,
    itemId: itemId || null,
    email: email || null,
    phone: phone || null,
    fbc: typeof fbc === "string" ? fbc : null,
    fbp: typeof fbp === "string" ? fbp : null,
    clientIp,
    clientUserAgent,
    eventSourceUrl: typeof eventSourceUrl === "string" ? eventSourceUrl : null,
  });

  if (await claimMetaLeadEvent(lead.id)) {
    await sendMetaLeadEvent(lead);
  }

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await listLeads();
  return NextResponse.json(leads);
}
