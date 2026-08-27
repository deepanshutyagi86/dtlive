"use client";
import { useId, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { compressImage } from "@/lib/image-compress";

// The shared admin form primitives. Extracted so the settings sections and
// the item form use one set of styles and one label/input association
// rather than each re-inventing them — every label here carries htmlFor,
// which nothing in the admin panel had before.

export const INPUT_CLASS =
  "w-full px-3.5 py-2.5 text-sm bg-card border border-line rounded-[10px] placeholder-ink-soft focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  help,
  type = "text",
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  help?: string;
  type?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="mb-3">
      <label htmlFor={id} className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
        {label}
      </label>
      {rows ? (
        <textarea id={id} rows={rows} className={INPUT_CLASS} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type={type} className={INPUT_CLASS} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {help && <p className="text-[12px] text-muted mt-1.5 leading-relaxed">{help}</p>}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  help,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  help?: string;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <div className="mb-3">
      <label htmlFor={id} className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        className={INPUT_CLASS}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {help && <p className="text-[12px] text-muted mt-1.5 leading-relaxed">{help}</p>}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  const id = useId();
  return (
    <div className="mb-3">
      <label htmlFor={id} className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
        {label}
      </label>
      {help && <p className="text-[12px] text-muted mt-1.5 ml-6 leading-relaxed">{help}</p>}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  help?: string;
}) {
  const id = useId();
  return (
    <div className="mb-3">
      <label htmlFor={id} className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
        {label}
      </label>
      <select id={id} className={INPUT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && <p className="text-[12px] text-muted mt-1.5 leading-relaxed">{help}</p>}
    </div>
  );
}

/**
 * A URL field with an upload button beside it, plus a live preview. The
 * text field stays primary and always works — pasting a URL must keep
 * working — and upload is a second way to fill the same value.
 *
 * `pathPrefix` decides where the blob lands. The upload route branches on
 * that prefix to decide the allowed content types, so changing it here
 * changes what the server will accept.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  pathPrefix,
  sizeHint,
  help,
  previewClassName = "w-24 h-24",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  pathPrefix: string;
  sizeHint?: string;
  help?: string;
  previewClassName?: string;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const compressed = await compressImage(file);
      const pathname = `${pathPrefix}${crypto.randomUUID()}.${compressed.extension}`;
      const result = await upload(pathname, compressed.blob, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
        contentType: compressed.extension === "webp" ? "image/webp" : "image/jpeg",
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      setBroken(false);
      onChange(result.url);
    } catch (err: any) {
      setError(err?.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="mb-5">
      <label htmlFor={id} className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
        {label}
        {sizeHint && <span className="normal-case tracking-normal text-muted/80"> · {sizeHint}</span>}
      </label>
      <div className="flex gap-2 items-center">
        <input
          id={id}
          className={`${INPUT_CLASS} flex-1`}
          placeholder="Paste a URL, or upload"
          value={value}
          onChange={(e) => {
            setBroken(false);
            onChange(e.target.value);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="border border-line px-4 py-2.5 rounded-[10px] text-sm font-semibold whitespace-nowrap hover:border-ink transition-colors disabled:opacity-60"
        >
          {uploading ? `${progress}%` : "Upload"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />
      {help && <p className="text-[12px] text-muted mt-2 leading-relaxed">{help}</p>}
      {error && <p className="text-live-ink text-sm mt-2">{error}</p>}
      {value && (
        <div className="mt-3">
          {broken ? (
            <div className={`${previewClassName} rounded-[10px] border border-live-ink flex items-center justify-center text-[10.5px] text-live-ink font-mono text-center px-2`}>
              Broken link
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={value}
              src={value}
              alt=""
              className={`${previewClassName} object-contain bg-card rounded-[10px] border border-line`}
              onError={() => setBroken(true)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** A titled group of repeatable rows with add/remove, used by nav, coupons, FAQ, etc. */
export function Repeater<T>({
  items,
  onChange,
  addLabel,
  blank,
  render,
  emptyHint,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  addLabel: string;
  blank: () => T;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  emptyHint?: string;
}) {
  return (
    <div>
      {items.length === 0 && emptyHint && <p className="text-[13px] text-muted mb-3">{emptyHint}</p>}
      {items.map((item, i) => (
        <div key={i} className="bg-card border border-line rounded-card p-4 mb-3">
          <div className="flex justify-between items-start gap-3 mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">#{i + 1}</span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => {
                  const next = [...items];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}
                className="px-2 text-muted hover:text-ink disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={i === items.length - 1}
                onClick={() => {
                  const next = [...items];
                  [next[i + 1], next[i]] = [next[i], next[i + 1]];
                  onChange(next);
                }}
                className="px-2 text-muted hover:text-ink disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="px-2 text-live-ink hover:underline"
              >
                ×
              </button>
            </div>
          </div>
          {render(item, (patch) => {
            const next = [...items];
            next[i] = { ...next[i], ...patch };
            onChange(next);
          }, i)}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, blank()])} className="text-sm font-semibold text-marigold-ink">
        + {addLabel}
      </button>
    </div>
  );
}

/** One-per-line textarea backed by a string[]. */
export function LinesField({
  label,
  value,
  onChange,
  help,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  help?: string;
  rows?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        className={`${INPUT_CLASS} leading-6`}
        // Split on save rather than on every keystroke would lose a
        // trailing blank line mid-typing; splitting here and filtering only
        // on read keeps the cursor where the admin put it.
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
      {help && <p className="text-[12px] text-muted mt-1.5 leading-relaxed">{help}</p>}
    </div>
  );
}

/**
 * PDF picker for a single file, used by the per-item syllabus.
 *
 * Deliberately NOT a generalised file input: the pathname prefix is what
 * unlocks application/pdf on /api/admin/upload, so the prefix is a required
 * prop and the accept/contentType are fixed. Anything else keeps the
 * route's image-only rules, which is the point.
 */
export function PdfUploadField({
  label,
  value,
  fileName,
  onChange,
  pathPrefix,
  help,
}: {
  label: string;
  value: string;
  fileName?: string;
  onChange: (v: { url: string; fileName: string } | null) => void;
  pathPrefix: string;
  help?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      // Random name, original kept only for display: two items with a
      // "syllabus.pdf" would otherwise collide in the blob store, and the
      // uploader's own filename is not something to put in a public URL.
      const result = await upload(`${pathPrefix}${crypto.randomUUID()}.pdf`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
        contentType: "application/pdf",
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      onChange({ url: result.url, fileName: file.name });
    } catch (err: any) {
      setError(err?.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="mb-5">
      <label htmlFor={id} className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        <button
          id={id}
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="bg-ink text-bone px-4 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-marigold hover:text-ink transition-colors disabled:opacity-50"
        >
          {uploading ? `Uploading… ${progress}%` : value ? "Replace PDF" : "Upload PDF"}
        </button>
        {value && (
          <>
            <a
              href={value}
              target="_blank"
              rel="noopener"
              className="font-mono text-[11px] text-muted hover:text-ink transition-colors truncate max-w-[220px]"
            >
              {fileName || "syllabus.pdf"}
            </a>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="font-mono text-[11px] text-muted hover:text-live-ink transition-colors"
            >
              Remove
            </button>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so picking the same file twice still fires onChange.
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />
      {error && <p className="text-[12px] text-live-ink mt-1.5">{error}</p>}
      {help && <p className="text-[12px] text-muted mt-1.5 leading-relaxed">{help}</p>}
    </div>
  );
}
