"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ImageUploadField, SelectField, TextField, Toggle } from "@/components/admin/AdminFields";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import { DEFAULT_LIVE, type LiveBlock, type LiveSession, type LiveSettings } from "@/lib/settings-types";
import { normaliseBlock, normaliseSession } from "@/lib/admin-normalise";

interface ItemOption {
  id: string;
  title: string;
  category: string;
  price: number | null;
}

export default function LiveManager({ items }: { items: ItemOption[] }) {
  // `settings` is a DRAFT. Typing changes it and nothing else — the earlier
  // version of this screen saved on every keystroke, which put a network
  // round trip and a re-render between one letter and the next and made the
  // whole page jitter as you typed.
  const [settings, setSettings] = useState<LiveSettings | null>(null);
  // What the server last confirmed, as JSON. Comparing against it is how
  // "are there unsaved changes" is answered without tracking a dirty flag
  // on every field by hand and eventually forgetting one.
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const stored = (d.live ?? {}) as Partial<LiveSettings>;
        const loaded: LiveSettings = {
          ...DEFAULT_LIVE,
          ...stored,
          sessions: Array.isArray(stored.sessions) ? stored.sessions.map(normaliseSession) : [],
        };
        setSettings(loaded);
        setSavedJson(JSON.stringify(loaded));
      })
      .catch(() => setError("Could not load. Reload the page."));
  }, []);

  const dirty = settings !== null && savedJson !== null && JSON.stringify(settings) !== savedJson;

  // Closing the tab with unsaved edits should cost a confirmation, not the
  // edits. Only armed while something is actually unsaved.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Draft-only. Nothing reaches the server until Save. */
  const edit = (next: LiveSettings) => setSettings(next);

  /**
   * Writes the WHOLE current draft, including any unsaved text edits.
   *
   * Used by the actions that must take effect the instant they are clicked:
   * revealing a block, choosing which session is /live, adding or deleting.
   * During a webinar a reveal has to be one click and done — asking someone
   * mid-sentence to then find a Save button is how an offer goes up four
   * minutes late.
   *
   * It saves the whole draft rather than just the one field on purpose:
   * saving a subset would mean an instant action silently discarded
   * whatever else was typed. The reveal row warns when that is about to
   * publish unsaved text along with the flag.
   */
  async function persist(next: LiveSettings) {
    setSettings(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ live: next }),
      });
      if (!res.ok) throw new Error();
      setSavedJson(JSON.stringify(next));
      setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      // Deliberately loud, and the draft is deliberately NOT reverted —
      // a silent failure here means the presenter says "it's on the page
      // now" to a room where it is not.
      setError("SAVE FAILED — the page did not change. Check your connection and click again.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  // Text edits are drafts; the reveal switches below call persist() directly.
  const patchSession = (id: string, patch: Partial<LiveSession>) =>
    edit({ ...settings, sessions: settings.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const patchSessionNow = (id: string, patch: Partial<LiveSession>) =>
    persist({ ...settings, sessions: settings.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  function addSession() {
    const session = normaliseSession({ id: crypto.randomUUID() });
    persist({ ...settings!, sessions: [session, ...settings!.sessions] });
    setOpenId(session.id);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight">Live</h1>
          <p className="text-[13px] text-muted mt-1">
            The webinar page at /live. Everything here changes the page for people who already have it open,
            within about ten seconds — they do not need to refresh.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted">
            {saving ? "saving…" : dirty ? "unsaved changes" : savedAt ? `saved ${savedAt}` : ""}
          </span>
          <button
            onClick={() => persist(settings)}
            disabled={!dirty || saving}
            className="bg-ink text-bone px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-marigold hover:text-ink transition-colors disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-bone"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-5 border border-live text-live-ink bg-live/5 rounded-lg px-4 py-3 text-sm font-semibold">
          {error}
        </p>
      )}

      <div className="border border-line rounded-card p-5 mb-6 bg-card">
        <Toggle
          label="Switch the /live page on"
          checked={settings.enabled}
          onChange={(v) => edit({ ...settings, enabled: v })}
          help="Off = /live and every /live/… address returns Not Found. Nothing is deleted."
        />
        <TextField
          label="What the page says before anything is revealed"
          value={settings.holdingLine}
          onChange={(v) => edit({ ...settings, holdingLine: v })}
          placeholder={DEFAULT_LIVE.holdingLine}
          help="Shown for as long as every block is still hidden — which is most of a webinar."
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg">Sessions</h2>
        <button
          onClick={addSession}
          className="bg-ink text-bone px-4 py-2 rounded-full font-semibold text-[13px] hover:bg-marigold hover:text-ink transition-colors"
        >
          + New session
        </button>
      </div>

      {settings.sessions.length === 0 && (
        <p className="text-sm text-muted border border-dashed border-line rounded-card px-5 py-8 text-center">
          No sessions yet. Make one for your next webinar.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {settings.sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            items={items}
            open={openId === session.id}
            onToggleOpen={() => setOpenId(openId === session.id ? null : session.id)}
            onPatch={(patch) => patchSession(session.id, patch)}
            onPatchNow={(patch) => patchSessionNow(session.id, patch)}
            dirty={dirty}
            onDelete={() =>
              persist({ ...settings, sessions: settings.sessions.filter((s) => s.id !== session.id) })
            }
            onMakeActive={() =>
              // Exactly one session can be the one /live resolves to, so
              // making one active clears the rest here rather than letting
              // "first active wins" quietly pick between two.
              persist({
                ...settings,
                sessions: settings.sessions.map((s) => ({ ...s, active: s.id === session.id })),
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  items,
  open,
  onToggleOpen,
  onPatch,
  onPatchNow,
  dirty,
  onDelete,
  onMakeActive,
}: {
  session: LiveSession;
  items: ItemOption[];
  open: boolean;
  onToggleOpen: () => void;
  /** Draft edit — waits for Save. */
  onPatch: (patch: Partial<LiveSession>) => void;
  /** Saves immediately. Only the reveal switches use this. */
  onPatchNow: (patch: Partial<LiveSession>) => void;
  /** True when the page has unsaved text edits, so the reveal row can say
   *  that flipping a switch will publish them too. */
  dirty: boolean;
  onDelete: () => void;
  onMakeActive: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function addBlock() {
    const block = normaliseBlock({
      id: crypto.randomUUID(),
      kind: "register",
      itemId: items[0]?.id ?? "",
    });
    onPatch({ blocks: [...session.blocks, block] });
  }

  const patchBlock = (id: string, patch: Partial<LiveBlock>) =>
    onPatch({ blocks: session.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

  /** The reveal switch, and only the reveal switch. */
  const revealBlock = (id: string, visible: boolean) =>
    onPatchNow({ blocks: session.blocks.map((b) => (b.id === id ? { ...b, visible } : b)) });

  return (
    <div className="border border-line rounded-card bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-line">
        <button onClick={onToggleOpen} className="font-display font-bold text-[16px] text-left flex-1 min-w-0">
          {session.title || <span className="text-muted">Untitled session</span>}
          <span className="block font-mono text-[11px] text-muted font-normal">
            {session.slug ? `/live/${session.slug}` : "no address yet"} · {session.blocks.length} block
            {session.blocks.length === 1 ? "" : "s"} ·{" "}
            {session.blocks.filter((b) => b.visible).length} showing
          </span>
        </button>

        {session.active ? (
          <span className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-marigold">
            THIS IS /LIVE
          </span>
        ) : (
          <button
            onClick={onMakeActive}
            className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-line hover:border-ink transition-colors"
          >
            MAKE IT /LIVE
          </button>
        )}

        {session.slug && (
          <Link
            href={`/admin/live/${session.slug}`}
            className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-line hover:border-ink transition-colors"
          >
            WHO REGISTERED
          </Link>
        )}
      </div>

      {/* The reveal row. Always visible, even with the editor collapsed —
          this is the control used DURING a webinar, and it should never be
          more than one click away from the top of the page. */}
      {session.blocks.length > 0 && (
        <div className="px-5 py-4 border-b border-line bg-bone">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-3">
            Reveal — flip one and it appears on every open page. Saves instantly.
          </p>
          {dirty && (
            <p className="text-[12px] text-live-ink font-semibold mb-3">
              You have unsaved edits — flipping a switch publishes those too.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {session.blocks.map((b) => (
              <button
                key={b.id}
                onClick={() => revealBlock(b.id, !b.visible)}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                  b.visible ? "bg-marigold border-marigold" : "bg-card border-line hover:border-ink"
                }`}
              >
                <span className="font-semibold text-[14px] truncate">
                  {b.headline || items.find((i) => i.id === b.itemId)?.title || "Untitled block"}
                </span>
                <span className="font-mono text-[10px] font-bold tracking-wider shrink-0">
                  {b.visible ? "SHOWING" : "HIDDEN"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="px-5 py-5">
          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Title"
              value={session.title}
              onChange={(v) => onPatch({ title: v })}
              placeholder="Build your first site with AI — live"
            />
            <TextField
              label="Address (/live/…)"
              value={session.slug}
              onChange={(v) => onPatch({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              placeholder="aug-31-ai"
              help="Lower-case, dashes. Changing this after a webinar orphans that session's registration history."
            />
          </div>

          <TextField
            label="Subtitle"
            value={session.subtitle}
            onChange={(v) => onPatch({ subtitle: v })}
            rows={2}
            placeholder="Ninety minutes. You'll leave with a page that's actually live."
          />

          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Starts at"
              value={session.startsAtIso ?? ""}
              onChange={(v) => onPatch({ startsAtIso: v })}
              type="datetime-local"
              help="Shown on the page. IST."
            />
            <TextField
              label="Join link (Zoom / YouTube)"
              value={session.joinUrl ?? ""}
              onChange={(v) => onPatch({ joinUrl: v })}
              placeholder="https://zoom.us/j/…"
            />
          </div>

          <ImageUploadField
            label="Banner image"
            value={session.heroImageUrl ?? ""}
            onChange={(url) => onPatch({ heroImageUrl: url })}
            pathPrefix="branding/"
            sizeHint="wide, 1600 × 700 or similar"
            previewClassName="w-28 h-16"
          />

          {session.heroImageUrl && (
            <div className="mb-5">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
                Crop — drag to choose what stays in frame
              </p>
              <FocalPointPicker
                thumbnail={session.heroImageUrl}
                imageFocal={session.imageFocal}
                onChange={(focal) => onPatch({ imageFocal: focal })}
                aspectClassName="aspect-[16/7]"
              />
            </div>
          )}

          <hr className="border-line my-6" />
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-[15px]">Blocks</h3>
            <button
              onClick={addBlock}
              className="border border-line px-3 py-1.5 rounded-full font-semibold text-[12px] hover:border-ink transition-colors"
            >
              + Add block
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {session.blocks.map((block) => (
              <BlockEditor
                key={block.id}
                block={block}
                items={items}
                onPatch={(patch) => patchBlock(block.id, patch)}
                onDelete={() => onPatch({ blocks: session.blocks.filter((b) => b.id !== block.id) })}
              />
            ))}
          </div>

          <hr className="border-line my-6" />
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm">Delete this session and its blocks?</span>
              <button onClick={onDelete} className="text-live-ink font-semibold text-sm underline">
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-muted underline">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-live-ink text-sm underline">
              Delete session
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BlockEditor({
  block,
  items,
  onPatch,
  onDelete,
}: {
  block: LiveBlock;
  items: ItemOption[];
  onPatch: (patch: Partial<LiveBlock>) => void;
  onDelete: () => void;
}) {
  const item = items.find((i) => i.id === block.itemId);
  const effectivePrice = block.overridePrice !== undefined ? block.overridePrice : item?.price ?? null;

  // A paid block with nothing to charge is dropped by the public page
  // rather than sending a buyer to a checkout that will refuse. Said here,
  // where it can still be fixed, instead of leaving a card mysteriously
  // absent mid-webinar.
  const paidButFree = block.kind === "paid" && (effectivePrice === null || effectivePrice <= 0);
  const strikeIsNotHigher =
    block.kind === "paid" &&
    block.strikePrice !== undefined &&
    effectivePrice !== null &&
    block.strikePrice <= effectivePrice;

  return (
    <div className="border border-line rounded-lg p-4">
      <div className="grid md:grid-cols-2 gap-4">
        <SelectField
          label="What happens on click"
          value={block.kind}
          onChange={(v) => onPatch({ kind: v as LiveBlock["kind"] })}
          options={[
            { value: "register", label: "Register — collect name and number, free" },
            { value: "paid", label: "Buy — take payment now" },
            { value: "link", label: "Link — send them somewhere else" },
          ]}
        />
        {block.kind === "link" ? (
          <TextField
            label="Link"
            value={block.externalUrl ?? ""}
            onChange={(v) => onPatch({ externalUrl: v })}
            placeholder="https://chat.whatsapp.com/…"
          />
        ) : (
          <SelectField
            label="Which item"
            value={block.itemId}
            onChange={(v) => onPatch({ itemId: v })}
            options={items.map((i) => ({ value: i.id, label: `${i.title} (${i.category})` }))}
          />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <TextField
          label="Headline on this page"
          value={block.headline ?? ""}
          onChange={(v) => onPatch({ headline: v })}
          placeholder={item?.title ?? "Overrides the item's own title"}
          help="Blank uses the item's title."
        />
        <TextField
          label="Button wording"
          value={block.ctaLabel ?? ""}
          onChange={(v) => onPatch({ ctaLabel: v })}
          placeholder={block.kind === "paid" ? "Get it now" : "Register free"}
        />
      </div>

      <TextField
        label="Blurb"
        value={block.blurb ?? ""}
        onChange={(v) => onPatch({ blurb: v })}
        rows={2}
        placeholder="Blank uses the item's own description."
      />

      {block.kind === "paid" && (
        <div className="grid md:grid-cols-2 gap-4">
          <OptionalPriceField
            label="Webinar price (₹)"
            value={block.overridePrice}
            onChange={(v) => onPatch({ overridePrice: v })}
            help={
              item?.price != null
                ? `Blank charges the item's normal ₹${item.price.toLocaleString("en-IN")}.`
                : "Blank charges the item's normal price."
            }
          />
          <OptionalPriceField
            label="Struck-through price (₹)"
            value={block.strikePrice}
            onChange={(v) => onPatch({ strikePrice: v })}
            help="Shown crossed out beside the price. Usually the normal price."
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <TextField
          label="Badge"
          value={block.badge ?? ""}
          onChange={(v) => onPatch({ badge: v })}
          placeholder="TODAY ONLY"
        />
        <TextField
          label="Scarcity line"
          value={block.scarcity ?? ""}
          onChange={(v) => onPatch({ scarcity: v })}
          placeholder="20 seats at this price"
          help="Only say it if it's true."
        />
      </div>

      <TextField
        label="Closes at"
        value={block.deadlineIso ?? ""}
        onChange={(v) => onPatch({ deadlineIso: v })}
        type="datetime-local"
        help="A countdown on this block alone. Set it when you reveal the block, not the night before — past deadlines stop it being sellable at all."
      />

      {paidButFree && (
        <p className="text-[12px] text-live-ink font-semibold mb-3">
          This is set to take payment but the price is zero, so it will not appear on the page. Give it a price,
          or change it to Register.
        </p>
      )}
      {strikeIsNotHigher && (
        <p className="text-[12px] text-live-ink font-semibold mb-3">
          The struck-through price isn&apos;t higher than what you&apos;re charging, so it will be hidden — a
          discount that isn&apos;t one costs you the room.
        </p>
      )}

      <button onClick={onDelete} className="text-live-ink text-[12px] underline">
        Remove block
      </button>
    </div>
  );
}

/**
 * A price that can genuinely be absent.
 *
 * The shared NumberField coerces an empty box to 0, and here those are two
 * different instructions: blank means "charge the item's normal price",
 * zero means "free". Collapsing them would turn a half-filled form into a
 * paid block at ₹0, which the public page then drops — an offer that
 * silently fails to appear during a webinar is the worst bug this feature
 * could have, so the distinction is kept at the input.
 */
function OptionalPriceField({
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
      // undefined -> "" is what keeps the box genuinely empty rather than
      // showing a 0 nobody typed.
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
