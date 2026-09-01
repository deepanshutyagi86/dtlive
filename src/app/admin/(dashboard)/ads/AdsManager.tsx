"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ImageUploadField,
  LinesField,
  Repeater,
  SelectField,
  TextField,
  Toggle,
  VideoUploadField,
} from "@/components/admin/AdminFields";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import { DEFAULT_AD_PAGES, type AdPage, type AdPagesSettings } from "@/lib/settings-types";

interface ItemOption {
  id: string;
  title: string;
  category: string;
  price: number | null;
}

// Draft-and-save from the start. The /live panel learned this the hard
// way: saving on every keystroke puts a network round trip between one
// letter and the next and the page visibly jitters as you type. Nothing
// on an ad page needs to change mid-sentence the way a webinar reveal
// does, so everything here waits for Save.
export default function AdsManager({ items }: { items: ItemOption[] }) {
  const [settings, setSettings] = useState<AdPagesSettings | null>(null);
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const loaded = { ...DEFAULT_AD_PAGES, ...(d.adPages ?? {}) };
        setSettings(loaded);
        setSavedJson(JSON.stringify(loaded));
      })
      .catch(() => setError("Could not load. Reload the page."));
  }, []);

  const dirty = settings !== null && savedJson !== null && JSON.stringify(settings) !== savedJson;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(next: AdPagesSettings) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adPages: next }),
      });
      if (!res.ok) throw new Error();
      setSavedJson(JSON.stringify(next));
      setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setError("Save failed. Check your connection and click again — nothing was changed.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <p className="text-sm text-muted">Loading…</p>;

  const patch = (id: string, p: Partial<AdPage>) =>
    setSettings({ ...settings, pages: settings.pages.map((x) => (x.id === id ? { ...x, ...p } : x)) });

  function addPage() {
    const page: AdPage = {
      id: crypto.randomUUID(),
      slug: "",
      // Off until deliberately switched on. A half-written page must not
      // be reachable — and must not be sellable — the moment it is saved.
      enabled: false,
      headline: "",
      subheadline: "",
      itemId: items[0]?.id ?? "",
      kind: "paid",
      ctaLabel: "",
      bullets: [],
      faq: [],
    };
    setSettings({ ...settings!, pages: [page, ...settings!.pages] });
    setOpenId(page.id);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight">Ad pages</h1>
          <p className="text-[13px] text-muted mt-1">
            One-offer pages at /w/… built for cold traffic off a paid ad. No menu, no links out, one button.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted">
            {saving ? "saving…" : dirty ? "unsaved changes" : savedAt ? `saved ${savedAt}` : ""}
          </span>
          <button
            onClick={() => save(settings)}
            disabled={!dirty || saving}
            className="bg-ink text-bone px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-marigold hover:text-ink transition-colors disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-bone"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={addPage}
            className="border border-line px-4 py-2.5 rounded-full font-semibold text-[13px] hover:border-ink transition-colors"
          >
            + New page
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-5 border border-live text-live-ink bg-live/5 rounded-lg px-4 py-3 text-sm font-semibold">
          {error}
        </p>
      )}

      {settings.pages.length === 0 && (
        <p className="text-sm text-muted border border-dashed border-line rounded-card px-5 py-8 text-center">
          No ad pages yet.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {settings.pages.map((page) => (
          <PageCard
            key={page.id}
            page={page}
            items={items}
            open={openId === page.id}
            onToggleOpen={() => setOpenId(openId === page.id ? null : page.id)}
            onPatch={(p) => patch(page.id, p)}
            onDelete={() => setSettings({ ...settings, pages: settings.pages.filter((x) => x.id !== page.id) })}
          />
        ))}
      </div>
    </div>
  );
}

function PageCard({
  page,
  items,
  open,
  onToggleOpen,
  onPatch,
  onDelete,
}: {
  page: AdPage;
  items: ItemOption[];
  open: boolean;
  onToggleOpen: () => void;
  onPatch: (p: Partial<AdPage>) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = items.find((i) => i.id === page.itemId);
  const effectivePrice = page.price !== undefined ? page.price : item?.price ?? null;
  const paidButFree = page.kind === "paid" && (effectivePrice === null || effectivePrice <= 0);

  return (
    <div className="border border-line rounded-card bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-line">
        <button onClick={onToggleOpen} className="font-display font-bold text-[16px] text-left flex-1 min-w-0">
          {page.headline || <span className="text-muted">Untitled page</span>}
          <span className="block font-mono text-[11px] text-muted font-normal">
            {page.slug ? `/w/${page.slug}` : "no address yet"} · {page.kind === "paid" ? "sells" : "registers"}
            {effectivePrice !== null && page.kind === "paid"
              ? ` · ₹${effectivePrice.toLocaleString("en-IN")}`
              : ""}
          </span>
        </button>
        <span
          className={`font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full ${
            page.enabled ? "bg-marigold" : "border border-line text-muted"
          }`}
        >
          {page.enabled ? "LIVE" : "OFF"}
        </span>
        {page.slug && (
          <Link
            href={`/admin/ads/${page.slug}`}
            className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-line hover:border-ink transition-colors"
          >
            WHO SIGNED UP
          </Link>
        )}
      </div>

      {open && (
        <div className="px-5 py-5">
          <Toggle
            label="Switch this page on"
            checked={page.enabled}
            onChange={(v) => onPatch({ enabled: v })}
            help="Off = /w/… returns Not Found, and nothing can be bought at this page's price. Nothing is deleted."
          />

          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Address (/w/…)"
              value={page.slug}
              onChange={(v) => onPatch({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              placeholder="claude-workshop"
              help="This is what goes in the ad. Changing it after a campaign orphans that campaign's history."
            />
            <SelectField
              label="What happens on click"
              value={page.kind}
              onChange={(v) => onPatch({ kind: v as AdPage["kind"] })}
              options={[
                { value: "paid", label: "Buy — take payment now" },
                { value: "register", label: "Register — collect name and number, free" },
              ]}
            />
          </div>

          <TextField
            label="Headline"
            value={page.headline}
            onChange={(v) => onPatch({ headline: v })}
            placeholder="Build a website with AI in one evening"
            help="Not the course's title. This answers 'why should I care', which is a different question from 'what is this'."
          />
          <TextField
            label="Sub-headline"
            value={page.subheadline}
            onChange={(v) => onPatch({ subheadline: v })}
            rows={2}
            placeholder="Live, 90 minutes, and you leave with something on the internet."
          />

          <div className="grid md:grid-cols-2 gap-4">
            <SelectField
              label="Which item"
              value={page.itemId}
              onChange={(v) => onPatch({ itemId: v })}
              options={items.map((i) => ({ value: i.id, label: `${i.title} (${i.category})` }))}
            />
            <TextField
              label="Button wording"
              value={page.ctaLabel}
              onChange={(v) => onPatch({ ctaLabel: v })}
              placeholder={page.kind === "paid" ? "Get instant access" : "Save my seat"}
            />
          </div>

          {page.kind === "paid" && (
            <div className="grid md:grid-cols-2 gap-4">
              <PriceField
                label="Ad price (₹)"
                value={page.price}
                onChange={(v) => onPatch({ price: v })}
                help={
                  item?.price != null
                    ? `Blank charges the item's normal ₹${item.price.toLocaleString("en-IN")}.`
                    : "Blank charges the item's normal price."
                }
              />
              <PriceField
                label="Struck-through price (₹)"
                value={page.strikePrice}
                onChange={(v) => onPatch({ strikePrice: v })}
                help="Shown crossed out. Hidden automatically if it isn't higher than what you charge."
              />
            </div>
          )}

          {paidButFree && (
            <p className="text-[12px] text-live-ink font-semibold mb-3">
              This is set to take payment but the price is zero. Give it a price, or switch it to Register.
            </p>
          )}

          <ImageUploadField
            label="Hero image"
            value={page.heroImageUrl ?? ""}
            onChange={(url) => onPatch({ heroImageUrl: url })}
            pathPrefix="branding/"
            sizeHint="16:9, around 1280 × 720"
            previewClassName="w-28 h-16"
          />

          {page.heroImageUrl && (
            <div className="mb-5">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
                Crop — drag to choose what stays in frame
              </p>
              <FocalPointPicker
                thumbnail={page.heroImageUrl}
                imageFocal={page.imageFocal}
                onChange={(focal) => onPatch({ imageFocal: focal })}
                aspectClassName="aspect-video"
              />
            </div>
          )}

          <TextField
            label="Video URL (optional)"
            value={page.videoUrl ?? ""}
            // Clears videoFileName: typing a URL replaces an uploaded
            // file, and a stale filename would leave the upload box
            // claiming to hold what no longer plays.
            onChange={(v) => onPatch({ videoUrl: v, videoFileName: undefined })}
            placeholder="https://www.youtube.com/watch?v=..."
            help="Adds a play button over the hero. For cold traffic a short video usually beats any amount of copy. YouTube Unlisted — never Private."
          />

          <VideoUploadField
            label="…or upload the file"
            value={page.videoFileName ? page.videoUrl ?? "" : ""}
            fileName={page.videoFileName}
            pathPrefix="promo/"
            onChange={(v) => onPatch({ videoUrl: v?.url ?? "", videoFileName: v?.fileName ?? undefined })}
            help="Up to 60MB — about 30 seconds at good quality. Uploaded video is served from this site and you pay bandwidth every time it plays, so anything longer belongs on YouTube."
          />

          <hr className="border-line my-6" />
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-3">Urgency &amp; framing</p>

          <div className="grid md:grid-cols-2 gap-4">
            <SelectField
              label="Look"
              value={page.theme ?? "dark"}
              onChange={(v) => onPatch({ theme: v as "dark" | "light" })}
              options={[
                { value: "dark", label: "Dark — the one built to convert" },
                { value: "light", label: "Light" },
              ]}
            />
            <TextField
              label="Pill above the headline"
              value={page.eyebrow ?? ""}
              onChange={(v) => onPatch({ eyebrow: v })}
              placeholder="EARLY BIRD"
              help="Blank shows no pill."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Date chip"
              value={page.dateLabel ?? ""}
              onChange={(v) => onPatch({ dateLabel: v })}
              placeholder="auto — from the workshop's date"
              help="Leave blank and it reads the item's own date, so it can never drift out of step with it."
            />
            <TextField
              label="Where chip"
              value={page.locationLabel ?? ""}
              onChange={(v) => onPatch({ locationLabel: v })}
              placeholder="auto — from the workshop's joining details"
            />
          </div>

          <TextField
            label="Price chip"
            value={page.priceChipLabel ?? ""}
            onChange={(v) => onPatch({ priceChipLabel: v })}
            placeholder="₹27 early bird"
            help="Blank builds one from the price."
          />

          <Toggle
            label="Show how many seats are left"
            checked={page.showSeats !== false}
            onChange={(v) => onPatch({ showSeats: v })}
            help="Reads the real remaining seats off the workshop, so the number falls as people actually buy. It hides itself when there is no real number behind it."
          />

          {page.showSeats !== false && (
            <PriceField
              label="Override the seat count"
              value={page.seatsOverride}
              onChange={(v) => onPatch({ seatsOverride: v })}
              help="Only for something with no seat tracking of its own. Blank is almost always right — a typed number stops being true the moment someone pays."
            />
          )}

          <LinesField
            label="What you get — one per line"
            value={page.bullets}
            onChange={(v) => onPatch({ bullets: v })}
            rows={5}
            placeholder={"A live 90-minute session\nThe recording, yours to keep\nThe exact prompts I use"}
            help="Concrete things they walk away with. Not features."
          />

          <div className="grid md:grid-cols-2 gap-4">
            <TextField label="Badge" value={page.badge ?? ""} onChange={(v) => onPatch({ badge: v })} placeholder="LIVE THIS SUNDAY" />
            <TextField
              label="Scarcity line"
              value={page.scarcity ?? ""}
              onChange={(v) => onPatch({ scarcity: v })}
              placeholder="100 seats"
              help="Only say it if it's true."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Closes at"
              value={page.deadlineIso ?? ""}
              onChange={(v) => onPatch({ deadlineIso: v })}
              type="datetime-local"
              help="Drives the big countdown AND stops the page selling when it passes. No date here means no countdown — which on an ad page is most of the urgency gone."
            />
            <TextField
              label="Line under the button"
              value={page.trustLine ?? ""}
              onChange={(v) => onPatch({ trustLine: v })}
              placeholder="Recording included · Secured by Razorpay"
            />
          </div>

          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">Questions</p>
          <Repeater
            items={page.faq}
            onChange={(v) => onPatch({ faq: v })}
            addLabel="Add question"
            emptyHint="No questions yet. The two or three that stop people buying are worth answering here."
            blank={() => ({ q: "", a: "" })}
            render={(f, update) => (
              <>
                <TextField label="Question" value={f.q} onChange={(v) => update({ q: v })} placeholder="Is the recording included?" />
                <TextField label="Answer" rows={3} value={f.a} onChange={(v) => update({ a: v })} />
              </>
            )}
          />

          <hr className="border-line my-6" />
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm">Delete this page?</span>
              <button onClick={onDelete} className="text-live-ink font-semibold text-sm underline">
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-muted underline">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-live-ink text-sm underline">
              Delete page
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** A price that can genuinely be absent — blank means "the item's normal
 *  price", zero means free, and the shared NumberField collapses the two
 *  by coercing an empty box to 0. Same reasoning as /live. */
function PriceField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  help?: string;
}) {
  return (
    <TextField
      label={label}
      value={value === undefined ? "" : String(value)}
      onChange={(raw) => {
        const trimmed = raw.trim();
        if (trimmed === "") return onChange(undefined);
        const n = Number(trimmed);
        onChange(Number.isFinite(n) && n >= 0 ? n : undefined);
      }}
      type="number"
      placeholder="—"
      help={help}
    />
  );
}
