import Image from "next/image";

// The blocks that answer "why should I believe any of this" — the half of
// an ad landing page that has nothing to do with the offer and everything
// to do with whether a stranger acts on it.
//
// Each renders nothing at all when its content is empty, so a page that
// hasn't been filled in yet is short rather than skeletal.

export interface AdTheme {
  sub: string;
  muted: string;
  panel: string;
  line: string;
  chip: string;
  /** Plain `marigold` reads well on the dark surface but fails contrast
   *  against a light one — these are already the theme-safe variant,
   *  picked by the page. Never hardcode `text-marigold` in this file. */
  accent: string;
  accentBorder: string;
}

export function ProofChips({ points, t }: { points: string[]; t: AdTheme }) {
  if (points.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-6">
      {points.map((point, i) => (
        <span key={i} className={`font-mono text-[11.5px] px-3.5 py-2 border rounded-full ${t.chip}`}>
          {point}
        </span>
      ))}
    </div>
  );
}

export function ForWho({ forWho, notForWho, t }: { forWho: string[]; notForWho: string[]; t: AdTheme }) {
  if (forWho.length === 0 && notForWho.length === 0) return null;
  return (
    <section className="mt-14 grid md:grid-cols-2 gap-6">
      {forWho.length > 0 && (
        <div className={`border rounded-card p-6 ${t.line}`}>
          <h2 className="font-display font-bold text-[19px] tracking-tight mb-4">This is for you if</h2>
          <ul className="flex flex-col gap-2.5">
            {forWho.map((line, i) => (
              <li key={i} className="flex gap-2.5 text-[16px] leading-relaxed">
                <span aria-hidden className={`${t.accent} font-bold shrink-0`}>
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Saying who it ISN'T for is not modesty — a refund costs more than
          the sale earned, and the people it filters out were never going
          to be happy. */}
      {notForWho.length > 0 && (
        <div className={`border rounded-card p-6 ${t.line}`}>
          <h2 className="font-display font-bold text-[19px] tracking-tight mb-4">It&apos;s not for you if</h2>
          <ul className="flex flex-col gap-2.5">
            {notForWho.map((line, i) => (
              <li key={i} className={`flex gap-2.5 text-[16px] leading-relaxed ${t.sub}`}>
                <span aria-hidden className="shrink-0">
                  ✕
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function Agenda({ items, t }: { items: { time?: string; title: string }[]; t: AdTheme }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-5">What we&apos;ll actually do</h2>
      <ol className={`border-t ${t.line}`}>
        {items.map((entry, i) => (
          <li key={i} className={`flex gap-4 py-4 border-b ${t.line}`}>
            <span className={`font-mono text-[12px] shrink-0 w-[74px] pt-1 ${t.muted}`}>
              {entry.time || `${String(i + 1).padStart(2, "0")}`}
            </span>
            <span className="text-[17px] leading-relaxed">{entry.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Teacher({
  name,
  note,
  avatarUrl,
  t,
}: {
  name: string;
  note: string;
  avatarUrl?: string;
  t: AdTheme;
}) {
  if (!name) return null;
  return (
    <section className={`mt-14 border rounded-card p-6 md:p-7 ${t.panel}`}>
      <p className={`font-mono text-[10.5px] uppercase tracking-wider mb-4 ${t.muted}`}>Who&apos;s teaching</p>
      <div className="flex items-start gap-5">
        {avatarUrl && (
          <div className="relative w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full overflow-hidden shrink-0">
            <Image src={avatarUrl} alt={name} fill sizes="88px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display font-extrabold text-[21px] tracking-tight">{name}</p>
          {note && <p className={`text-[16px] leading-relaxed mt-2 ${t.sub}`}>{note}</p>}
        </div>
      </div>
    </section>
  );
}

export function Testimonials({
  items,
  t,
}: {
  items: { quote: string; who: string }[];
  t: AdTheme;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-5">What people said</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((entry, i) => (
          <figure key={i} className={`border rounded-card p-5 ${t.line}`}>
            <blockquote className="text-[16px] leading-relaxed">&ldquo;{entry.quote}&rdquo;</blockquote>
            <figcaption className={`font-mono text-[11.5px] mt-3 ${t.muted}`}>— {entry.who}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function Guarantee({ text, t }: { text: string; t: AdTheme }) {
  if (!text) return null;
  // Deliberately the loudest non-CTA block on the page. At a low ticket
  // price the money is not what stops someone — the fear of wasting an
  // evening is, and this is the sentence that removes it.
  return (
    <section className={`mt-14 border-2 rounded-card p-6 md:p-7 ${t.panel} ${t.accentBorder}`}>
      <p className={`font-mono text-[10.5px] uppercase tracking-wider mb-3 ${t.accent}`}>My promise</p>
      <p className="text-[17px] md:text-[18px] leading-relaxed">{text}</p>
    </section>
  );
}

/** UPI and card marks by the button. "Secured by Razorpay" in 10px grey
 *  does very little on its own, and in India the payment method someone
 *  recognises is a bigger reassurance than the gateway's name. */
export function PaymentMarks({ t }: { t: AdTheme }) {
  return (
    <div className={`flex items-center justify-center gap-2 flex-wrap mt-3 ${t.muted}`}>
      {["UPI", "VISA", "Mastercard", "RuPay", "NetBanking"].map((mark) => (
        <span key={mark} className={`font-mono text-[10px] px-2 py-1 border rounded ${t.chip}`}>
          {mark}
        </span>
      ))}
    </div>
  );
}
