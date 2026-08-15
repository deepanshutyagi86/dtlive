import Image from "next/image";
import ItemPlaceholder from "./ItemPlaceholder";
import { Category } from "@/lib/types";

// Single source of truth for the card image proportions — change this one
// token to retune every card at once instead of hunting for aspect-[..]
// strings across the component tree.
export const ITEM_IMAGE_ASPECT_CLASS = "aspect-[3/2]";

// Fixed aspect-ratio box so cards never reflow as images load in — the
// placeholder renders at the exact same box when there's no thumbnail yet.
export default function ItemImage({
  thumbnail,
  title,
  category,
  seed,
  sizes,
  className = "",
}: {
  thumbnail: string | null;
  title: string;
  category: Category;
  seed: string;
  sizes: string;
  className?: string;
}) {
  return (
    <div className={`relative w-full ${ITEM_IMAGE_ASPECT_CLASS} ${className}`}>
      {thumbnail ? (
        <Image src={thumbnail} alt={title} fill sizes={sizes} className="object-cover" draggable={false} />
      ) : (
        <ItemPlaceholder title={title} category={category} seed={seed} />
      )}
    </div>
  );
}
