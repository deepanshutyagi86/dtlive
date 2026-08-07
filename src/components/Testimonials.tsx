export interface Testimonial {
  quote: string;
  who: string;
}

export default function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;
  return (
    <section className="max-w-[1200px] mx-auto px-5 pt-14 pb-5 grid md:grid-cols-3 gap-4">
      {items.map((t, i) => (
        <div key={i} className="border border-line bg-card rounded-card p-[22px] flex flex-col gap-3.5">
          <p className="text-[16px] leading-relaxed">
            <span className="font-display text-[26px] text-marigold-deep leading-none mr-0.5">&ldquo;</span>
            {t.quote}
          </p>
          <div className="font-mono text-[11px] text-muted tracking-wide">— {t.who}</div>
        </div>
      ))}
    </section>
  );
}
