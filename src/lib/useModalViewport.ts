"use client";
import { useEffect, useState } from "react";

export interface ViewportBox {
  offsetTop: number;
  height: number;
}

// Below this much visible height, a hero image above a form eats too much
// of what's left for the form to stay usable — roughly what's left on a
// phone once the on-screen keyboard is up.
export const HERO_COLLAPSE_HEIGHT = 480;

function readViewport(): ViewportBox {
  if (typeof window === "undefined") return { offsetTop: 0, height: 0 };
  const vv = window.visualViewport;
  return vv ? { offsetTop: vv.offsetTop, height: vv.height } : { offsetTop: 0, height: window.innerHeight };
}

// Tracks the browser's *visual* viewport, not the layout viewport. iOS
// Safari shrinks the visual viewport when the on-screen keyboard opens but
// leaves the layout viewport — and therefore 100dvh/100vh — exactly as it
// was, so a `fixed inset-0` modal sized off dvh ends up mostly hidden
// behind the keyboard with no way to reach the rest of its own panel.
// Sizing the overlay off this hook instead keeps it matched to what's
// actually visible, keyboard or not.
export function useModalViewport(open: boolean): ViewportBox {
  const [box, setBox] = useState<ViewportBox>(readViewport);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    function update() {
      setBox(readViewport());
    }
    update();
    if (!vv) return;
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  return box;
}

// Called from a field's onFocus. iOS needs a frame for the keyboard's
// resize to settle before scrollIntoView's target position is stable, so
// this defers by one rAF instead of scrolling immediately against a
// viewport that's still mid-animation.
export function scrollFieldIntoView(el: HTMLElement) {
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}
