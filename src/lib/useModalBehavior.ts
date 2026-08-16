"use client";
import { useEffect } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared by CheckoutModal/RegisterModal — one correct implementation
// instead of two hand-rolled ones. While open:
// - Escape closes.
// - Body scroll is locked, restored on close AND on unmount (a modal
//   closed by unmounting — e.g. a route change — must not leave the page
//   scroll-locked forever).
// - Focus moves into the panel on open (first focusable element) and is
//   trapped there: Tab/Shift+Tab cycle within the panel, never escaping
//   to the page underneath.
// - Focus returns to whatever opened the modal on close.
export function useModalBehavior({
  open,
  onClose,
  panelRef,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  panelRef: React.RefObject<HTMLElement>;
  triggerRef: React.RefObject<HTMLElement>;
}) {
  useEffect(() => {
    if (!open) return;

    // Captured now, not read from the ref inside cleanup — by the time
    // cleanup runs (e.g. on unmount) the ref may already point elsewhere.
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      // Re-queried on every Tab press, not cached — RegisterModal swaps
      // its content (form -> success state) without the modal closing,
      // so the set of focusable elements changes mid-session.
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !panel.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
