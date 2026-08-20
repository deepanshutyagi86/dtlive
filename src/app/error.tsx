"use client";
import { useEffect } from "react";
import Link from "next/link";

// Every public page is force-dynamic and queries Neon on each request, so
// a database blip surfaces here rather than as a broken render. This must
// stay a client component with no server imports — it is the boundary that
// catches a failure in the very code those imports would run.
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-bone text-ink flex items-center">
      <main className="max-w-[720px] mx-auto px-5 py-24">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-3">
          Something broke on our side
        </p>
        <h1 className="font-display font-extrabold text-[40px] md:text-[68px] tracking-tight leading-[1.02]">
          Give that
          <br />
          <span className="text-marigold-deep">another go.</span>
        </h1>
        <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-ink-soft">
          This one is on us, not you. Nothing you did was lost — if you were mid-payment, check your
          email before trying again.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <button
            onClick={reset}
            className="bg-ink text-bone font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-marigold hover:text-ink transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-ink font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-ink hover:text-bone transition-colors"
          >
            Back to the homepage
          </Link>
        </div>
        {error.digest && (
          <p className="font-mono text-[11px] text-muted mt-10">Reference: {error.digest}</p>
        )}
      </main>
    </div>
  );
}
