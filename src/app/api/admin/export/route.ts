import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { exportLeads, exportOrders } from "@/lib/admin-repo";
import { exportFilename, istDateToUtc, toCsv, type ExportFilters } from "@/lib/csv";
import { SITE_TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = new Set(["pending", "paid", "failed"]);
const LEAD_STATUSES = new Set(["new", "contacted", "closed"]);

/**
 * One CSV export endpoint for orders and leads, filtered by date range,
 * item, status and campaign source.
 *
 * Admin-gated on the FIRST line, before anything is read or queried: this
 * returns every buyer's name, email and phone number, which is the single
 * most sensitive payload the site can produce.
 *
 * Every query parameter is validated against a fixed set or a fixed shape
 * and then passed as a bound parameter — nothing here is interpolated
 * into SQL, and an unrecognised status is dropped rather than being sent
 * to the database to be rejected.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const type = p.get("type") === "leads" ? "leads" : "orders";
  const statusRaw = (p.get("status") ?? "").trim();
  const valid = type === "orders" ? ORDER_STATUSES : LEAD_STATUSES;

  const filters: ExportFilters = {
    type,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
    itemId: (p.get("itemId") ?? "").trim() || undefined,
    status: valid.has(statusRaw) ? statusRaw : undefined,
    source: (p.get("source") ?? "").trim() || undefined,
  };

  // A malformed date is ignored rather than rejected. The alternative is
  // a 400 on a download link, which in a browser is a blank tab with no
  // explanation — an unfiltered export is the safer failure.
  const fromUtc = istDateToUtc(filters.from);
  const toUtc = istDateToUtc(filters.to, true);
  const query = { fromUtc, toUtc, itemId: filters.itemId ?? null, status: filters.status ?? null };

  const stamp = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { timeZone: SITE_TZ, hour12: false });

  let header: string[];
  let rows: unknown[][];

  if (type === "orders") {
    let orders = await exportOrders(query);
    // Filtered here rather than in SQL because `orders.source` only exists
    // after migration 002, and naming a column that may not exist would
    // fail at parse time for everyone, filter or no filter. Export volumes
    // are small enough that this costs nothing.
    if (filters.source) orders = orders.filter((o) => o.source === filters.source);

    header = [
      "Order ID", "Date (IST)", "Name", "Email", "Phone",
      "Item", "Amount (₹)", "Status", "Source", "Razorpay Order ID",
    ];
    rows = orders.map((o) => [
      o.id,
      stamp(o.createdAt),
      o.buyerName,
      o.buyerEmail,
      o.buyerPhone,
      o.itemTitle,
      // Rupees, not paise. The column is for a human and a CA, and the
      // one thing an accounts export must not do is state the amount in
      // a unit nobody expects.
      (o.amount / 100).toFixed(2),
      o.status,
      o.source ?? "",
      o.cashfreeOrderId ?? "",
    ]);
  } else {
    let leads = await exportLeads(query);
    if (filters.source) leads = leads.filter((l) => l.source === filters.source);

    // Custom registrationFields answers vary per item, so the column set
    // is discovered from the data rather than hardcoded — first-seen
    // order keeps it deterministic for a given export.
    const answerKeys: string[] = [];
    for (const lead of leads) {
      if (!lead.answers) continue;
      for (const key of Object.keys(lead.answers)) {
        if (!answerKeys.includes(key)) answerKeys.push(key);
      }
    }

    header = ["Name", "Email", "Phone", "Item", "Status", "Date (IST)", "Message", ...answerKeys];
    rows = leads.map((lead) => [
      lead.name,
      lead.email ?? "",
      lead.phone ?? "",
      lead.itemTitle ?? "",
      lead.status,
      stamp(lead.createdAt),
      lead.message ?? "",
      ...answerKeys.map((key) => lead.answers?.[key] ?? ""),
    ]);
  }

  return new NextResponse(toCsv(header, rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(filters)}"`,
      "Cache-Control": "no-store",
    },
  });
}
