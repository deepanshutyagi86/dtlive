import Link from "next/link";
import { hasSourceColumn, listBySource } from "@/lib/admin-repo";
import { getLiveSettings } from "@/lib/site-settings";
import { liveSourceTag } from "@/lib/settings-types";
import { formatRupees } from "@/lib/tax";
import { SITE_TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SITE_TZ,
  });
}

export default async function LiveRegistrationsPage({ params }: { params: { slug: string } }) {
  const settings = await getLiveSettings();
  // Deliberately not liveSessionBySlug's null-on-disabled behaviour alone:
  // a webinar that has finished is usually switched off, and that is
  // exactly when you most want to look at who came.
  const session = settings.sessions.find((s) => s.slug === params.slug) ?? null;

  const [rows, columnReady] = await Promise.all([
    listBySource(liveSourceTag(params.slug)),
    hasSourceColumn(),
  ]);

  const paid = rows.filter((r) => r.kind === "order" && r.status === "paid");
  const revenuePaise = paid.reduce((sum, r) => sum + (r.amountPaise ?? 0), 0);

  return (
    <div>
      <Link href="/admin/live" className="font-mono text-[11px] text-muted hover:text-ink transition-colors">
        ← Live
      </Link>
      <h1 className="font-display font-extrabold text-3xl tracking-tight mt-2">
        {session?.title || params.slug}
      </h1>
      <p className="text-[13px] text-muted mt-1">
        Everyone who registered or bought from /live/{params.slug}.
      </p>

      {/* The empty table and the unrun migration look identical from the
          outside, and mistaking the second for the first reads as "nobody
          signed up" — which is the one wrong conclusion that would matter
          here. So it is said plainly. */}
      {!columnReady ? (
        <div className="mt-8 border border-marigold bg-marigold/10 rounded-card px-5 py-4">
          <p className="font-semibold text-[15px]">This isn&apos;t recording yet.</p>
          <p className="text-[14px] text-ink-soft mt-1.5 leading-relaxed">
            Registrations and payments from /live are being saved normally — but which webinar they came from
            isn&apos;t, because migration 002 hasn&apos;t been run. Paste the SQL from{" "}
            <span className="font-mono text-[13px]">docs/MIGRATIONS.md</span> into the Neon console and this page
            starts filling in within a few minutes. No deploy needed. Anyone who registers before then will not
            be tagged.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mt-8 mb-8">
            <Stat label="Registered" value={String(rows.filter((r) => r.kind === "lead").length)} />
            <Stat label="Paid" value={String(paid.length)} />
            <Stat label="Revenue" value={formatRupees(Math.round(revenuePaise / 100))} />
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted border border-dashed border-line rounded-card px-5 py-10 text-center">
              Nobody yet.
            </p>
          ) : (
            <div className="border border-line rounded-card overflow-x-auto bg-card">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-wider text-muted">
                    <th className="px-4 py-3">Who</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">What</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.kind}-${r.id}`} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-semibold">{r.name}</span>
                        <span
                          className={`ml-2 font-mono text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded ${
                            r.kind === "order" && r.status === "paid"
                              ? "bg-marigold"
                              : r.kind === "order"
                                ? "bg-line"
                                : "border border-line"
                          }`}
                        >
                          {r.kind === "order" ? r.status.toUpperCase() : "REGISTERED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {r.email}
                        {r.phone && <span className="block font-mono text-[12px]">{r.phone}</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{r.itemTitle ?? "—"}</td>
                      <td className="px-4 py-3 font-mono">
                        {r.amountPaise === null ? "—" : formatRupees(Math.round(r.amountPaise / 100))}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-muted">{when(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line rounded-card px-4 py-4 bg-card">
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted">{label}</p>
      <p className="font-display font-extrabold text-2xl tracking-tight mt-1">{value}</p>
    </div>
  );
}
