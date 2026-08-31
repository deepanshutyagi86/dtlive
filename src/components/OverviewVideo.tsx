"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { parseVideoUrl } from "@/lib/video";
import { DEFAULT_OVERVIEW_VIDEO_LABEL, type OverviewVideo as OverviewVideoData } from "@/lib/types";

// The free "Module 0" video on a course page. A filled marigold button
// that opens a 16:9 player over the page.
//
// Its own overlay rather than ModalShell: that shell is built for a
// 420px-wide form with a scrolling body and a pinned footer, and a video
// wants the opposite - as wide as the screen allows, one fixed aspect
// ratio, nothing to scroll.
//
// The player is mounted ONLY while open. That matters twice over: the
// page costs nothing extra to load (no YouTube iframe, no third-party
// JS on the critical path of the LCP image), and closing the modal
// unmounts the iframe, which is the only reliable way to stop playback -
// there is no "pause" to call on a cross-origin frame.
export default function OverviewVideoButton({
  video,
  title,
  className,
}: {
  video: OverviewVideoData;
  title: string;
  className?: string;
}) {
  const parsed = parseVideoUrl(video.url);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // document.body only exists client-side; without this the portal would
  // try to render into a nonexistent node during SSR.
  useEffect(() => setMounted(true), []);

  useModalBehavior({ open, onClose: () => setOpen(false), panelRef, triggerRef });

  // A url that no host recognises renders nothing at all. Better a page
  // with no video button than a button that opens a black rectangle.
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
          {/* Inline SVG, not an icon font or an image request - one glyph
              is not worth a network round trip on the LCP path. */}
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="currentColor">
            <path d="M3 1.8v12.4a.8.8 0 0 0 1.22.68l9.9-6.2a.8.8 0 0 0 0-1.36l-9.9-6.2A.8.8 0 0 0 3 1.8Z" />
          </svg>
          {label}
        </button>
        {video.note && <p className="font-mono text-[11px] text-muted mt-2">{video.note}</p>}
      </div>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] bg-ink/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${title} — course overview`}
              className="w-full max-w-[960px]"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <p className="font-mono text-[11px] uppercase tracking-wider text-bone/70">
                  {title} · overview
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close video"
                  className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-bone border border-bone/30 hover:bg-bone hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                    <path
                      d="M2 2l12 12M14 2L2 14"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="relative w-full aspect-video bg-black rounded-card overflow-hidden">
                {parsed.kind === "file" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={parsed.embedUrl}
                    controls
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full"
                  />
                ) : (
                  <iframe
                    src={parsed.embedUrl}
                    title={`${title} — course overview`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
