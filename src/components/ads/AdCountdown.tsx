"use client";
import { useEffect, useState } from "react";

// The clock on an ad page, in the block treatment: four big numbers with
// their units underneath.
//
// It counts to the offer's own deadline — the same timestamp that stops
// the page selling — so the number a visitor watches is the literal truth
// about how long they have, not a decoration that keeps running after the
// offer is gone.
//
// Rendered only after mount. A countdown computed during SSR is already
// wrong by the time it reaches the browser and mismatches on hydration,
// so the first paint deliberately shows nothing.
export default function AdCountdown({
  deadlineIso,
  label,
  dark,
}: {
  deadlineIso: string;
  /** What the clock is counting to, e.g. "PRICE GOES UP IN". */
  label: string;
  dark: boolean;
}) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(deadlineIso).getTime();
    if (Number.isNaN(target)) return;
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);

  if (left === null) return null;

  const total = Math.floor(left / 1000);
  const parts = [
    { value: Math.floor(total / 86400), unit: "DAYS" },
    { value: Math.floor((total % 86400) / 3600), unit: "HRS" },
    { value: Math.floor((total % 3600) / 60), unit: "MIN" },
    { value: total % 60, unit: "SEC" },
  ];

  const numberClass = dark ? "text-bone" : "text-ink";
  const unitClass = dark ? "text-[#8b8a80]" : "text-muted";
  const dotClass = dark ? "bg-[#3c3b33]" : "bg-line";

  return (
    <div>
      <p className={`font-mono text-[10px] font-bold tracking-wider mb-3 ${unitClass}`}>{label}</p>
      <div className="flex items-start gap-3 sm:gap-5" role="timer" aria-live="off">
        {parts.map((part, i) => (
          <div key={part.unit} className="flex items-start gap-3 sm:gap-5">
            <div>
              {/* tabular-nums so the row doesn't twitch sideways once a
                  second as digit widths change. */}
              <span
                className={`block font-display font-extrabold text-[44px] sm:text-[56px] leading-none tracking-tight tabular-nums ${numberClass}`}
              >
                {String(part.value).padStart(2, "0")}
              </span>
              <span className={`block font-mono text-[10px] tracking-wider mt-2 ${unitClass}`}>{part.unit}</span>
            </div>
            {i < parts.length - 1 && (
              <span aria-hidden className="flex flex-col gap-1.5 pt-3">
                <span className={`block w-1 h-1 rounded-full ${dotClass}`} />
                <span className={`block w-1 h-1 rounded-full ${dotClass}`} />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
