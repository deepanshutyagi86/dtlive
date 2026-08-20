import Link from "next/link";
import type { NavSettings } from "@/lib/settings-types";
import { DEFAULT_NAV } from "@/lib/settings-types";
import type { BioSettings } from "@/lib/settings-types";

export interface FooterLinks {
  whatsapp?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  email?: string;
}

// Every social button is optional and driven by /admin/settings →
// footerLinks. A blank field renders nothing at all, which is the whole
// point: turning a channel off is a settings edit, not a deploy.
const SOCIALS: { key: keyof FooterLinks; label: string }[] = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
];

export default function Footer({
  links,
  nav = DEFAULT_NAV,
  bio,
}: {
  links: FooterLinks;
  nav?: NavSettings;
  bio?: BioSettings;
}) {
  const explore = nav.links.filter((l) => l.show);

  return (
    <footer className="mt-[90px] bg-ink text-bone px-5 pt-20 pb-8">
      <div className="max-w-[1200px] mx-auto">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#8b8a80]">One conversation away</p>
        <h2 className="font-display font-extrabold text-[40px] md:text-[96px] tracking-tight leading-none mt-2">
          Build something
          <br />
          <a
            href={links.email ? `mailto:${links.email}` : "#"}
            className="text-marigold no-underline relative hover:underline underline-offset-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-4 focus-visible:ring-offset-ink rounded-sm"
          >
            with me →
          </a>
        </h2>

        <div className="flex flex-wrap gap-3 mt-8">
          {SOCIALS.map(({ key, label }) =>
            links[key] ? (
              <a key={key} className="btn-footer" href={links[key]} target="_blank" rel="noopener">
                {label}
              </a>
            ) : null
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-8 mt-16 pt-10 border-t border-[#33322b]">
          {explore.length > 0 && (
            <div>
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#8b8a80] mb-4">Explore</p>
              <div className="flex flex-col gap-2.5">
                {explore.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-[15px] font-medium hover:text-marigold transition-colors w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-4 focus-visible:ring-offset-ink"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#8b8a80] mb-4">More</p>
            <div className="flex flex-col gap-2.5">
              <Link href="/contact" className="text-[15px] font-medium hover:text-marigold transition-colors w-fit">
                Contact
              </Link>
              {/* Kept understated on purpose — the portfolio is a different
                  site with a different job, and a loud link here sends
                  people away from the thing they came to buy. */}
              {bio?.portfolioUrl && (
                <a
                  href={bio.portfolioUrl}
                  target="_blank"
                  rel="noopener"
                  className="text-[15px] font-medium text-[#b9b8ae] hover:text-marigold transition-colors w-fit"
                >
                  {bio.portfolioLabel || "Portfolio"} ↗
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-12 font-mono text-[11px] text-[#8b8a80]">
          <Link href="/terms" className="hover:text-marigold">Terms</Link>
          <Link href="/privacy" className="hover:text-marigold">Privacy</Link>
          <Link href="/refund-policy" className="hover:text-marigold">Refund &amp; Cancellation</Link>
          <Link href="/shipping-policy" className="hover:text-marigold">Shipping &amp; Delivery</Link>
        </div>

        <div className="flex flex-wrap justify-between gap-2 mt-5 pt-5 border-t border-[#33322b] font-mono text-[11px] text-[#8b8a80]">
          <span>© {new Date().getFullYear()} Deepanshu, trading as Deepanshu Empire · Meerut, UP</span>
          <Link href="/admin" className="hover:text-marigold">
            admin · deepanshutyagi.live
          </Link>
        </div>
      </div>
      <style>{`
        .btn-footer {
          display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:14px;
          padding:10px 18px;border-radius:999px;border:1px solid #3c3b33;color:#F2F1EC;text-decoration:none;
          transition: background .2s, color .2s, border-color .2s;
        }
        .btn-footer:hover{ background:#F5A300; color:#191913; border-color:#F5A300; }
        .btn-footer:focus-visible{ outline:2px solid #F5A300; outline-offset:3px; }
      `}</style>
    </footer>
  );
}
