import { getSetting } from "./items";
import { upsertSetting } from "./admin-repo";
import { slugify, formatBytes } from "./guide-utils";

export { slugify, formatBytes };

// Free downloadable PDFs served at /guide. Deliberately NOT a new table:
// migrations against the production Neon DB are blocked, so the whole list
// lives as one JSON value in the existing settings key/value store — the
// same mechanism ticker/testimonials/footerLinks already use.
export const GUIDES_SETTING_KEY = "guides";

export interface Guide {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Vercel Blob URL of the PDF. */
  fileUrl: string;
  /** Original filename at upload time, used as a download-name fallback. */
  fileName: string;
  fileSize: number;
  cover: string | null;
  live: boolean;
  createdAt: string;
}

// A settings value is whatever was last written to that row — treat it as
// untrusted shape, not as a Guide[]. Anything that doesn't at least carry a
// slug and a file URL is dropped rather than allowed to render a card that
// links nowhere.
function normalize(value: unknown): Guide[] {
  if (!Array.isArray(value)) return [];
  const out: Guide[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const g = raw as Record<string, unknown>;
    const slug = typeof g.slug === "string" ? g.slug : "";
    const fileUrl = typeof g.fileUrl === "string" ? g.fileUrl : "";
    if (!slug || !fileUrl) continue;
    out.push({
      id: typeof g.id === "string" && g.id ? g.id : slug,
      slug,
      title: typeof g.title === "string" ? g.title : slug,
      description: typeof g.description === "string" ? g.description : "",
      fileUrl,
      fileName: typeof g.fileName === "string" ? g.fileName : slug + ".pdf",
      fileSize: typeof g.fileSize === "number" ? g.fileSize : 0,
      cover: typeof g.cover === "string" && g.cover ? g.cover : null,
      live: g.live !== false,
      createdAt: typeof g.createdAt === "string" ? g.createdAt : new Date(0).toISOString(),
    });
  }
  return out;
}

/** Every guide, live or not — admin surfaces only. Order is array order. */
export async function getAllGuides(): Promise<Guide[]> {
  return normalize(await getSetting<unknown>(GUIDES_SETTING_KEY, []));
}

/** What the public /guide page is allowed to see. */
export async function getLiveGuides(): Promise<Guide[]> {
  return (await getAllGuides()).filter((g) => g.live);
}

export async function getLiveGuideBySlug(slug: string): Promise<Guide | null> {
  return (await getLiveGuides()).find((g) => g.slug === slug) ?? null;
}

export async function saveGuides(guides: Guide[]): Promise<void> {
  await upsertSetting(GUIDES_SETTING_KEY, guides);
}
