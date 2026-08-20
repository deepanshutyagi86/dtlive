import Image from "next/image";
import type { BioSettings } from "@/lib/settings-types";
import { isOptimisableImage } from "@/lib/image-hosts";

// The one place the "who am I" copy lives. It used to be hardcoded inside
// the item detail page, which is how the ticker ended up claiming 100+
// students while this card claimed 500+ on the same site. One source,
// edited in /admin/settings → Bio.
export default function BioCard({ bio, heading = "Who's teaching" }: { bio: BioSettings; heading?: string }) {
  return (
    <section className="mt-14">
      <h2 className="font-display font-bold text-2xl tracking-tight mb-4">{heading}</h2>
      <div className="flex gap-4 items-start bg-card border border-line rounded-card p-[22px]">
        {bio.avatarUrl ? (
          <div className="relative w-16 h-16 rounded-full overflow-hidden flex-none border border-line">
            <Image
              src={bio.avatarUrl}
              alt={bio.name}
              fill
              sizes="64px"
              unoptimized={!isOptimisableImage(bio.avatarUrl)}
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-ink text-marigold flex items-center justify-center font-display font-extrabold text-xl flex-none">
            {initials(bio.name)}
          </div>
        )}
        <div>
          <b className="font-display text-[17px]">{bio.name}</b>
          {bio.role && <span className="block font-mono text-[11px] text-muted mt-0.5">{bio.role}</span>}
          <p className="text-[16px] leading-relaxed text-ink-soft mt-1.5">{bio.blurb}</p>
          {bio.portfolioUrl && (
            <a
              href={bio.portfolioUrl}
              target="_blank"
              rel="noopener"
              className="inline-block mt-3 font-mono text-[11px] uppercase tracking-wider text-marigold-ink hover:underline"
            >
              {bio.portfolioLabel || "Portfolio"} ↗
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
