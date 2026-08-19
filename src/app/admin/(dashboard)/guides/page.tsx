import GuidesManager from "./GuidesManager";

export const dynamic = "force-dynamic";

export default function AdminGuidesPage() {
  return (
    <div>
      <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">Free downloads</p>
      <h1 className="font-display font-extrabold text-3xl tracking-tight mb-2">Guides</h1>
      <p className="text-ink-soft text-[15px] mb-8">
        PDFs shown at <span className="font-mono text-[13px]">deepanshutyagi.live/guide</span>. Upload a file, give it a
        title, hit Save — it&apos;s live instantly, no deploy needed.
      </p>
      <GuidesManager />
    </div>
  );
}
