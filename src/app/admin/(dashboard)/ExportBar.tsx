"use client";
import { useState } from "react";
import { exportHref, type ExportType } from "@/lib/csv";

// The download itself is a plain <a>, not a fetch. The browser handles
// Content-Disposition, the session cookie rides along on a same-origin
// request, and nothing has to be held in memory on the client — which
// matters the day this export is 40,000 rows instead of 14.

export interface ExportItemOption {
  id: string;
  title: string;
}

const ORDER_STATUSES = [
  { value: "", label: "Any status" },
  { value: "paid", label: "Paid only" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const LEAD_STATUSES = [
  { value: "", label: "Any status" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
];

/** Today in IST, as YYYY-MM-DD — the site's calendar, not the browser's. */
function istToday(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function istMonthStart(): string {
  return istToday().slice(0, 8) + "01";
}

const inputClass =
  "px-3 py-2 text-sm bg-card border border-line rounded-[10px] focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold";

export default function ExportBar({
  type,
  items = [],
  source,
  note,
}: {
  type: ExportType;
  /** Offered in the item filter. Omit to hide that control. */
  items?: ExportItemOption[];
  /** Fixed campaign tag, e.g. "ad:claude-workshop". Hides the picker and
   *  scopes every download on this page to that campaign. */
  source?: string;
  note?: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [itemId, setItemId] = useState("");
  const [status, setStatus] = useState(type === "orders" ? "paid" : "");

  const statuses = type === "orders" ? ORDER_STATUSES : LEAD_STATUSES;
  const href = exportHref({ type, from, to, itemId, status, source });

  function setRange(f: string, t: string) {
    setFrom(f);
    setTo(t);
  }

  return (
    <div className="bg-card border border-line rounded-card p-4 mb-6">
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-3">
        Download CSV
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">From</span>
          <input type="date" className={inputClass} value={from} max={to || undefined}
                 onChange={(e) => setFrom(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">To</span>
          <input type="date" className={inputClass} value={to} min={from || undefined}
                 onChange={(e) => setTo(e.target.value)} />
        </label>

        {items.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Item</span>
            <select className={inputClass} value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">All items</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Status</span>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>

        <a
          href={href}
          className="bg-marigold text-ink px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-ink hover:text-bone transition-colors whitespace-nowrap"
        >
          Download CSV
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted mr-1">Quick</span>
        {[
          { label: "Today", f: istToday(), t: istToday() },
          { label: "Last 7 days", f: istToday(-6), t: istToday() },
          { label: "Last 30 days", f: istToday(-29), t: istToday() },
          { label: "This month", f: istMonthStart(), t: istToday() },
          { label: "All time", f: "", t: "" },
        ].map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRange(r.f, r.t)}
            className={`font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
              from === r.f && to === r.t
                ? "bg-ink text-bone border-ink"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted mt-3">
        {note ??
          "Dates are Indian time and both ends are included. Amounts are in rupees. Opens in Excel, Sheets or Numbers."}
      </p>
    </div>
  );
}
