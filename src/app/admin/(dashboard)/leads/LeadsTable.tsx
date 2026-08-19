"use client";
import { useState } from "react";
import { SITE_TZ } from "@/lib/dates";

export interface LeadRow {
  id: string;
  name: string;
  contact: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  answers: Record<string, string> | null;
  status: "new" | "contacted" | "closed";
  createdAt: string;
  item: { title: string } | null;
}

// Best-effort WhatsApp deep link: every phone number seen in this app so far
// is a bare 10-digit Indian mobile with no country code, so we assume +91.
// wa.me needs the full international digits to resolve a chat — a bare
// 10-digit number won't. Falls back to null (no WhatsApp link shown) for
// anything that doesn't look like that shape, rather than guessing wrong.
function whatsAppLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `https://wa.me/91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `https://wa.me/${digits}`;
  return null;
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
      {rows.map((lead) => {
        const wa = lead.phone ? whatsAppLink(lead.phone) : null;
        const answerEntries = lead.answers ? Object.entries(lead.answers) : [];

        return (
        <div key={lead.id} className="bg-card border border-line rounded-card p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <div className="font-semibold">{lead.name}</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="text-marigold-deep hover:underline">
                  {lead.email}
                </a>
              )}
              {lead.phone && (
                <span className="flex items-center gap-2">
                  <a href={`tel:${lead.phone}`} className="text-marigold-deep hover:underline">
                    {lead.phone}
                  </a>
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener" className="text-xs font-mono text-muted hover:text-marigold-deep">
                      (WhatsApp)
                    </a>
                  )}
                </span>
              )}
            </div>
            {lead.item && <div className="text-xs text-marigold-deep font-mono mt-1">re: {lead.item.title}</div>}
            {lead.message && <div className="text-sm text-ink-soft mt-1.5 max-w-md">{lead.message}</div>}
            {answerEntries.length > 0 && (
              <div className="text-xs text-ink-soft mt-1.5 space-y-0.5">
                {answerEntries.map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted font-mono uppercase">{key}:</span> {value}
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-muted font-mono mt-1">{new Date(lead.createdAt).toLocaleString("en-IN", { timeZone: SITE_TZ })}</div>
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
        );
      })}
    </div>
  );
}
