"use client";
import { useState } from "react";

export interface LeadRow {
  id: string;
  name: string;
  contact: string;
  message: string | null;
  status: "new" | "contacted" | "closed";
  createdAt: string;
  item: { title: string } | null;
}

export default function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [rows, setRows] = useState(leads);

  async function setStatus(id: string, status: LeadRow["status"]) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  if (rows.length === 0) return <p className="text-muted">No leads yet.</p>;

  return (
    <div className="space-y-3">
      {rows.map((lead) => (
        <div key={lead.id} className="bg-card border border-line rounded-card p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <div className="font-semibold">{lead.name} <span className="text-muted font-normal">· {lead.contact}</span></div>
            {lead.item && <div className="text-xs text-marigold-deep font-mono mt-1">re: {lead.item.title}</div>}
            {lead.message && <div className="text-sm text-ink-soft mt-1.5 max-w-md">{lead.message}</div>}
            <div className="text-xs text-muted font-mono mt-1">{new Date(lead.createdAt).toLocaleString("en-IN")}</div>
          </div>
          <select
            value={lead.status}
            onChange={(e) => setStatus(lead.id, e.target.value as LeadRow["status"])}
            className="px-3 py-2 text-sm bg-bone border border-line rounded-[10px] md:w-40 focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      ))}
    </div>
  );
}
