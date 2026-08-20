"use client";

// Catches a failure in the root layout itself, where error.tsx cannot
// help because the layout never rendered. It must supply its own <html>
// and <body> and cannot rely on any of the app's fonts or CSS variables —
// everything here is inline for exactly that reason.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F2F1EC", color: "#191913", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "96px 20px" }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
            Something broke.
          </h1>
          <p style={{ marginTop: 12, lineHeight: 1.6, color: "#41403a" }}>
            The site failed to load. Refresh, or head back in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 28, padding: "14px 24px", borderRadius: 999, border: "1px solid #191913",
              background: "#191913", color: "#F2F1EC", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 40, fontSize: 12, color: "#6E6D63", fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
