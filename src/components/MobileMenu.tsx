"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useModalBehavior } from "@/lib/useModalBehavior";
import type { NavLink } from "@/lib/settings-types";

// Portalled to <body> for the same load-bearing reason the checkout modal
// is: any ancestor filter/backdrop-filter becomes the containing block for
// a position:fixed descendant, so an inline panel would size itself to the
// ~50px bar instead of the viewport. The nav no longer blurs, but the
// portal is what keeps that true regardless. See CheckoutModal.tsx.
export default function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ open, onClose: () => setOpen(false), panelRef, triggerRef });

  if (links.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="lg:hidden w-11 h-11 -mr-1.5 flex flex-col items-center justify-center gap-[5px] rounded-full hover:bg-ink/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
      >
        <span className="block w-[18px] h-[1.5px] bg-ink rounded-full" />
        <span className="block w-[18px] h-[1.5px] bg-ink rounded-full" />
      </button>

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[200] bg-ink/55 backdrop-blur-sm flex items-start justify-end p-3 text-ink"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="bg-bone rounded-card w-full max-w-[320px] p-5 shadow-[0_30px_60px_-24px_rgba(25,25,19,0.5)]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="w-11 h-11 -mr-2.5 -mt-2.5 flex items-center justify-center text-2xl leading-none rounded-full hover:bg-ink/5 transition-colors"
              >
                ×
              </button>
            </div>
            <nav className="flex flex-col">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="font-display font-bold text-[22px] tracking-tight py-2.5 border-b border-line last:border-b-0 hover:text-marigold-ink transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
