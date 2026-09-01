import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { SITE_TZ } from "@/lib/dates";
import { emailConfig } from "@/lib/email";
import { getNotifyEmail } from "@/lib/items";
import EmailCheck from "./EmailCheck";

export const dynamic = "force-dynamic";

interface DiagnosticItemRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  live: boolean;
  featured: boolean;
  updated_at: string;
}

export default async function DiagnosticsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  let dbHost = "unknown";
  try {
    dbHost = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    // leave as "unknown" if DATABASE_URL is missing or malformed
  }

  const { configured: emailConfigured, from: emailFrom } = emailConfig();
  const notifyEmail = await getNotifyEmail().catch(() => null);

  const [itemsResult, leadsResult, ordersResult, timeResult] = await Promise.all([
    sql`SELECT id, title, slug, category, live, featured, updated_at FROM items ORDER BY updated_at DESC`,
    sql`SELECT COUNT(*)::int AS count FROM leads`,
    sql`SELECT COUNT(*)::int AS count FROM orders`,
    sql`SELECT now() AS now`,
  ]);

  const items: DiagnosticItemRow[] = itemsResult.rows;
  const leadCount: number = leadsResult.rows[0].count;
  const orderCount: number = ordersResult.rows[0].count;
  // The neon driver returns timestamptz columns as real Date objects, not
  // strings — coerce immediately so nothing downstream ever renders a raw
  // Date (React throws trying to render an object as a child).
  const serverNow = new Date(timeResult.rows[0].now).toISOString();

  return (
    <div>
      <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">System</p>
      <h1 className="font-display font-extrabold text-3xl tracking-tight mb-8">Diagnostics</h1>

      <EmailCheck configured={emailConfigured} from={emailFrom} notifyEmail={notifyEmail} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="DB host" value={dbHost} mono />
        <Stat label="Items" value={String(items.length)} />
        <Stat label="Leads" value={String(leadCount)} />
        <Stat label="Orders" value={String(orderCount)} />
      </div>

      <p className="font-mono text-[11px] text-muted mb-10">
        Postgres server time: {new Date(serverNow).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium", timeZone: SITE_TZ })}{" "}
        ({serverNow})
      </p>

      <h2 className="font-display font-bold text-lg mb-3">All items ({items.length})</h2>
      <div className="border border-line rounded-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-card">
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wider text-muted">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Live</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-line bg-bone/40">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{it.title}</td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{it.slug}</td>
                <td className="px-4 py-3 whitespace-nowrap">{it.category}</td>
                <td className="px-4 py-3">{it.live ? "✓" : "—"}</td>
                <td className="px-4 py-3">{it.featured ? "✓" : "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted whitespace-nowrap">
                  {new Date(it.updated_at).toLocaleString("en-IN", { timeZone: SITE_TZ })}
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-muted whitespace-nowrap">{it.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="text-muted p-4">No items in this database.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-card border border-line rounded-card p-5">
      <div className={`font-extrabold tracking-tight break-all ${mono ? "font-mono text-base" : "font-display text-2xl"}`}>
        {value}
      </div>
      <div className="font-mono text-[11px] text-muted mt-1">{label}</div>
    </div>
  );
}
