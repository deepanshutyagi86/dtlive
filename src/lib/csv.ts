// CSV generation and the export filter shape.
//
// Pure and dependency-free on purpose: the export ROUTE needs it, and so
// does the admin UI that builds the download link, and one of those is a
// client component. Same rule as settings-types.ts and email-copy.ts —
// shared data and shared logic never live in a module that imports the DB.

/**
 * RFC4180-ish escaping: quote any field containing a comma, quote, or
 * newline, and double up internal quotes. Values that don't need quoting
 * are left bare (both are valid CSV, and it keeps the file readable).
 *
 * Also defuses spreadsheet formula injection. A cell beginning =, +, -, @
 * or a control character is executed as a formula by Excel, Sheets and
 * LibreOffice on open — and every value here is attacker-supplied: a
 * buyer types their own name, and `=HYPERLINK(...)` in a name field is a
 * real, documented attack on whoever opens the export. Prefixing a tab
 * makes the cell inert while still displaying the original text.
 */
export function csvEscape(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "\t" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Header row + data rows to a UTF-8 CSV body. */
export function toCsv(header: string[], rows: unknown[][]): string {
  // Leading BOM so Excel detects UTF-8 instead of misreading non-ASCII
  // characters (Indian names, the rupee sign) as Latin-1.
  return (
    "﻿" +
    [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n") +
    "\r\n"
  );
}

export type ExportType = "orders" | "leads";

/**
 * What the admin asked to export. Every field optional — an empty filter
 * means "everything", which is what the old no-argument export did, so
 * the existing download link keeps behaving exactly as it did.
 */
export interface ExportFilters {
  type: ExportType;
  /** Inclusive, IST calendar date, "YYYY-MM-DD". */
  from?: string;
  /** Inclusive, IST calendar date. The whole of this day is included. */
  to?: string;
  itemId?: string;
  /** orders: pending|paid|failed · leads: new|contacted|closed */
  status?: string;
  /** `ad:<slug>` or `live:<slug>`. */
  source?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A calendar date typed by a human in India, to the UTC instant that day
 * begins (or, with `endOfDay`, the instant the NEXT day begins).
 *
 * This has to be explicit. IST is UTC+5:30, so "2 September" in Meerut
 * starts at 18:30 on 1 September UTC. Comparing a date string against a
 * UTC timestamp column without the offset silently drops the first five
 * and a half hours of every export and includes five and a half hours of
 * the previous day — which is exactly the class of bug that broke the
 * coupon tests. Returns null for anything that isn't a plain date.
 */
export function istDateToUtc(date: string | undefined, endOfDay = false): string | null {
  if (!date || !DATE_RE.test(date)) return null;
  const base = new Date(`${date}T00:00:00+05:30`);
  if (Number.isNaN(base.getTime())) return null;
  if (endOfDay) base.setUTCDate(base.getUTCDate() + 1);
  return base.toISOString();
}

/** Filename that says what is inside it, so a folder of exports stays readable. */
export function exportFilename(f: ExportFilters): string {
  const parts: string[] = [f.type];
  if (f.status) parts.push(f.status);
  if (f.source) parts.push(f.source.replace(/[^a-z0-9]+/gi, "-"));
  if (f.from || f.to) parts.push(`${f.from || "start"}_to_${f.to || "today"}`);
  return `${parts.join("-")}.csv`;
}

/** The querystring for the export endpoint. Used by the admin UI. */
export function exportHref(f: ExportFilters): string {
  const q = new URLSearchParams({ type: f.type });
  if (f.from) q.set("from", f.from);
  if (f.to) q.set("to", f.to);
  if (f.itemId) q.set("itemId", f.itemId);
  if (f.status) q.set("status", f.status);
  if (f.source) q.set("source", f.source);
  return `/api/admin/export?${q.toString()}`;
}
