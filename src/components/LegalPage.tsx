import Nav from "./Nav";
import Footer, { FooterLinks } from "./Footer";

export default function LegalPage({
  title,
  updated,
  footerLinks,
  children,
}: {
  title: string;
  updated: string;
  footerLinks: FooterLinks;
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="max-w-[760px] mx-auto px-5 pt-[118px] pb-24">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">Legal</p>
        <h1 className="font-display font-extrabold text-[36px] md:text-[52px] tracking-tight leading-none">
          {title}
        </h1>
        <p className="font-mono text-[11px] text-muted mt-3">Last updated: {updated}</p>

        <div className="legal-body mt-10 text-ink-soft text-[16px] leading-relaxed">
          {children}
        </div>
      </main>
      <Footer links={footerLinks} />
      <style>{`
        .legal-body h2 {
          font-family: var(--font-bricolage);
          font-weight: 800;
          font-size: 21px;
          letter-spacing: -0.01em;
          color: #191913;
          margin-top: 2.25rem;
          margin-bottom: 0.75rem;
        }
        .legal-body h2:first-child { margin-top: 0; }
        .legal-body p { margin-bottom: 1rem; }
        .legal-body ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 1rem; }
        .legal-body li { margin-bottom: 0.4rem; }
        .legal-body a { color: #D98E00; text-decoration: underline; text-underline-offset: 3px; }
        .legal-body strong { color: #191913; font-weight: 600; }
      `}</style>
    </>
  );
}
