"use client";
import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { compressImage } from "@/lib/image-compress";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import { slugify, formatBytes } from "@/lib/guide-utils";
import type { Guide } from "@/lib/guides";

const INPUT =
  "w-full bg-card border border-line rounded-[10px] px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors";
const BTN =
  "border border-line px-4 py-2.5 rounded-[10px] text-sm font-semibold whitespace-nowrap hover:border-ink transition-colors disabled:opacity-60";

function blankGuide(): Guide {
  return {
    id: crypto.randomUUID(),
    slug: "",
    title: "",
    description: "",
    fileUrl: "",
    fileName: "",
    fileSize: 0,
    cover: null,
    coverFocal: null,
    live: true,
    createdAt: new Date().toISOString(),
  };
}

export default function GuidesManager() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/guides")
      .then((r) => r.json())
      .then((data) => setGuides(Array.isArray(data) ? data : []))
      .catch(() => setError("Could not load guides."))
      .finally(() => setLoading(false));
  }, []);

  function mutate(next: Guide[]) {
    setGuides(next);
    setDirty(true);
    setSaved(false);
  }

  function patch(index: number, changes: Partial<Guide>) {
    mutate(guides.map((g, i) => (i === index ? { ...g, ...changes } : g)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= guides.length) return;
    const next = [...guides];
    [next[index], next[target]] = [next[target], next[index]];
    mutate(next);
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/guides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guides),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save.");
        return;
      }
      // The server owns slug derivation and de-duplication, so adopt what it
      // wrote rather than keeping the local guesses — otherwise the "public
      // link" shown under each row can disagree with the real URL.
      setGuides(Array.isArray(data) ? data : guides);
      setDirty(false);
      setSaved(true);
    } catch {
      setError("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted text-sm">Loading…</p>;

  return (
    <div className="max-w-[720px]">
      {guides.length === 0 && (
        <div className="border border-dashed border-line rounded-card p-8 text-center mb-5">
          <p className="font-display font-bold text-lg">No guides yet</p>
          <p className="text-muted text-sm mt-1">Add one, upload its PDF, and save.</p>
        </div>
      )}

      <div className="space-y-4">
        {guides.map((guide, i) => (
          <GuideRow
            key={guide.id}
            guide={guide}
            index={i}
            total={guides.length}
            onChange={(changes) => patch(i, changes)}
            onMove={(delta) => move(i, delta)}
            onRemove={() => mutate(guides.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <button type="button" className={BTN} onClick={() => mutate([...guides, blankGuide()])}>
          + Add guide
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="bg-ink text-bone px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-marigold hover:text-ink transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="font-mono text-[11px] uppercase tracking-wider text-marigold-ink">Saved ✓</span>}
        {dirty && !saving && <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Unsaved changes</span>}
      </div>

      {error && <p className="text-live-ink text-sm mt-3">{error}</p>}
    </div>
  );
}

function GuideRow({
  guide,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  guide: Guide;
  index: number;
  total: number;
  onChange: (changes: Partial<Guide>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const pdfRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<null | "pdf" | "cover">(null);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const publicSlug = guide.slug || slugify(guide.title);

  async function handlePdf(file: File) {
    setUploadError(null);
    setUploading("pdf");
    setProgress(0);
    try {
      // The pathname prefix is what unlocks application/pdf on the upload
      // route — it has to stay "guides/".
      const base = slugify(guide.title) || "guide";
      const result = await upload(`guides/${base}.pdf`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
        contentType: "application/pdf",
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      onChange({ fileUrl: result.url, fileName: file.name, fileSize: file.size });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setUploading(null);
      setProgress(0);
    }
  }

  async function handleCover(file: File) {
    setUploadError(null);
    setUploading("cover");
    setProgress(0);
    try {
      const compressed = await compressImage(file);
      const result = await upload(`items/${crypto.randomUUID()}.${compressed.extension}`, compressed.blob, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
        contentType: compressed.extension === "webp" ? "image/webp" : "image/jpeg",
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      onChange({ cover: result.url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setUploading(null);
      setProgress(0);
    }
  }

  return (
    <div className="border border-line rounded-card bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted mt-1">Guide {index + 1}</span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="border border-line w-8 h-8 rounded-[8px] text-sm hover:border-ink transition-colors disabled:opacity-30" aria-label="Move up">
            ↑
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="border border-line w-8 h-8 rounded-[8px] text-sm hover:border-ink transition-colors disabled:opacity-30" aria-label="Move down">
            ↓
          </button>
          <button type="button" onClick={onRemove} className="border border-line px-3 h-8 rounded-[8px] text-[13px] font-semibold text-live-ink hover:border-live transition-colors">
            Remove
          </button>
        </div>
      </div>

      <Label>Title</Label>
      <input value={guide.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="e.g. Motion Graphics Guide" className={INPUT} />

      <Label className="mt-4">Short description</Label>
      <textarea value={guide.description} onChange={(e) => onChange({ description: e.target.value })} rows={3} placeholder="One or two lines about what's inside." className={INPUT} />

      <Label className="mt-4">URL slug (leave blank to use the title)</Label>
      <input value={guide.slug} onChange={(e) => onChange({ slug: e.target.value })} placeholder={slugify(guide.title) || "motion-graphics-guide"} className={INPUT} />
      {publicSlug && (
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-mono text-[11px] text-muted truncate">deepanshutyagi.live/guide/{publicSlug}</span>
          <button
            type="button"
            className="font-mono text-[10.5px] uppercase tracking-wider text-marigold-ink hover:underline"
            onClick={() => {
              navigator.clipboard?.writeText(`https://deepanshutyagi.live/guide/${publicSlug}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      <Label className="mt-4">PDF file</Label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => pdfRef.current?.click()} disabled={uploading !== null} className={BTN}>
          {uploading === "pdf" ? `Uploading… ${progress}%` : guide.fileUrl ? "Replace PDF" : "Upload PDF"}
        </button>
        {guide.fileUrl ? (
          <a href={guide.fileUrl} target="_blank" rel="noopener" className="font-mono text-[11px] text-muted hover:text-ink transition-colors truncate max-w-[280px]">
            {guide.fileName || "file.pdf"}
            {guide.fileSize ? ` · ${formatBytes(guide.fileSize)}` : ""}
          </a>
        ) : (
          <span className="font-mono text-[11px] text-live-ink">No file yet — required</span>
        )}
      </div>
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handlePdf(file);
        }}
      />

      <Label className="mt-4">Cover image (optional)</Label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => coverRef.current?.click()} disabled={uploading !== null} className={BTN}>
          {uploading === "cover" ? `Uploading… ${progress}%` : guide.cover ? "Replace cover" : "Upload cover"}
        </button>
        {guide.cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={guide.cover} alt="Cover preview" className="w-16 h-16 object-cover rounded-[8px] border border-line" />
            <button type="button" onClick={() => onChange({ cover: null, coverFocal: null })} className="font-mono text-[10.5px] uppercase tracking-wider text-muted hover:text-live-ink transition-colors">
              Clear
            </button>
          </>
        )}
      </div>

      {guide.cover && (
        <div className="mt-4">
          <FocalPointPicker
            thumbnail={guide.cover}
            imageFocal={guide.coverFocal ?? undefined}
            onChange={(focal) => onChange({ coverFocal: focal ?? null })}
          />
        </div>
      )}
      <input
        ref={coverRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleCover(file);
        }}
      />

      {uploadError && <p className="text-live-ink text-sm mt-2">{uploadError}</p>}

      <label className="flex items-center gap-2.5 mt-5 cursor-pointer select-none">
        <input type="checkbox" checked={guide.live} onChange={(e) => onChange({ live: e.target.checked })} className="w-4 h-4 accent-marigold" />
        <span className="text-sm font-medium">Live — show it on /guide</span>
      </label>
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5 ${className}`}>{children}</label>;
}
