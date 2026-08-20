import Nav from "@/components/Nav";
import Footer, { FooterLinks } from "@/components/Footer";
import { getSetting } from "@/lib/items";
import { getBio, getNav } from "@/lib/site-settings";
import { BUSINESS, fullAddress } from "@/lib/legal";

export const dynamic = "force-dynamic";

export const metadata = { title: "Contact Us — Deepanshu Tyagi Live" };

export default async function ContactPage() {
  const [footerLinks, nav, bio] = await Promise.all([
    getSetting<FooterLinks>("footerLinks", {}),
    getNav(),
    getBio(),
  ]);

  return (
    <>
      <Nav nav={nav} />
      <main className="max-w-[760px] mx-auto px-5 pt-[118px] pb-24">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">Get in touch</p>
        <h1 className="font-display font-extrabold text-[40px] md:text-[64px] tracking-tight leading-none">
          Contact Us
        </h1>
        <p className="mt-3 max-w-[520px] text-ink-soft">
          Questions about an order, a course, a workshop seat, or agency work — reach us directly.
        </p>

        <div className="grid md:grid-cols-2 gap-5 mt-12">
          <div className="bg-card border border-line rounded-card p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Email</p>
            <a href={`mailto:${BUSINESS.email}`} className="font-display font-bold text-xl text-marigold-deep hover:underline">
              {BUSINESS.email}
            </a>
          </div>
          <div className="bg-card border border-line rounded-card p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Phone</p>
            <a href={`tel:${BUSINESS.phone.replace(/\s+/g, "")}`} className="font-display font-bold text-xl text-marigold-deep hover:underline">
              {BUSINESS.phone}
            </a>
          </div>
        </div>

        <div className="bg-card border border-line rounded-card p-6 mt-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Operating address</p>
          <p className="font-display font-bold text-lg leading-snug">{fullAddress}</p>
        </div>

        <div className="mt-10 pt-8 border-t border-line font-mono text-[12px] text-muted leading-relaxed">
          <p>
            <strong className="text-ink">Legal entity:</strong> {BUSINESS.legalName}, trading as{" "}
            {BUSINESS.tradeName} ({BUSINESS.constitution})
          </p>
          <p className="mt-1">
            <strong className="text-ink">GSTIN:</strong> {BUSINESS.gstin}
          </p>
        </div>
      </main>
      <Footer links={footerLinks} nav={nav} bio={bio} />
    </>
  );
}
