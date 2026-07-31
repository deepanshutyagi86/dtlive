import { itemCounts, orderStats, countRecentLeads } from "@/lib/admin-repo";

export const dynamic = "force-dynamic";

export default async function AdminDashboardHome() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now.getTime() - 7 * 864e5);

  const [counts, sales, newLeads] = await Promise.all([
    itemCounts(),
    orderStats(monthStart),
    countRecentLeads(weekAgo),
  ]);

  const stats = [
    { label: "Live items", value: `${counts.live} / ${counts.total}` },
    { label: "Sales this month", value: `₹${(sales.totalPaise / 100).toLocaleString("en-IN")}` },
    { label: "Orders this month", value: String(sales.count) },
    { label: "New leads (7d)", value: String(newLeads) },
  ];

  return (
    <div>
      <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">Overview</p>
      <h1 className="font-display font-extrabold text-3xl tracking-tight mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-line rounded-card p-5">
            <div className="font-display font-extrabold text-2xl tracking-tight">{s.value}</div>
            <div className="font-mono text-[11px] text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <a href="/admin/items" className="bg-ink text-bone px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-marigold hover:text-ink transition-colors">
          Manage items →
        </a>
        <a href="/" target="_blank" className="border border-line px-5 py-2.5 rounded-full font-semibold text-sm hover:border-ink transition-colors">
          View live site ↗
        </a>
      </div>
    </div>
  );
}
