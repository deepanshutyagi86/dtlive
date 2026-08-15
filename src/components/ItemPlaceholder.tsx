import { Category } from "@/lib/types";

type MarkShape = "circle" | "triangle" | "square-frame" | "diamond" | "chevron";

// Field-vs-mark palette. Only ONE category (course) uses a marigold-family
// field — everything else is built from ink/bone so the carousel doesn't
// read as three orange cards in a row. venture keeps a marigold-deep note,
// but only as a thin top edge (a rule, not a field), so it never counts
// toward "marigold field" — composition (shape, scale, crop, position,
// border/edge weight) carries the rest of the differentiation between the
// five categories.
const CATEGORY_STYLE: Record<
  Category,
  {
    bg: string;
    fg: string;
    fill: string;
    stroke: string;
    containerBorder: string;
    accentEdge: string;
    shape: MarkShape;
  }
> = {
  course: { bg: "bg-marigold", fg: "text-ink", fill: "fill-ink", stroke: "stroke-ink", containerBorder: "", accentEdge: "", shape: "circle" },
  workshop: { bg: "bg-ink", fg: "text-bone", fill: "fill-bone", stroke: "stroke-bone", containerBorder: "", accentEdge: "", shape: "triangle" },
  agency: { bg: "bg-bone", fg: "text-ink", fill: "fill-ink", stroke: "stroke-ink", containerBorder: "", accentEdge: "", shape: "square-frame" },
  shop: { bg: "bg-bone", fg: "text-ink", fill: "fill-ink", stroke: "stroke-ink", containerBorder: "border-2 border-ink", accentEdge: "", shape: "diamond" },
  venture: { bg: "bg-ink", fg: "text-bone", fill: "fill-bone", stroke: "stroke-bone", containerBorder: "", accentEdge: "bg-marigold-deep", shape: "chevron" },
};

// Deterministic string hash (djb2-ish) — same seed always produces the same
// placeholder, so an item's card is stable across reloads and every page it
// appears on.
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

const ROTATIONS = [-6, -3, 0, 3, 6];

// agency's frame inset is picked from a fixed set of literal classes (not
// computed at runtime) so Tailwind's build-time scanner can actually see
// and generate them.
const AGENCY_FRAMES = [
  { box: "w-[88%] h-[88%]", pos: { top: "6%", left: "6%" } },
  { box: "w-[84%] h-[84%]", pos: { top: "8%", left: "8%" } },
  { box: "w-[80%] h-[80%]", pos: { top: "10%", left: "10%" } },
];

function Mark({
  shape,
  fillClassName,
  strokeClassName,
}: {
  shape: MarkShape;
  fillClassName: string;
  strokeClassName: string;
}) {
  switch (shape) {
    case "circle":
      return <circle cx="50" cy="50" r="42" className={fillClassName} />;
    case "triangle":
      return <polygon points="50,8 92,88 8,88" className={fillClassName} />;
    case "square-frame":
      return <rect x="9" y="9" width="82" height="82" fill="none" strokeWidth="3" className={strokeClassName} />;
    case "diamond":
      return <polygon points="50,10 90,50 50,90 10,50" className={fillClassName} />;
    case "chevron":
    default:
      return (
        <path
          d="M28 34 L50 58 L72 34 M28 62 L50 86 L72 62"
          fill="none"
          strokeWidth="7"
          className={strokeClassName}
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
  const style = CATEGORY_STYLE[category];
  const initial = title.trim().charAt(0).toUpperCase() || "?";
  const rot = ROTATIONS[h % ROTATIONS.length];

  // Each category gets its own composition — scale, crop and placement of
  // the mark — rather than one recipe repeated five times with a different
  // fill color.
  let markSizeClass = "w-[60%] h-[60%]";
  let markOpacityClass = "opacity-[0.16]";
  let markStyle: React.CSSProperties = {};
  let initialAlignClass = "items-center justify-center";
  let initialSizeClass = "text-6xl";

  switch (category) {
    case "course": {
      // Big circle, cropped by the frame edge — only an arc is visible,
      // parked in one of two opposite corners per item.
      markSizeClass = "w-[85%] h-[85%]";
      markOpacityClass = "opacity-[0.14]";
      const corner = h % 2 === 0 ? { top: "-30%", right: "-28%" } : { bottom: "-32%", left: "-26%" };
      markStyle = { ...corner, transform: `rotate(${rot}deg)` };
      break;
    }
    case "workshop": {
      // One large, near-centered triangle — deliberately the boldest, most
      // visible mark of the set. This is the treatment everything else is
      // measured against, not an outlier to soften.
      markSizeClass = "w-[72%] h-[72%]";
      markOpacityClass = "opacity-[0.22]";
      markStyle = { top: "16%", left: "14%", transform: `rotate(${rot}deg)` };
      break;
    }
    case "agency": {
      // A thin outline frame inset from the edges — architectural, not a
      // filled blob. Stays unrotated; only the inset breathes per item.
      const preset = AGENCY_FRAMES[h % AGENCY_FRAMES.length];
      markSizeClass = preset.box;
      markStyle = preset.pos;
      markOpacityClass = "opacity-[0.5]";
      initialAlignClass = "items-end justify-start";
      initialSizeClass = "text-4xl";
      break;
    }
    case "shop": {
      // Small, tight, dead-center diamond sitting right behind the
      // initial — replaces the old dashed border (which read as "missing
      // image") with a solid container edge instead.
      markSizeClass = "w-[34%] h-[34%]";
      markOpacityClass = "opacity-[0.9]";
      markStyle = { top: "33%", left: "33%", transform: `rotate(${rot}deg)` };
      break;
    }
    case "venture": {
      // Small chevron pushed into one corner, initial pushed to the
      // opposite one — the only category with a top accent edge.
      markSizeClass = "w-[46%] h-[46%]";
      markOpacityClass = "opacity-[0.35]";
      const corner = h % 2 === 0 ? { top: "-6%", left: "-4%" } : { top: "-6%", right: "-4%" };
      markStyle = { ...corner, transform: `rotate(${rot}deg)` };
      initialAlignClass = "items-end justify-end";
      initialSizeClass = "text-5xl";
      break;
    }
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${style.bg} ${style.containerBorder}`}>
      {style.accentEdge && <div className={`absolute top-0 inset-x-0 h-[5px] ${style.accentEdge}`} aria-hidden="true" />}
      <svg
        viewBox="0 0 100 100"
        className={`absolute ${markSizeClass} ${markOpacityClass}`}
        style={markStyle}
        aria-hidden="true"
      >
        <Mark shape={style.shape} fillClassName={style.fill} strokeClassName={style.stroke} />
      </svg>
      <div className={`absolute inset-0 flex ${initialAlignClass} p-[10%] font-display font-extrabold ${initialSizeClass} ${style.fg}`}>
        {initial}
      </div>
    </div>
  );
}
