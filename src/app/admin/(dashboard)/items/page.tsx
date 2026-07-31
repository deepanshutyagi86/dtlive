import Link from "next/link";
import { listAllItems } from "@/lib/admin-repo";
import ItemsTable from "./ItemsTable";

export const dynamic = "force-dynamic";

export default async function AdminItemsPage() {
  const items = await listAllItems();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">Manage</p>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">Items</h1>
        </div>
        <Link
          href="/admin/items/new"
          className="bg-marigold text-ink px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-ink hover:text-bone transition-colors"
        >
          + Add new
        </Link>
      </div>
      <ItemsTable items={items} />
    </div>
  );
}
