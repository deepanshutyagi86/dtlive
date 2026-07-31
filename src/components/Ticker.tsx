export default function Ticker({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  const seq = [...lines, ...lines];
  return (
    <div className="border-y border-ink bg-ink text-bone overflow-hidden whitespace-nowrap" aria-hidden>
      <div className="ticker-track inline-flex py-[11px]">
        {seq.map((line, i) => (
          <span key={i} className="font-mono text-xs tracking-wider px-6">
            ✦ <b className="text-marigold font-bold">{line}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
