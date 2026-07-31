"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface AdminItemRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  live: boolean;
  featured: boolean;
  order: number;
}

function priceOrMetaFromDetails(): string {
  return ""; // kept simple for v1 — full price shows on the edit page
}

export default function ItemsTable({ items }: { items: AdminItemRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(id: string, field: "live" | "featured", value: boolean) {
    setBusyId(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setBusyId(null);
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    setBusyId(id);
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
    setBusyId(null);
  }

  const grouped = rows.reduce<Record<string, AdminItemRow[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      {Object.entries(grouped).map(([category, catRows]) => (
        <div key={category}>
          <h2 className="font-display font-bold text-lg capitalize mb-3">{category}s</h2>

          {/* Desktop table */}
          <div className="hidden md:block border border-line rounded-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-card">
                <tr className="text-left font-mono text-[10.5px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Live</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {catRows.map((r) => (
                  <tr key={r.id} className="border-t border-line bg-bone/40">
                    <td className="px-4 py-3 font-medium">{r.title}</td>
                    <td className="px-4 py-3">
                      <Toggle checked={r.live} disabled={busyId === r.id} onChange={(v) => toggle(r.id, "live", v)} />
                    </td>
                    <td className="px-4 py-3">
                      <Toggle checked={r.featured} disabled={busyId === r.id} onChange={(v) => toggle(r.id, "featured", v)} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{r.order}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link href={`/admin/items/${r.id}`} className="text-sm font-semibold text-marigold-deep hover:underline mr-4">
                        Edit
                      </Link>
                      <button onClick={() => remove(r.id, r.title)} className="text-sm text-live hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="md:hidden space-y-3">
            {catRows.map((r) => (
              <div key={r.id} className="bg-card border border-line rounded-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{r.title}</span>
                  <Link href={`/admin/items/${r.id}`} className="text-sm font-semibold text-marigold-deep">
                    Edit
                  </Link>
                </div>
                <div className="flex items-center gap-6 mb-3">
                  <label className="flex items-center gap-2 text-xs font-mono text-muted">
                    Live
                    <Toggle checked={r.live} disabled={busyId === r.id} onChange={(v) => toggle(r.id, "live", v)} />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-mono text-muted">
                    Featured
                    <Toggle checked={r.featured} disabled={busyId === r.id} onChange={(v) => toggle(r.id, "featured", v)} />
                  </label>
                </div>
                <button onClick={() => remove(r.id, r.title)} className="text-sm text-live">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {rows.length === 0 && <p className="text-muted">No items yet — add your first one below.</p>}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full relative transition-colors disabled:opacity-50 ${checked ? "bg-marigold" : "bg-line"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`}
      />
    </button>
  );
}
