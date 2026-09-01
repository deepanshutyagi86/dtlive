import type { FaqEntry } from "@/lib/types";

// The sales blocks that live only on the item detail page, never on a
// card. A card has one job — get the click — and stuffing outcomes or an
// FAQ onto it would bury the title. Each block renders nothing at all when
// its field is empty, so an item saved before these existed looks exactly
// as it did.

// Array.isArray, not `?? []`. These come straight out of an item's
// `details` JSON blob, which is schemaless: a field stored as a string —
// by an older admin build, a hand edit, or an import — survives `??` and
// then throws on .map, taking the whole product page down.
function clean(list?: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
}

export function Outcomes({ items }: { items?: string[] }) {
  const list = clean(items);
  if (list.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="font-display font-bold text-2xl tracking-tight mb-4">What you&apos;ll walk away with</h2>
      <ul className="grid sm:grid-cols-2 gap-3">
        {list.map((o, i) => (
          <li key={i} className="flex gap-3 bg-card border border-line rounded-card p-4">
            <span aria-hidden className="font-display font-extrabold text-marigold-ink leading-none pt-0.5">
              &#10003;
            </span>
            <span className="text-[16px] leading-relaxed">{o}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WhoFor({ forWho, notForWho }: { forWho?: string[]; notForWho?: string[] }) {
  const fit = clean(forWho);
  const notFit = clean(notForWho);
  if (fit.length === 0 && notFit.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="font-display font-bold text-2xl tracking-tight mb-4">Who this is for</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {fit.length > 0 && (
          <div className="bg-card border border-line rounded-card p-[22px]">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-3">This is for you if</p>
            <ul className="flex flex-col gap-2.5">
              {fit.map((f, i) => (
                <li key={i} className="text-[15.5px] leading-relaxed flex gap-2.5">
                  <span aria-hidden className="text-marigold-ink">&rarr;</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Saying who it ISN'T for is not a hedge - it's the fastest way to
            make the right person feel seen, and it stops a refund request
            from someone who was never going to be happy. */}
        {notFit.length > 0 && (
          <div className="border border-dashed border-line rounded-card p-[22px]">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-3">Probably not, if</p>
            <ul className="flex flex-col gap-2.5">
              {notFit.map((f, i) => (
                <li key={i} className="text-[15.5px] leading-relaxed text-ink-soft flex gap-2.5">
                  <span aria-hidden className="text-muted">&middot;</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export function Faq({ items }: { items?: FaqEntry[] }) {
  // Same reason as clean() above — `details.faq` is schemaless JSON, so
  // "is it an array" is checked before anything is called on it.
  const list = (Array.isArray(items) ? items : []).filter(
    (f) => f && typeof f.q === "string" && f.q.trim() && typeof f.a === "string" && f.a.trim()
  );
  if (list.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="font-display font-bold text-2xl tracking-tight mb-4">Questions</h2>
      <div className="border-t border-ink">
        {list.map((f, i) => (
          <details key={i} className="border-b border-ink group">
            <summary className="flex items-center justify-between gap-3 py-4 px-1 cursor-pointer list-none font-display font-bold text-[17px]">
              {f.q}
              <span
                aria-hidden
                className="font-display font-bold text-xl text-marigold-deep transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="pb-4 px-1 text-[16px] leading-relaxed text-ink-soft max-w-[640px] whitespace-pre-line">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
