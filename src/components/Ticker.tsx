// Slow, single-line drift — legibility comes from a generous animation
// duration and pausing on interaction, not from stacking lines (that read
// as a second dark slab directly under the spotlight card). Light surface
// (card/border-line), not ink — the spotlight above already owns "dark."
// The marquee duplicates content for a seamless loop, so it's aria-hidden;
// a single sr-only line carries the real claims to screen readers instead.
export default function Ticker({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  const seq = [...lines, ...lines];
  return (
    <div className="border-y border-line bg-card overflow-hidden whitespace-nowrap">
      <span className="sr-only">{lines.join(" · ")}</span>
      <div
        className="ticker-track inline-flex py-2.5 hover:[animation-play-state:paused] active:[animation-play-state:paused]"
        aria-hidden="true"
      >
        {seq.map((line, i) => (
          <span key={i} className="font-mono text-[11px] tracking-wider text-ink-soft px-6">
            ✦ <b className="text-marigold-deep font-bold">{line}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
