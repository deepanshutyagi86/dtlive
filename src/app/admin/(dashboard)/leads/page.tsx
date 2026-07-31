import { listLeads } from "@/lib/admin-repo";
import LeadsTable from "./LeadsTable";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const leads = await listLeads();

  return (
    <div>
      <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">Inbox</p>
      <h1 className="font-display font-extrabold text-3xl tracking-tight mb-8">Leads</h1>
      <LeadsTable leads={leads.map((l) => ({ ...l, item: l.itemTitle ? { title: l.itemTitle } : null }))} />
    </div>
  );
}
