"use client";
import { useEffect, useRef, useState } from "react";

// Canvas 2D, deliberately not three.js/R3F: that's ~200KB gzip and drags in
// GPU tiering, dpr capping and SSR workarounds for a look Canvas 2D gets
// most of for effectively zero bundle. No audio analysis anywhere — you
// cannot read audio out of a Mixcloud/YouTube/Spotify embed (separate
// document, no API, DRM) — so the show runs entirely off a clock and a BPM
// number. That's the whole trick, and it's why it can never glitch: there
// is no signal to lose.

interface Beam {
  xFrac: number; // origin x as a fraction of canvas width
  color: string;
  phase: number;
}

const BEAMS: Beam[] = [
  { xFrac: 0.16, color: "#FF2D6F", phase: 0 },
  { xFrac: 0.4, color: "#35E0F0", phase: 1.7 },
  { xFrac: 0.63, color: "#F5A300", phase: 3.4 },
  { xFrac: 0.87, color: "#FF2D6F", phase: 5.1 },
];

const GROUND = "#08080B";
const SWAY_WIDTH_FRAC = 0.16; // how far a beam's base sways, as a fraction of canvas width
const MAX_DPR = 1.5;
// Photosensitive-seizure guard: any flashing content must stay under 3Hz.
// The beat envelope is what could turn into a strobe at a high BPM, so its
// frequency is clamped here regardless of what a mix's BPM actually is.
const MAX_BEAT_HZ = 3;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function BoothScene({ bpm }: { bpm: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightsOn, setLightsOn] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

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
    let lastT = 0;

    function draw(t: number) {
      lastT = t;
      const beatHz = Math.min(bpm > 0 ? bpm / 60 : 0, MAX_BEAT_HZ);
      const beatPeriod = beatHz > 0 ? 1 / beatHz : 0;
      const phaseInBeat = beatPeriod > 0 ? (t % beatPeriod) / beatPeriod : 0;
      const env = beatPeriod > 0 ? Math.pow(1 - phaseInBeat, 3) : 0;

      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = GROUND;
      ctx!.fillRect(0, 0, width, height);

      ctx!.globalCompositeOperation = "lighter";
      for (const beam of BEAMS) {
        const sway = Math.sin(t * 0.42 + beam.phase);
        const originX = beam.xFrac * width;
        const baseX = originX + sway * SWAY_WIDTH_FRAC * width;
        const topHalf = width * 0.006;
        const baseHalf = width * (0.05 + env * 0.03);

        const grad = ctx!.createLinearGradient(originX, 0, baseX, height);
        const [r, g, b] = hexToRgb(beam.color);
        const peakAlpha = Math.min(0.28 + env * 0.4, 0.85);
        grad.addColorStop(0, `rgba(${r},${g},${b},${peakAlpha})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.moveTo(originX - topHalf, 0);
        ctx!.lineTo(originX + topHalf, 0);
        ctx!.lineTo(baseX + baseHalf, height);
        ctx!.lineTo(baseX - baseHalf, height);
        ctx!.closePath();
        ctx!.fill();
      }
      ctx!.globalCompositeOperation = "source-over";

      // Dark wash over the top so beams read as light dispersing into haze
      // rather than flat triangles with a visible pointed vertex.
      const hazeH = height * 0.34;
      const haze = ctx!.createLinearGradient(0, 0, 0, hazeH);
      haze.addColorStop(0, "rgba(8,8,11,0.92)");
      haze.addColorStop(1, "rgba(8,8,11,0)");
      ctx!.fillStyle = haze;
      ctx!.fillRect(0, 0, width, hazeH);
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
