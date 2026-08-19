import Image from "next/image";

// Most guides won't have a designed cover image, and an empty grey box
// reads as a broken image rather than a deliberate choice. The fallback is
// a typographic cover instead: same box, same corner radius, no layout
// shift when a real cover is added later.
export default function GuideCover({
  cover,
  title,
  sizes,
  aspectClassName = "aspect-[3/2]",
}: {
  cover: string | null;
  title: string;
  sizes: string;
  aspectClassName?: string;
}) {
  return (
    <div className={`relative w-full ${aspectClassName} overflow-hidden bg-ink`}>
      {cover ? (
        <Image src={cover} alt={title} fill sizes={sizes} className="object-cover object-top" draggable={false} />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-marigold">PDF · Free</span>
          <span className="font-display font-extrabold text-bone text-[22px] leading-[1.1] line-clamp-3">{title}</span>
        </div>
      )}
    </div>
  );
}
