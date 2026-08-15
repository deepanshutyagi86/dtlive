import { Category } from "@/lib/types";

// Mirrors the fill/border language already used for the category chip
// (CHIP_CLASS in LiveStream.tsx) so a placeholder reads as "the same design
// system, no photo yet" rather than an unrelated fallback.
const CATEGORY_MARK: Record<
  Category,
  { bg: string; fg: string; fill: string; border: string; shape: "circle" | "triangle" | "square" | "diamond" | "chevron" }
> = {
  course: { bg: "bg-marigold", fg: "text-ink", fill: "fill-ink", border: "", shape: "circle" },
  workshop: { bg: "bg-ink", fg: "text-bone", fill: "fill-bone", border: "", shape: "triangle" },
  agency: { bg: "bg-bone", fg: "text-ink", fill: "fill-ink", border: "border-2 border-ink", shape: "square" },
  shop: { bg: "bg-bone", fg: "text-ink", fill: "fill-ink", border: "border-2 border-dashed border-ink", shape: "diamond" },
  venture: { bg: "bg-marigold-deep", fg: "text-bone", fill: "fill-bone", border: "", shape: "chevron" },
};

// Deterministic string hash (djb2-ish) — same seed always produces the same
// mark rotation/position/scale, so an item's placeholder is stable across
// reloads and across every page it appears on.
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

const ROTATIONS = [-10, -6, 0, 6, 10];
const POSITIONS = [
  { top: "-8%", left: "-6%" },
  { top: "-12%", right: "-8%" },
  { bottom: "-10%", left: "-4%" },
  { bottom: "-14%", right: "-6%" },
];
const SCALES = [0.85, 1, 1.15, 1.3];

function Mark({ shape, className }: { shape: string; className: string }) {
  switch (shape) {
    case "circle":
      return <circle cx="50" cy="50" r="42" className={className} />;
    case "triangle":
      return <polygon points="50,8 92,88 8,88" className={className} />;
    case "square":
      return <rect x="12" y="12" width="76" height="76" className={className} />;
    case "diamond":
      return <polygon points="50,4 96,50 50,96 4,50" className={className} />;
    case "chevron":
    default:
      return (
        <path
          d="M20 30 L50 62 L80 30 M20 64 L50 96 L80 64"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
        />
      );
  }
}

export default function ItemPlaceholder({
  title,
  category,
  seed,
}: {
  title: string;
  category: Category;
  seed: string;
}) {
  const h = hash(seed);
  const style = CATEGORY_MARK[category];
  const rotation = ROTATIONS[h % ROTATIONS.length];
  const position = POSITIONS[Math.floor(h / ROTATIONS.length) % POSITIONS.length];
  const scale = SCALES[Math.floor(h / (ROTATIONS.length * POSITIONS.length)) % SCALES.length];
  const initial = title.trim().charAt(0).toUpperCase() || "?";
  const isChevron = style.shape === "chevron";

  return (
    <div className={`relative w-full h-full overflow-hidden ${style.bg} ${style.border}`}>
      <svg
        viewBox="0 0 100 100"
        className={`absolute w-[65%] h-[65%] opacity-[0.16] ${isChevron ? style.fg : ""}`}
        style={{ ...position, transform: `rotate(${rotation}deg) scale(${scale})` }}
        aria-hidden="true"
      >
        <Mark shape={style.shape} className={style.fill} />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-display font-extrabold text-6xl ${style.fg}`}>
        {initial}
      </div>
    </div>
  );
}
