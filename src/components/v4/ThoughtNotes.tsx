"use client";

import { useEffect, useRef, useState } from "react";

// "Some of my thoughts" — the hero's right side. The card types one thought
// at a time; underneath, every thought sits as a still note in a row you can
// scroll. Notes never move or change on their own. Click one to type it.
export const THOUGHTS = [
  "AI is where I’m putting everything",
  "I meditate",
  "I dance",
  "Thoughts are things",
  "Attention has weight",
  "We’re thinking that learned to be meat",
  "When a group locks onto one thing, physics gets strange",
  "Death is the most interesting unsolved problem",
  "Clarity is the new scarce resource",
  "Build for humans or don’t bother",
  "Execution is the only proof",
  "I don’t have an answer for this one. I sat with it for a week.",
];

const HOLD_MS = 2400;
const pad = (n: number) => String(n).padStart(2, "0");

export default function ThoughtNotes({ replayKey }: { replayKey: number }) {
  const [cur, setCur] = useState(0);
  const [typed, setTyped] = useState("");
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const barRef = useRef<HTMLElement>(null);

  // Restart from the first thought on replay.
  useEffect(() => {
    setCur(0);
    setPaused(false);
  }, [replayKey]);

  // Type the current thought, hold it, then move on.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = THOUGHTS[cur];
    const timers: number[] = [];
    setHolding(false);
    if (reduce) {
      setTyped(s);
      setHolding(true);
    } else {
      setTyped("");
      let c = 0;
      const step = () => {
        c++;
        setTyped(s.slice(0, c));
        if (c < s.length) timers.push(window.setTimeout(step, 30 + Math.random() * 24));
        else setHolding(true);
      };
      timers.push(window.setTimeout(step, 120));
    }
    return () => timers.forEach(clearTimeout);
  }, [cur, replayKey]);

  useEffect(() => {
    const bar = barRef.current;
    if (bar) {
      bar.style.transition = "none";
      bar.style.width = "0";
    }
    if (!holding || paused) return;
    if (bar) {
      void bar.offsetWidth;
      bar.style.transition = `width ${HOLD_MS}ms linear`;
      bar.style.width = "100%";
    }
    const t = window.setTimeout(() => setCur((c) => (c + 1) % THOUGHTS.length), HOLD_MS);
    return () => clearTimeout(t);
  }, [holding, paused, cur]);

  const go = (k: number) => setCur((k + THOUGHTS.length) % THOUGHTS.length);

  return (
    <div className="v4-think-zone">
      <aside className="v4-think" aria-live="polite">
        <div className="v4-think-hd">
          <span className="v4-m">Some of my thoughts</span>
          <i className="v4-m">
            {pad(cur + 1)} / {THOUGHTS.length}
          </i>
        </div>
        <div className="v4-typed v4-sf">
          <span>{typed}</span>
          <span className="v4-caret" aria-hidden="true" />
        </div>
        <div className="v4-think-bar">
          <i ref={barRef} />
        </div>
        <div className="v4-think-ft">
          <button type="button" onClick={() => go(cur - 1)}>
            ← Prev
          </button>
          <button type="button" onClick={() => setPaused((p) => !p)}>
            {paused ? "Play" : "Pause"}
          </button>
          <button type="button" onClick={() => go(cur + 1)}>
            Next →
          </button>
        </div>
      </aside>
      <div className="v4-tnotes" aria-label="All thoughts">
        {THOUGHTS.map((t, k) => (
          <button type="button" key={k} className="v4-tn" onClick={() => go(k)}>
            <small>Thought {pad(k + 1)}</small>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
