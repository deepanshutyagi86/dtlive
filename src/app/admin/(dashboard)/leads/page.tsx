import { listLeads } from "@/lib/admin-repo";
import LeadsTable from "./LeadsTable";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const leads = await listLeads();

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">Inbox</p>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">Leads</h1>
        </div>
        <a
          href="/api/leads/export"
          className="bg-marigold text-ink px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-ink hover:text-bone transition-colors whitespace-nowrap"
        >
          Download CSV
        </a>
      </div>
      <LeadsTable leads={leads.map((l) => ({ ...l, item: l.itemTitle ? { title: l.itemTitle } : null }))} />
    </div>
  );
}
