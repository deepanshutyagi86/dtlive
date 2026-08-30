"use client";
import { useEffect, useRef, useState } from "react";

// Canvas 2D, deliberately not three.js/R3F: that's ~200KB gzip and drags in
// GPU tiering, dpr capping and SSR workarounds for a look Canvas 2D gets
// most of for effectively zero bundle. No audio analysis anywhere — you
// cannot read audio out of a YouTube embed (separate document, no API,
// DRM) — so the show runs off a clock, a BPM number, and which track index
// the playlist has advanced to. That's the whole trick, and it's why it
// can never glitch: there is no signal to lose.
//
// The screen is now the centrepiece (a framed YouTube iframe sitting in
// the middle of BoothRoom's monitor), so these beams converge toward the
// horizontal centre and mid-height rather than sweeping over empty space —
// they read as light spilling around a source, not decoration behind one.

interface Beam {
  xFrac: number; // origin x as a fraction of canvas width
  phase: number;
}

const BEAMS: Beam[] = [
  { xFrac: 0.3, phase: 0 },
  { xFrac: 0.42, phase: 1.7 },
  { xFrac: 0.58, phase: 3.4 },
  { xFrac: 0.7, phase: 5.1 },
];

/** One palette per lighting scene, cycled by playlist track index. Also
 *  the single source of truth BoothRoom reads its screen-glow colour from,
 *  so the canvas beams and the CSS glow around the monitor always agree. */
export const BOOTH_PALETTES: string[][] = [
  ["#FF2D6F", "#35E0F0", "#F5A300", "#FF2D6F"],
  ["#7C3AED", "#22D3EE", "#F472B6", "#7C3AED"],
  ["#F59E0B", "#EF4444", "#F5A300", "#EC4899"],
  ["#22C55E", "#35E0F0", "#84CC16", "#22C55E"],
  ["#EC4899", "#8B5CF6", "#F5A300", "#22D3EE"],
];

export function paletteForScene(sceneIndex: number): string[] {
  return BOOTH_PALETTES[((sceneIndex % BOOTH_PALETTES.length) + BOOTH_PALETTES.length) % BOOTH_PALETTES.length];
}

const GROUND = "#08080B";
const SWAY_WIDTH_FRAC = 0.1; // how far a beam's base sways, as a fraction of canvas width
const MAX_DPR = 1.5;
// Photosensitive-seizure guard: any flashing content must stay under 3Hz.
// The beat envelope is what could turn into a strobe at a high BPM, so its
// frequency is clamped here regardless of what a set's BPM actually is.
const MAX_BEAT_HZ = 3;
// A scene change re-lights over this many seconds rather than snapping —
// a hard cut between two saturated colour fields is closer to a flash
// than a transition, so this is a legibility choice as much as a taste one.
const RELIGHT_SEC = 0.9;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(from: [number, number, number], to: [number, number, number], t: number): [number, number, number] {
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
}

interface ColorState {
  from: [number, number, number][];
  to: [number, number, number][];
  relightStart: number; // in the running animation's own t-clock (seconds)
  currentT: number;
}

export default function BoothScene({ bpm, sceneIndex = 0 }: { bpm: number; sceneIndex?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightsOn, setLightsOn] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Colour state lives in a ref that outlives any single run of the
  // animation effect below, so toggling lights off/on (which tears the rAF
  // loop down and rebuilds it) doesn't reset an in-progress palette back to
  // scene 0 — and so the separate sceneIndex effect further down can push a
  // new target palette in without needing to restart the loop itself,
  // which is what avoids a stutter in the beam sway on every track change.
  const colorRef = useRef<ColorState>({
    from: paletteForScene(sceneIndex).map(hexToRgb),
    to: paletteForScene(sceneIndex).map(hexToRgb),
    relightStart: -Infinity,
    currentT: 0,
  });

  // Honour a change to the media query at runtime, not just on load — the
  // hard requirement is "stopped", not "slower", so this isn't optional.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Both collapse to the same "draw one still frame, run no loop" path —
    // reduced-motion is a non-negotiable accessibility floor, the toggle is
    // the same floor offered voluntarily. Neither is "slower".
    const animate = lightsOn && !reducedMotion;

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      const rect = container!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let raf = 0;
    let inView = true;
    let tabHidden = document.hidden;

    function draw(t: number) {
      const cs = colorRef.current;
      cs.currentT = t;
      const beatHz = Math.min(bpm > 0 ? bpm / 60 : 0, MAX_BEAT_HZ);
      const beatPeriod = beatHz > 0 ? 1 / beatHz : 0;
      const phaseInBeat = beatPeriod > 0 ? (t % beatPeriod) / beatPeriod : 0;
      const env = beatPeriod > 0 ? Math.pow(1 - phaseInBeat, 3) : 0;

      const relightT = cs.relightStart === -Infinity ? 1 : Math.max(0, Math.min(1, (t - cs.relightStart) / RELIGHT_SEC));

      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = GROUND;
      ctx!.fillRect(0, 0, width, height);

      ctx!.globalCompositeOperation = "lighter";
      BEAMS.forEach((beam, i) => {
        const [r, g, b] = lerpColor(cs.from[i % cs.from.length], cs.to[i % cs.to.length], relightT);
        const sway = Math.sin(t * 0.42 + beam.phase);
        const originX = beam.xFrac * width;
        const focalX = width * 0.5;
        // Beams converge toward the screen's centre rather than fanning
        // out flat — origin near the top edge, base swaying around the
        // midline where the monitor sits.
        const baseX = focalX + (originX - focalX) * 0.35 + sway * SWAY_WIDTH_FRAC * width;
        const topHalf = width * 0.006;
        const baseHalf = width * (0.05 + env * 0.03);
        const beamHeight = height * 0.62;

        const grad = ctx!.createLinearGradient(originX, 0, baseX, beamHeight);
        const peakAlpha = Math.min(0.26 + env * 0.4, 0.85);
        grad.addColorStop(0, `rgba(${r},${g},${b},${peakAlpha})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.moveTo(originX - topHalf, 0);
        ctx!.lineTo(originX + topHalf, 0);
        ctx!.lineTo(baseX + baseHalf, beamHeight);
        ctx!.lineTo(baseX - baseHalf, beamHeight);
        ctx!.closePath();
        ctx!.fill();
      });
      ctx!.globalCompositeOperation = "source-over";

      // Dark wash over the top so beams read as light dispersing into haze
      // rather than flat triangles with a visible pointed vertex.
      const hazeH = height * 0.34;
      const haze = ctx!.createLinearGradient(0, 0, 0, hazeH);
      haze.addColorStop(0, "rgba(8,8,11,0.92)");
      haze.addColorStop(1, "rgba(8,8,11,0)");
      ctx!.fillStyle = haze;
      ctx!.fillRect(0, 0, width, hazeH);

      if (relightT >= 1) cs.from = cs.to;
    }

    let startTime: number | null = null;
    function tick(now: number) {
      if (startTime === null) startTime = now;
      const t = (now - startTime) / 1000;
      draw(t);
      if (animate && inView && !tabHidden) raf = requestAnimationFrame(tick);
    }

    if (animate) {
      raf = requestAnimationFrame(tick);
    } else {
      draw(0);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        const wasInView = inView;
        inView = entry.isIntersecting;
        if (animate && inView && !wasInView && !tabHidden) {
          cancelAnimationFrame(raf);
          startTime = null;
          raf = requestAnimationFrame(tick);
        } else if (!inView) {
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    function onVisibility() {
      tabHidden = document.hidden;
      if (animate && !tabHidden && inView) {
        cancelAnimationFrame(raf);
        startTime = null;
        raf = requestAnimationFrame(tick);
      } else if (tabHidden) {
        cancelAnimationFrame(raf);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [bpm, lightsOn, reducedMotion]);

  // Track changes push a new target palette into the shared colour ref and
  // restart the crossfade clock — deliberately NOT a dependency of the
  // main animation effect above, so a track change never tears down and
  // rebuilds the rAF loop (that would reset the beam sway's own clock and
  // read as a stutter, the opposite of "reads as reactive").
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const cs = colorRef.current;
    cs.from = cs.to;
    cs.to = paletteForScene(sceneIndex).map(hexToRgb);
    cs.relightStart = cs.currentT;
  }, [sceneIndex]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" aria-hidden />
      <button
        type="button"
        aria-pressed={!lightsOn}
        onClick={() => setLightsOn((v) => !v)}
        className="absolute top-5 right-5 z-10 inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/20 text-white text-sm font-medium px-4 py-2.5 rounded-full hover:bg-black/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <span aria-hidden>{lightsOn ? "●" : "○"}</span>
        {lightsOn ? "Lights off" : "Lights on"}
      </button>
    </div>
  );
}
