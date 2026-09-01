"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { parseVideoUrl } from "@/lib/video";
import {
  DEFAULT_OVERVIEW_VIDEO_LABEL,
  DEFAULT_PROMO_VIDEO_LABEL,
  type ItemVideo as ItemVideoData,
} from "@/lib/types";

// The two videos an item can carry, sharing one player.
//
//   ItemVideoOverlay — the PROMO film. A play button in the middle of the
//                      item's main image. A still frame with a play circle
//                      says "there is a video here" without a line of copy,
//                      and it is the first thing someone who just arrived
//                      can press.
//   ItemVideoButton  — MODULE 0. A labelled button under the description,
//                      for someone already reading and deciding whether the
//                      teaching is any good. Wants a label; a bare play
//                      circle would not say what it is.
//
// Both exist on the same page on purpose. They are not two routes to one
// video — they answer different questions for people at different stages.
//
// The player is mounted ONLY while open. That matters twice: the page costs
// nothing extra to load (no YouTube iframe on the critical path of the LCP
// image), and closing unmounts the iframe, which is the only reliable way
// to stop playback in a cross-origin frame.

function useVideo(video: ItemVideoData) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useModalBehavior({ open, onClose: () => setOpen(false), panelRef, triggerRef });

  return { parsed: parseVideoUrl(video.url), open, setOpen, mounted, triggerRef, panelRef };
}

/** The promo film, as a play button filling the item's hero image. */
export function ItemVideoOverlay({ video, title }: { video: ItemVideoData; title: string }) {
  const { parsed, open, setOpen, mounted, triggerRef, panelRef } = useVideo(video);
  // A URL no host recognises renders nothing at all. Better a clean hero
  // than a play button that opens a black rectangle.
  if (!parsed) return null;

  const label = video.label?.trim() || DEFAULT_PROMO_VIDEO_LABEL;

  return (
    <>
      {/* Fills the hero's relative container — the parent owns the size and
          aspect ratio, this only sits on top of it. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className="group absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink/25 hover:bg-ink/40 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marigold focus-visible:ring-inset"
      >
        <span className="w-[68px] h-[68px] md:w-[84px] md:h-[84px] rounded-full bg-marigold border-2 border-marigold flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 group-active:scale-95">
          <PlayGlyph size={26} className="translate-x-[3px]" />
        </span>
        <span className="font-semibold text-[14px] md:text-[15px] text-bone drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] px-4 text-center">
          {label}
          {video.note && (
            <span className="block font-mono text-[11px] font-normal text-bone/85 mt-1">{video.note}</span>
          )}
        </span>
      </button>

      <Player
        parsed={parsed}
        title={title}
        open={open}
        mounted={mounted}
        panelRef={panelRef}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/** Module 0, as a labelled button under the description. */
export function ItemVideoButton({
  video,
  title,
  className,
}: {
  video: ItemVideoData;
  title: string;
  className?: string;
}) {
  const { parsed, open, setOpen, mounted, triggerRef, panelRef } = useVideo(video);
  if (!parsed) return null;

  const label = video.label?.trim() || DEFAULT_OVERVIEW_VIDEO_LABEL;

  return (
    <>
      <div className={className}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2.5 min-h-[44px] font-semibold text-[15px] text-ink bg-marigold border border-marigold rounded-full px-5 py-2.5 hover:bg-ink hover:text-bone hover:border-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-bone"
        >
          <PlayGlyph size={16} />
          {label}
        </button>
        {video.note && <p className="font-mono text-[11px] text-muted mt-2">{video.note}</p>}
      </div>

      <Player
        parsed={parsed}
        title={title}
        open={open}
        mounted={mounted}
        panelRef={panelRef}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// Inline SVG, not an icon font or an image request — one glyph is not
// worth a network round trip on the LCP path. Nudged right where it sits
// in a circle: a triangle's visual centre is left of its bounding box, so
// a mathematically centred play glyph reads as off-centre.
function PlayGlyph({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden fill="currentColor" className={className}>
      <path d="M3 1.8v12.4a.8.8 0 0 0 1.22.68l9.9-6.2a.8.8 0 0 0 0-1.36l-9.9-6.2A.8.8 0 0 0 3 1.8Z" />
    </svg>
  );
}

function Player({
  parsed,
  title,
  open,
  mounted,
  panelRef,
  onClose,
}: {
  parsed: NonNullable<ReturnType<typeof parseVideoUrl>>;
  title: string;
  open: boolean;
  mounted: boolean;
  panelRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
}): ReactNode {
  if (!mounted || !open) return null;

  // Its own overlay rather than ModalShell: that shell is built for a
  // 420px form with a scrolling body and a pinned footer, and a video
  // wants the opposite — as wide as the screen allows, one fixed ratio,
  // nothing to scroll.
  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-ink/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} — video`}
        className="w-full max-w-[960px]"
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="font-mono text-[11px] uppercase tracking-wider text-bone/70">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-bone border border-bone/30 hover:bg-bone hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative w-full aspect-video bg-black rounded-card overflow-hidden">
          {parsed.kind === "file" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={parsed.embedUrl} controls autoPlay playsInline className="absolute inset-0 w-full h-full" />
          ) : (
            <iframe
              src={parsed.embedUrl}
              title={`${title} — video`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
