"use client";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useModalViewport } from "@/lib/useModalViewport";

// Shared by CheckoutModal/RegisterModal — one correct panel shell instead
// of two hand-rolled ones. Three regions:
//  - header:  flex-none, whatever's passed in (ModalHeroHeader elsewhere)
//  - children: flex-1 overflow-y-auto — the only part that scrolls
//  - footer:  flex-none — the pay/submit button, so it's always on screen
//             and reachable no matter how much the keyboard has eaten
//             out of the middle.
//
// On screens under Tailwind's `sm` breakpoint the panel is a bottom sheet
// (full width, anchored to the bottom, rounded top corners only) instead
// of a centred card — a thumb reaches the bottom edge of a phone screen
// far more easily than a floating card's edges.
//
// The overlay itself is sized off useModalViewport rather than
// `fixed inset-0`: see that hook for why dvh/vh get this wrong once an
// on-screen keyboard is up.
export default function ModalShell({
  open,
  mounted,
  onClose,
  panelRef,
  ariaLabel,
  header,
  footer,
  children,
}: {
  open: boolean;
  mounted: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLDivElement>;
  ariaLabel: string;
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const viewport = useModalViewport(open);

  if (!mounted || !open) return null;

  // Portalled to document.body on purpose, and this is load-bearing in two
  // separate ways. (1) Position: both triggers sit inside a fixed bar — the
  // desktop nav uses backdrop-blur, which makes that nav the containing
  // block for any position:fixed descendant, so an inline overlay would
  // center itself on a ~50px-tall bar instead of the viewport and hang off
  // the top of the screen. (2) Color: the mobile bar sets text-bone, and
  // inputs below would inherit that text color, so typed text rendered
  // near-white on a bone panel while the explicitly-colored placeholder
  // stayed dark. Escaping to <body> fixes both.
  return createPortal(
    <div
      className="fixed inset-x-0 flex items-end justify-center sm:items-center bg-ink/55 backdrop-blur-sm z-[200] sm:p-4"
      style={{ top: viewport.offsetTop, height: viewport.height }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="bg-bone text-ink w-full sm:max-w-[420px] rounded-t-card sm:rounded-card flex flex-col overflow-hidden max-h-full"
      >
        {header}
        {/* min-h-0 overrides the flex default of min-height:auto — without
            it this flex-1 child refuses to shrink below its own content's
            height, so instead of scrolling internally it pushes the whole
            panel taller than max-h-full and overflow-hidden clips the
            footer clean off, unreachable, rather than the body scrolling
            to reveal it. */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-6 pb-4">{children}</div>
        {footer && <div className="flex-none px-6 pb-6 pt-2 border-t border-line">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
