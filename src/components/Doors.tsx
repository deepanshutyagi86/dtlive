import Link from "next/link";

const DOORS: { name: string; href: string; sub: string; key: string }[] = [
  { name: "Courses", href: "/courses", key: "course", sub: "Self-paced business & tech courses. Pay once, learn forever." },
  { name: "Workshops", href: "/workshops", key: "workshop", sub: "Live, hands-on sessions. Real dates, limited seats." },
  { name: "Agency", href: "/agency", key: "agency", sub: "Websites, apps and growth — done for your business." },
  { name: "Shop", href: "/shop", key: "shop", sub: "Everywhere my brands sell — Amazon, Flipkart, Meesho & our own stores." },
  { name: "Ventures", href: "/ventures", key: "venture", sub: "The businesses I hold equity in and build every day." },
];

export default function Doors({ counts }: { counts: Record<string, number> }) {
  return (
    <section className="max-w-[1200px] mx-auto px-5 pt-20 pb-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">Pick a door</p>
      {DOORS.map((d, i) => {
        const n = counts[d.key] ?? 0;
        return (
          <Link
            key={d.name}
            href={d.href}
            className={`group block relative overflow-hidden py-6 px-2 border-t border-ink ${
              i === DOORS.length - 1 ? "border-b" : ""
            }`}
          >
            <span className="absolute inset-0 bg-ink translate-y-full transition-transform duration-300 ease-[cubic-bezier(.7,0,.2,1)] group-hover:translate-y-0 z-[1]" />
            <div className="relative z-[2] flex items-baseline justify-between gap-4">
              <span className="font-display font-semibold text-[30px] md:text-[60px] tracking-[-0.02em] leading-none transition-transform duration-300 group-hover:translate-x-3.5 group-hover:text-bone">
                {d.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted transition-colors group-hover:text-marigold">
                {n ? `${String(n).padStart(2, "0")} live` : "soon"}
              </span>
            </div>
            <div className="relative z-[2] mt-1.5 text-[15px] leading-6 text-muted max-h-0 opacity-0 overflow-hidden transition-all duration-300 group-hover:max-h-11 group-hover:opacity-100 group-hover:text-[#b9b8ae] hidden md:block">
              {d.sub}
            </div>
          </Link>
        );
      })}
    </section>
  );
}
