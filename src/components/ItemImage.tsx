import Image from "next/image";
import ItemPlaceholder from "./ItemPlaceholder";
import { Category, ImageFocal } from "@/lib/types";
import { isOptimisableImage } from "@/lib/image-hosts";

// Single source of truth for the card image proportions and crop anchor —
// change these two tokens to retune every card at once instead of hunting
// for aspect-[..]/object-.. strings across the component tree.
export const ITEM_IMAGE_ASPECT_CLASS = "aspect-[3/2]";
// A detail-page hero reads as a lead visual, not a grid thumbnail — wider
// and shorter than the card ratio. Its own token, next to the card one, so
// retuning either later is a one-line change instead of a hunt.
export const ITEM_DETAIL_HERO_ASPECT_CLASS = "aspect-[16/9]";
// Top-anchored, not centered: a tall portrait photo squeezed into this
// frame crops from the center by default, which cuts off heads. Anchoring
// to the top keeps faces in frame at the cost of cropping more off the
// bottom instead.
export const ITEM_IMAGE_OBJECT_POSITION_CLASS = "object-top";

// Fixed aspect-ratio box so cards never reflow as images load in — the
// placeholder renders at the exact same box when there's no thumbnail yet.
export default function ItemImage({
  thumbnail,
  title,
  category,
  seed,
  sizes,
  imageFocal,
  aspectClassName = ITEM_IMAGE_ASPECT_CLASS,
  className = "",
}: {
  thumbnail: string | null;
  title: string;
  category: Category;
  seed: string;
  sizes: string;
  // Per-item override (0–100 percentages), set from the admin focal-point
  // picker. Absent/null falls back to the class-based global default —
  // Tailwind can't compile a class from a runtime x/y value, so a specific
  // focal point has to be an inline style, not a generated class.
  imageFocal?: ImageFocal | null;
  // Defaults to the card ratio. Pass ITEM_DETAIL_HERO_ASPECT_CLASS (or any
  // other aspect-[..] token) for a surface that isn't a card — a plain
  // className can't reliably override aspect-ratio since Tailwind utility
  // ordering, not string position, decides which wins.
  aspectClassName?: string;
  className?: string;
}) {
  return (
    <div className={`relative w-full ${aspectClassName} ${className}`}>
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt={title}
          fill
          sizes={sizes}
          // A thumbnail on a host outside images.remotePatterns would
          // otherwise throw and blank the entire page, not just this card.
          unoptimized={!isOptimisableImage(thumbnail)}
          className={`object-cover ${ITEM_IMAGE_OBJECT_POSITION_CLASS}`}
          style={imageFocal ? { objectPosition: `${imageFocal.x}% ${imageFocal.y}%` } : undefined}
          draggable={false}
        />
      ) : (
        <ItemPlaceholder title={title} category={category} seed={seed} />
      )}
    </div>
  );
}
