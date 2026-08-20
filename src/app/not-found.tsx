import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

// Deliberately reads NOTHING from the database. Next prerenders
// /_not-found at build time, so a settings query here would make the whole
// build depend on Neon being reachable from the build machine — and a
// try/catch around it would swallow Next's own static-generation bailout
// error, which is worse. The default nav is correct for a 404 anyway: this
// page exists to get someone back to a real one, not to reflect config.
export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="max-w-[720px] mx-auto px-5 pt-[140px] pb-28">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-3">404 — nothing here</p>
        <h1 className="font-display font-extrabold text-[40px] md:text-[72px] tracking-tight leading-[1.02]">
          That link has
          <br />
          <span className="text-marigold-deep">gone quiet.</span>
        </h1>
        <p className="mt-4 max-w-[520px] text-[16px] md:text-[17px] leading-relaxed text-ink-soft">
          The page you were after either moved or was never live. Everything that is live right now
          is one click away.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link
            href="/"
            className="bg-ink text-bone font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-marigold hover:text-ink transition-colors"
          >
            Back to the stream
          </Link>
          <Link
            href="/courses"
            className="border border-ink font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-ink hover:text-bone transition-colors"
          >
            Browse courses
          </Link>
          <Link
            href="/guide"
            className="border border-line font-semibold text-sm px-6 py-3.5 rounded-full hover:border-ink transition-colors"
          >
            Free guides
          </Link>
        </div>
      </main>
      <Footer links={{}} />
    </>
  );
}
