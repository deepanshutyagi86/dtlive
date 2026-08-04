import Link from "next/link";

export interface FooterLinks {
  whatsapp?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  email?: string;
}

export default function Footer({ links }: { links: FooterLinks }) {
  return (
    <footer className="mt-[90px] bg-ink text-bone px-5 pt-20 pb-8">
      <div className="max-w-[1200px] mx-auto">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#8b8a80]">One conversation away</p>
        <h2 className="font-display font-extrabold text-[40px] md:text-[96px] tracking-tight leading-none mt-2">
          Build something
          <br />
          <a
            href={links.email ? `mailto:${links.email}` : "#"}
            className="text-marigold no-underline relative hover:underline underline-offset-8"
          >
            with me →
          </a>
        </h2>
        <div className="flex flex-wrap gap-3 mt-8">
          {links.whatsapp && (
            <a className="btn-footer" href={links.whatsapp} target="_blank" rel="noopener">
              WhatsApp
            </a>
          )}
          {links.instagram && (
            <a className="btn-footer" href={links.instagram} target="_blank" rel="noopener">
              Instagram
            </a>
          )}
          {links.youtube && (
            <a className="btn-footer" href={links.youtube} target="_blank" rel="noopener">
              YouTube
            </a>
          )}
          {links.linkedin && (
            <a className="btn-footer" href={links.linkedin} target="_blank" rel="noopener">
              LinkedIn
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-14 font-mono text-[11px] text-[#8b8a80]">
          <Link href="/contact" className="hover:text-marigold">Contact</Link>
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
      `}</style>
    </footer>
  );
}
