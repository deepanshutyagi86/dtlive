"use client";
import { useRef } from "react";
import { ITEM_IMAGE_ASPECT_CLASS } from "@/components/ItemImage";
import type { ImageFocal } from "@/lib/types";

function clampPercent(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}

// Shared by the item form and the guides panel. Only rendered once an image
// exists. imageFocal is undefined for anything that hasn't set one —
// displayed here as {x:50, y:0} to match ITEM_IMAGE_OBJECT_POSITION_CLASS
// (object-top) so the marker reflects reality, but nothing is written until
// the admin actually interacts with it.
export default function FocalPointPicker({
  thumbnail,
  imageFocal,
  onChange,
  // Guides and items happen to share the 3/2 card ratio today. Kept as a
  // prop anyway so the preview box can't silently drift from whatever the
  // surface it's previewing actually uses.
  aspectClassName = ITEM_IMAGE_ASPECT_CLASS,
}: {
  thumbnail: string;
  imageFocal: ImageFocal | undefined;
  onChange: (focal: ImageFocal | undefined) => void;
  aspectClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const focal = imageFocal ?? { x: 50, y: 0 };

  function updateFromPointer(e: React.PointerEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    onChange({
      x: clampPercent(((e.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((e.clientY - rect.top) / rect.height) * 100),
    });
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    // buttons is 1 for both an active mouse-button press and an active
    // touch/pen contact under the unified Pointer Events model — 0 means
    // nothing is currently pressed, so ignore hover-only movement.
    if (e.buttons === 0) return;
    updateFromPointer(e);
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block font-mono text-[10.5px] uppercase tracking-wider text-muted">Image focal point</label>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-xs font-semibold text-marigold-ink hover:underline"
        >
          Reset to default
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          className="relative w-full sm:max-w-[300px] touch-none select-none cursor-crosshair rounded-[10px] overflow-hidden border border-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnail} alt="" className="w-full h-auto block pointer-events-none select-none" draggable={false} />
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-bone bg-marigold shadow-[0_2px_6px_rgba(25,25,19,0.4)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
          />
        </div>

        <div className="w-full sm:max-w-[200px]">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1.5">Card preview</p>
          <div className={`relative w-full ${aspectClassName} rounded-[10px] overflow-hidden border border-line`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
              draggable={false}
            />
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted mt-2">Click or drag on the photo to set what stays in frame on the card.</p>
    </div>
  );
}
