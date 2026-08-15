import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listLeads } from "@/lib/admin-repo";

// RFC4180-ish escaping: quote any field containing a comma, quote, or
// newline, and double up internal quotes. Values that don't need quoting
// are left bare (both are valid CSV, and it keeps the file more readable).
function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// No query params, no path params — this route takes no input at all, so
// there's nothing here for a caller to redirect or point at an arbitrary
// file. The only output is always this fixed, server-computed CSV.
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await listLeads();

  // Custom registrationFields answers vary per item, so the column set is
  // discovered from the data rather than hardcoded — first-seen order keeps
  // it deterministic for a given export.
  const answerKeys: string[] = [];
  for (const lead of leads) {
    if (!lead.answers) continue;
    for (const key of Object.keys(lead.answers)) {
      if (!answerKeys.includes(key)) answerKeys.push(key);
    }
  }

  const header = ["Name", "Email", "Phone", "Item", "Status", "Created At", ...answerKeys];
  const rows = leads.map((lead) => [
    lead.name,
    lead.email ?? "",
    lead.phone ?? "",
    lead.itemTitle ?? "",
    lead.status,
    lead.createdAt,
    ...answerKeys.map((key) => lead.answers?.[key] ?? ""),
  ]);

  // Leading BOM so Excel detects UTF-8 instead of misreading non-ASCII
  // characters (names, etc.) as Latin-1.
  const csv =
    "\uFEFF" + [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n") + "\r\n";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads-export.csv"',
      "Cache-Control": "no-store",
    },
  });
}
