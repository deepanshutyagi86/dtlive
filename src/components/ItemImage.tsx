import Image from "next/image";
import ItemPlaceholder from "./ItemPlaceholder";
import { Category } from "@/lib/types";

// Fixed 4:3 box so cards never reflow as images load in — the placeholder
// renders at the exact same box when there's no thumbnail yet.
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
    <div className={`relative w-full aspect-[4/3] ${className}`}>
      {thumbnail ? (
        <Image src={thumbnail} alt={title} fill sizes={sizes} className="object-cover" draggable={false} />
      ) : (
        <ItemPlaceholder title={title} category={category} seed={seed} />
      )}
    </div>
  );
}
