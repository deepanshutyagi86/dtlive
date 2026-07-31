import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { setLeadStatus } from "@/lib/admin-repo";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  if (!["new", "contacted", "closed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await setLeadStatus(params.id, status);
  return NextResponse.json({ ok: true });
}
