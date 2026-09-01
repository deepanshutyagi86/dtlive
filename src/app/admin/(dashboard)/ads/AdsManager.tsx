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
import { normaliseAdPage } from "@/lib/admin-normalise";

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

  // The site's saved testimonials, so each ad page can tick the ones that
  // fit its offer rather than retyping them.
  const [testimonials, setTestimonials] = useState<{ quote: string; who: string }[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const stored = (d.adPages ?? {}) as Partial<AdPagesSettings>;
        const loaded: AdPagesSettings = {
          ...DEFAULT_AD_PAGES,
          ...stored,
          pages: Array.isArray(stored.pages) ? stored.pages.map(normaliseAdPage) : [],
        };
        setSettings(loaded);
        setSavedJson(JSON.stringify(loaded));
        setTestimonials(Array.isArray(d.testimonials) ? d.testimonials : []);
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
    // Same normaliser as the load path, so a new page and a loaded page
    // can never be different shapes.
    const page = normaliseAdPage({
      id: crypto.randomUUID(),
      // Off until deliberately switched on. A half-written page must not
      // be reachable — and must not be sellable — the moment it is saved.
      enabled: false,
      itemId: items[0]?.id ?? "",
      kind: "paid",
    });
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
            testimonials={testimonials}
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
  testimonials,
}: {
  page: AdPage;
  items: ItemOption[];
  open: boolean;
  onToggleOpen: () => void;
  onPatch: (p: Partial<AdPage>) => void;
  onDelete: () => void;
  testimonials: { quote: string; who: string }[];
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

          <hr className="border-line my-6" />
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Proof</p>
          <p className="text-[13px] text-muted mb-5 leading-relaxed">
            Someone off an ad has known you for about eleven seconds and is being asked for card details. Without
            proof and a face, urgency alone reads as a scam. This is the half of the page that earns the click.
          </p>

          <LinesField
            label="Proof points — one per line"
            value={page.proofPoints}
            onChange={(v) => onPatch({ proofPoints: v })}
            rows={4}
            placeholder={"100+ students taught\n15+ websites shipped\nApps live on the Play Store"}
            help="Short, checkable, shown as chips near the top."
          />

          <Toggle
            label="Show the “who's teaching” block"
            checked={page.showTeacher !== false}
            onChange={(v) => onPatch({ showTeacher: v })}
            help="Your name and photo from Appearance → Bio. Cold traffic buys the person before the workshop."
          />
          {page.showTeacher !== false && (
            <TextField
              label="Credentials line"
              value={page.teacherNote ?? ""}
              onChange={(v) => onPatch({ teacherNote: v })}
              rows={2}
              placeholder="Blank uses your site bio."
            />
          )}

          <div className="mb-5">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
              Testimonials to show
            </p>
            {testimonials.length === 0 ? (
              <p className="text-[13px] text-muted leading-relaxed">
                None saved yet. Add them in Appearance → Testimonials and they&apos;ll appear here to pick from.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  {testimonials.map((entry, i) => (
                    <label key={i} className="flex gap-2.5 items-start text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0"
                        checked={page.testimonialPicks.includes(i)}
                        onChange={(e) =>
                          onPatch({
                            testimonialPicks: e.target.checked
                              ? [...page.testimonialPicks, i]
                              : page.testimonialPicks.filter((n) => n !== i),
                          })
                        }
                      />
                      <span className="leading-snug">
                        <span className="text-ink-soft">&ldquo;{entry.quote.slice(0, 90)}&rdquo;</span>
                        <span className="block font-mono text-[11px] text-muted">— {entry.who}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-[12px] text-muted mt-2 leading-relaxed">
                  Picked by position in that list — so if you reorder or delete testimonials in Appearance, come
                  back and re-check these.
                </p>
              </>
            )}
          </div>

          <hr className="border-line my-6" />
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Reasons not to worry</p>

          <TextField
            label="Your promise (risk reversal)"
            value={page.guarantee ?? ""}
            onChange={(v) => onPatch({ guarantee: v })}
            rows={3}
            placeholder="Can't make it live? You get the recording. Not useful? Message me and I'll refund it, no questions."
            help="At a low price the money isn't the barrier — wasting an evening is. This is the line that removes it, and it costs you almost nothing."
          />

          <div className="grid md:grid-cols-2 gap-4">
            <LinesField
              label="This is for you if — one per line"
              value={page.forWho}
              onChange={(v) => onPatch({ forWho: v })}
              rows={4}
              placeholder={"You've never written a line of code\nYou want to ship, not to study"}
            />
            <LinesField
              label="It's not for you if — one per line"
              value={page.notForWho}
              onChange={(v) => onPatch({ notForWho: v })}
              rows={4}
              placeholder={"You already build production apps\nYou want a certificate, not a skill"}
              help="Filtering people out is worth more than the sale — a refund costs more than it earned."
            />
          </div>

          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
            What happens in the session
          </p>
          <Repeater
            items={page.agenda}
            onChange={(v) => onPatch({ agenda: v })}
            addLabel="Add a step"
            emptyHint="No agenda yet. People buying a live session want to know how the time is spent."
            blank={() => ({ time: "", title: "" })}
            render={(a, update) => (
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <TextField label="Time" value={a.time ?? ""} onChange={(v) => update({ time: v })} placeholder="0–15 min" />
                <TextField label="What" value={a.title} onChange={(v) => update({ title: v })} placeholder="Set up your first project" />
              </div>
            )}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Line under the button"
              value={page.formNote ?? ""}
              onChange={(v) => onPatch({ formNote: v })}
              placeholder="We'll send the joining link on WhatsApp."
              help="Say why you want a phone number, before they wonder. An unexplained field reads as a data grab."
            />
            <div className="pt-6">
              <Toggle
                label="Show UPI / card marks"
                checked={page.showPaymentMarks !== false}
                onChange={(v) => onPatch({ showPaymentMarks: v })}
                help="A payment method someone recognises reassures more than the gateway's name."
              />
            </div>
          </div>

          <hr className="border-line my-6" />
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">After they pay</p>
          <p className="text-[13px] text-muted mb-5 leading-relaxed">
            The highest-leverage thing on this whole page, and it isn&apos;t on the page. Someone who joins the
            group turns up; someone who closes the tab forgets by the weekend — and turning up is where the money
            actually is.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="WhatsApp group link"
              value={page.groupUrl ?? ""}
              onChange={(v) => onPatch({ groupUrl: v })}
              placeholder="https://chat.whatsapp.com/…"
              help="Shown as the big button the second payment succeeds. Blank uses the item's own joining link."
            />
            <TextField
              label="Button wording"
              value={page.groupLabel ?? ""}
              onChange={(v) => onPatch({ groupLabel: v })}
              placeholder="Join the WhatsApp group"
            />
          </div>

          <hr className="border-line my-6" />
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Once it&apos;s over</p>
          <p className="text-[13px] text-muted mb-5 leading-relaxed">
            Your ads keep running for hours after a deadline and every one of those clicks is already paid for.
            Offer the next thing instead of a closed sign.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Headline once closed"
              value={page.expiredHeadline ?? ""}
              onChange={(v) => onPatch({ expiredHeadline: v })}
              placeholder="You just missed this one."
            />
            <TextField
              label="Button once closed"
              value={page.expiredCtaLabel ?? ""}
              onChange={(v) => onPatch({ expiredCtaLabel: v })}
              placeholder="Tell me about the next one"
            />
          </div>
          <TextField
            label="Body once closed"
            value={page.expiredBody ?? ""}
            onChange={(v) => onPatch({ expiredBody: v })}
            rows={2}
            placeholder="The next session is usually within a fortnight — leave your number and I'll tell you first."
          />
          <TextField
            label="Where that button goes"
            value={page.expiredCtaHref ?? ""}
            onChange={(v) => onPatch({ expiredCtaHref: v })}
            placeholder="https://chat.whatsapp.com/…  or  /workshops"
            help="No link means no button — just the message."
          />

          <hr className="border-line my-6" />
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
