import { listAllItems, listLeads } from "@/lib/admin-repo";
import ExportBar from "../ExportBar";
import LeadsTable from "./LeadsTable";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const [leads, items] = await Promise.all([listLeads(), listAllItems()]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">Inbox</p>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">Leads</h1>
        </div>
      </div>
      <ExportBar type="leads" items={items.map((i) => ({ id: i.id, title: i.title }))} />

      <LeadsTable leads={leads.map((l) => ({ ...l, item: l.itemTitle ? { title: l.itemTitle } : null }))} />
    </div>
  );
}
