"use client";

import Image from "next/image";
import { isOptimisableImage } from "@/lib/image-hosts";
import type { ImageFocal } from "@/lib/types";

// Small pieces shared by the V4 homepage and its split-out sections.

export function Pic({
  src,
  alt,
  sizes,
  focal,
  priority = false,
  className = "",
}: {
  src: string | null;
  alt: string;
  sizes: string;
  focal?: ImageFocal | null;
  priority?: boolean;
  className?: string;
}) {
  if (!src) return <div className="v4-pic-empty" aria-hidden="true" />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimisableImage(src)}
      className={`v4-pic ${className}`}
      style={focal ? { objectPosition: `${focal.x}% ${focal.y}%` } : undefined}
      draggable={false}
    />
  );
}

export function Arrow() {
  return (
    <span className="v4-arr" aria-hidden="true">
      →
    </span>
  );
}
