"use client";

import { useEffect, useRef } from "react";

// "Some of my thoughts" — the hero's right side. Replaces the old spinning
// spiral: the card types one thought at a time while the rest float around
// it as notes, so the hero is never empty and every thought is readable.
// When a thought finishes typing it flies out of the card and becomes a
// note; the oldest note fades to make room.
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

// Where notes sit around the card on desktop (percent of the zone):
// three across the top, three across the bottom.
const SLOTS: [number, number][] = [
  [0, 3],
  [35, 0],
  [68, 6],
  [1, 80],
  [35, 88],
  [68, 79],
];
const SEED = [6, 8, 10, 7, 9, 11];
const HOLD_MS = 2400;

type NoteEl = HTMLDivElement & { _ph?: number; _d?: number };
type Live = { el: NoteEl; slot: number };

const pad = (n: number) => String(n).padStart(2, "0");

export default function ThoughtNotes({ replayKey }: { replayKey: number }) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const typedRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    const notesEl = notesRef.current;
    const card = cardRef.current;
    const ty = typedRef.current;
    const cnt = countRef.current;
    const bar = barRef.current;
    const pz = pauseRef.current;
    const pv = prevRef.current;
    const nx = nextRef.current;
    if (!zone || !notesEl || !card || !ty || !cnt || !bar || !pz || !pv || !nx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = () => window.innerWidth > 860;
    let timers: number[] = [];
    let cur = 0;
    let paused = false;
    let live: Live[] = [];
    let raf = 0;
    let mx = 0,
      my = 0,
      tx = 0,
      tyy = 0;
    const t0 = performance.now();

    const later = (f: () => void, ms: number) => {
      timers.push(window.setTimeout(f, ms));
    };
    const stop = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    function makeNote(k: number, slot: number, fromCard: boolean, fresh: boolean): NoteEl {
      const n = document.createElement("div") as NoteEl;
      n.className = "v4-tn" + (fresh ? " fresh" : "");
      n.dataset.k = String(k);
      n.tabIndex = 0;
      n.setAttribute("role", "button");
      n.setAttribute("aria-label", "Show: " + THOUGHTS[k]);
      const inner = document.createElement("div");
      inner.className = "v4-tn-in";
      const small = document.createElement("small");
      small.textContent = fresh ? "Just now" : "Thought " + pad(k + 1);
      inner.append(small, document.createTextNode(THOUGHTS[k]));
      n.append(inner);
      n.style.left = SLOTS[slot][0] + "%";
      n.style.top = SLOTS[slot][1] + "%";
      if (fresh && !wide()) notesEl!.prepend(n);
      else notesEl!.appendChild(n);

      if (wide() && !reduce) {
        const nr = n.getBoundingClientRect();
        n.style.transition = "none";
        if (fromCard) {
          const cr = card!.getBoundingClientRect();
          n.style.transform = `translate(${cr.left + cr.width / 2 - (nr.left + nr.width / 2)}px,${
            cr.top + cr.height / 2 - (nr.top + nr.height / 2)
          }px) scale(.6)`;
        } else {
          n.style.transform = "translateY(18px) scale(.96)";
        }
        n.style.opacity = "0";
        void n.offsetWidth;
        n.style.transition = "";
        requestAnimationFrame(() => {
          n.style.transform = "";
          n.style.opacity = "1";
        });
      }
      if (fresh) later(() => n.classList.remove("fresh"), 2600);
      const show = () => {
        stop();
        type(Number(n.dataset.k));
      };
      n.addEventListener("click", show);
      n.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          show();
        }
      });
      n._ph = Math.random() * 6.28;
      n._d = 8 + (slot % 3) * 8;
      return n;
    }

    function addFromCard(k: number) {
      let slot: number;
      if (live.length < SLOTS.length) {
        const used = live.map((x) => x.slot);
        slot = SLOTS.findIndex((_, i) => !used.includes(i));
      } else {
        const old = live.shift()!;
        slot = old.slot;
        old.el.classList.add("leave");
        window.setTimeout(() => old.el.remove(), 600);
      }
      live.push({ el: makeNote(k, slot, true, true), slot });
    }

    function type(k: number) {
      cur = (k + THOUGHTS.length) % THOUGHTS.length;
      const s = THOUGHTS[cur];
      cnt!.textContent = pad(cur + 1) + " / " + THOUGHTS.length;
      bar!.style.transition = "none";
      bar!.style.width = "0";
      ty!.textContent = "";
      if (reduce) {
        ty!.textContent = s;
        hold();
        return;
      }
      let c = 0;
      const step = () => {
        c++;
        ty!.textContent = s.slice(0, c);
        if (c < s.length) later(step, 30 + Math.random() * 24);
        else hold();
      };
      later(step, 120);
    }

    function hold() {
      void bar!.offsetWidth;
      bar!.style.transition = `width ${HOLD_MS}ms linear`;
      bar!.style.width = "100%";
      if (paused) return;
      later(() => {
        addFromCard(cur);
        type(cur + 1);
      }, HOLD_MS);
    }

    // Seed notes almost straight away so the right side is never blank.
    notesEl.innerHTML = "";
    SEED.forEach((k, i) =>
      later(() => live.push({ el: makeNote(k, i, false, false), slot: i }), reduce ? 0 : 120 + i * 80)
    );
    later(() => type(0), reduce ? 0 : 250);

    nx.onclick = () => {
      stop();
      addFromCard(cur);
      type(cur + 1);
    };
    pv.onclick = () => {
      stop();
      type(cur - 1);
    };
    pz.textContent = "Pause";
    pz.onclick = () => {
      paused = !paused;
      pz.textContent = paused ? "Play" : "Pause";
      stop();
      if (!paused) {
        addFromCard(cur);
        type(cur + 1);
      } else {
        bar.style.transition = "none";
      }
    };

    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      tyy = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const loop = (now: number) => {
      if (wide() && !reduce) {
        mx += (tx - mx) * 0.06;
        my += (tyy - my) * 0.06;
        const t = (now - t0) / 1000;
        notesEl.querySelectorAll<NoteEl>(".v4-tn").forEach((n, j) => {
          const inner = n.firstElementChild as HTMLElement | null;
          if (!inner) return;
          const d = n._d ?? 12;
          const ph = n._ph ?? j;
          inner.style.transform = `translate(${mx * d + Math.sin(t * 0.6 + ph) * 6}px,${
            my * d + Math.cos(t * 0.5 + ph) * 7
          }px) rotate(${Math.sin(ph) * 2.4}deg)`;
        });
        card.style.transform = `translate(calc(-50% + ${mx * -8}px), calc(-50% + ${my * -8}px))`;
      } else {
        card.style.transform = "";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      stop();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      notesEl.innerHTML = "";
    };
  }, [replayKey]);

  return (
    <div className="v4-think-zone" ref={zoneRef}>
      <div className="v4-tnotes" ref={notesRef} aria-label="Thoughts" />
      <aside className="v4-think" ref={cardRef} aria-live="polite">
        <div className="v4-think-hd">
          <span className="v4-m">Some of my thoughts</span>
          <i className="v4-m" ref={countRef}>
            01 / {THOUGHTS.length}
          </i>
        </div>
        <div className="v4-typed v4-sf">
          <span ref={typedRef} />
          <span className="v4-caret" aria-hidden="true" />
        </div>
        <div className="v4-think-bar">
          <i ref={barRef} />
        </div>
        <div className="v4-think-ft">
          <button type="button" ref={prevRef}>
            ← Prev
          </button>
          <button type="button" ref={pauseRef}>
            Pause
          </button>
          <button type="button" ref={nextRef}>
            Next →
          </button>
        </div>
      </aside>
    </div>
  );
}
