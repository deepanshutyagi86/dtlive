"use client";
import { useEffect, useRef, useState } from "react";
import CheckoutModal from "@/components/CheckoutModal";
import RegisterModal from "@/components/RegisterModal";
import ItemImage from "@/components/ItemImage";
import type { PublicLiveBlock, PublicLiveSession } from "@/lib/live-public";
import type { TaxSettings } from "@/lib/settings-types";
import type { RegistrationField } from "@/lib/types";

// How often an open page re-asks what it should be showing. Ten seconds is
// the number that makes the reveal feel deliberate rather than broken:
// short enough that "it's on the page now" is true by the time the sentence
// after the pitch is finished, long enough that a room of a few hundred
// people is a trivial amount of traffic.
const POLL_MS = 10_000;

export default function LiveBoard({
  initial,
  tax,
  gstin,
  registrationFields,
}: {
  initial: PublicLiveSession;
  tax: TaxSettings;
  gstin: string;
  /** Per-item registration forms, keyed by item id, resolved on the server. */
  registrationFields: Record<string, RegistrationField[] | undefined>;
}) {
  const [session, setSession] = useState(initial);
  // Kept in a ref rather than state: it must not cause a re-render, and the
  // interval closes over it.
  const stopped = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let id: ReturnType<typeof setInterval>;

    async function poll() {
      if (stopped.current) return;
      try {
        const res = await fetch(`/api/live/${initial.slug}`, { cache: "no-store" });
        // A 404 means the session or the whole /live feature was switched
        // off while someone had the page open. Stop asking — retrying every
        // ten seconds forever would be the one way this page could become a
        // problem for the server rather than for the viewer. Clearing the
        // interval itself, not just the flag, so a tab left open on a
        // finished webinar doesn't keep a timer ticking forever.
        if (res.status === 404) {
          stopped.current = true;
          clearInterval(id);
          return;
        }
        if (!res.ok) return;
        const next = (await res.json()) as PublicLiveSession;
        if (!cancelled) setSession(next);
      } catch {
        // A dropped poll is not worth telling the viewer about — the page
        // keeps showing what it last knew, and the next tick recovers.
      }
    }

    id = setInterval(poll, POLL_MS);
    // Coming back to a backgrounded tab should not mean waiting out the
    // rest of an interval to find out the offer went up two minutes ago.
    function onVisible() {
      if (document.visibilityState === "visible") poll();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initial.slug]);

  if (session.blocks.length === 0) {
    return (
      <div className="border border-dashed border-ink/25 rounded-card px-6 py-14 text-center">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-live-ink">
          <span className="w-2 h-2 rounded-full bg-live live-dot" />
          NOTHING UP YET
        </span>
        <p className="text-[17px] text-ink-soft mt-3 max-w-[420px] mx-auto leading-relaxed">
          {session.holdingLine}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {session.blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          sessionSlug={session.slug}
          tax={tax}
          gstin={gstin}
          registrationFields={registrationFields[block.itemId]}
        />
      ))}
    </div>
  );
}

function BlockCard({
  block,
  sessionSlug,
  tax,
  gstin,
  registrationFields,
}: {
  block: PublicLiveBlock;
  sessionSlug: string;
  tax: TaxSettings;
  gstin: string;
  registrationFields?: RegistrationField[];
}) {
  const cta =
    "block w-full text-center bg-marigold border border-marigold text-ink font-semibold text-[16px] px-6 py-3.5 rounded-full hover:bg-ink hover:text-bone hover:border-ink transition-colors";

  return (
    <div className="border border-ink rounded-card overflow-hidden bg-card flex flex-col">
      {block.thumbnail !== null || block.kind !== "link" ? (
        <ItemImage
          thumbnail={block.thumbnail}
          title={block.title}
          category={block.category}
          seed={block.id}
          sizes="(max-width: 768px) 100vw, 50vw"
          imageFocal={block.imageFocal}
        />
      ) : null}

      <div className="p-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {block.badge && (
            <span className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-ink text-bone">
              {block.badge}
            </span>
          )}
          {block.deadlineIso && <Countdown deadlineIso={block.deadlineIso} />}
        </div>

        <h2 className="font-display font-extrabold text-[24px] tracking-tight leading-tight">{block.title}</h2>
        {block.blurb && <p className="text-[15px] leading-relaxed text-ink-soft mt-2">{block.blurb}</p>}

        {block.priceLabel && (
          <p className="flex items-baseline gap-2.5 mt-5">
            <span className="font-display font-extrabold text-[30px] tracking-tight">{block.priceLabel}</span>
            {block.strikeLabel && (
              <span className="font-mono text-[15px] text-muted line-through">{block.strikeLabel}</span>
            )}
          </p>
        )}

        {block.scarcity && <p className="font-mono text-[11px] text-live-ink mt-1.5">{block.scarcity}</p>}

        <div className="mt-auto pt-5">
          {block.kind === "link" && block.externalUrl ? (
            <a href={block.externalUrl} target="_blank" rel="noopener noreferrer" className={cta}>
              {block.ctaLabel}
            </a>
          ) : block.kind === "paid" ? (
            <CheckoutModal
              itemId={block.itemId}
              title={block.title}
              slug={block.itemSlug}
              category={block.category}
              thumbnail={block.thumbnail}
              imageFocal={block.imageFocal}
              priceLabel={block.priceLabel ?? ""}
              tax={tax}
              gstin={gstin}
              triggerClassName={cta}
              triggerLabel={block.ctaLabel}
              // Ids only. The server re-reads what this block costs.
              liveSession={sessionSlug}
              liveBlockId={block.id}
            />
          ) : (
            <RegisterModal
              itemId={block.itemId}
              title={block.title}
              slug={block.itemSlug}
              category={block.category}
              thumbnail={block.thumbnail}
              imageFocal={block.imageFocal}
              registrationFields={registrationFields}
              triggerClassName={cta}
              triggerLabel={block.ctaLabel}
              liveSession={sessionSlug}
              liveBlockId={block.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Rendered only after mount. A countdown computed during SSR is wrong by
// the time it reaches the browser and mismatches on hydration, so the
// first paint deliberately shows nothing.
function Countdown({ deadlineIso }: { deadlineIso: string }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(deadlineIso).getTime();
    if (Number.isNaN(target)) return;
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);

  if (left === null) return null;

  // At zero the card stays put until the next poll drops it — the server
  // is what decides a block is gone, not the browser's own clock.
  if (left === 0) {
    return <span className="font-mono text-[10px] font-bold tracking-wider text-muted">CLOSED</span>;
  }

  const total = Math.floor(left / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="font-mono text-[10px] font-bold tracking-wider text-live-ink" aria-live="off">
      {h > 0 ? `${pad(h)}:` : ""}
      {pad(m)}:{pad(s)} LEFT
    </span>
  );
}
