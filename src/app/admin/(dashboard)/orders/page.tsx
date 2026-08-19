import { listOrders } from "@/lib/admin-repo";
import { SITE_TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-marigold text-ink",
  pending: "bg-line text-ink-soft",
  failed: "bg-live/15 text-live",
};

export default async function AdminOrdersPage() {
  const orders = await listOrders(100);

  return (
    <div>
      <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">Sales</p>
      <h1 className="font-display font-extrabold text-3xl tracking-tight mb-8">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-muted">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-card border border-line rounded-card p-4 flex flex-col md:flex-row md:items-center gap-2 justify-between">
              <div>
                <div className="font-semibold">
                  {o.buyerName} <span className="font-normal text-muted">· {o.buyerEmail} · {o.buyerPhone}</span>
                </div>
                <div className="text-xs text-marigold-deep font-mono mt-1">{o.itemTitle}</div>
                <div className="text-xs text-muted font-mono mt-1">{new Date(o.createdAt).toLocaleString("en-IN", { timeZone: SITE_TZ })}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display font-bold">₹{(o.amount / 100).toLocaleString("en-IN")}</span>
                <span className={`font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLE[o.status]}`}>
                  {o.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
