// Static, not a marquee — moving text is hard to actually read, and this
// strip carries the page's credibility proof points. A wrapped row reads
// in one glance instead of asking someone to wait for text to scroll past.
export default function Ticker({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="border-y border-ink bg-ink text-bone">
      <div className="max-w-[1200px] mx-auto px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        {lines.map((line, i) => (
          <span key={i} className="font-mono text-xs tracking-wider whitespace-nowrap">
            ✦ <b className="text-marigold font-bold">{line}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
