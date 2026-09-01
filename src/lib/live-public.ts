// The ONE place that decides what a visitor to /live is allowed to see.
//
// Both the server-rendered page and the polling API route call
// publicLiveSession(). That is deliberate and load-bearing: the page and
// the poll must produce byte-identical shapes, because the poll's job is
// to replace what the page rendered. Two hand-written mappings would
// drift, and the drift would only show up mid-webinar.
//
// Everything hidden is dropped HERE, on the server, before serialisation.
// A block that has not been revealed yet is not "display:none" in the
// markup — it is absent from the payload entirely. Anyone reading the
// page source during the first forty minutes of a webinar sees nothing
// about the offer that hasn't been pitched, and the price gate in
// resolveLiveOffer() refuses to sell it in any case.

import { getItemById } from "./items";
import { getTaxSettingsForDisplay } from "./site-settings";
import { formatRupees, priceLabel as taxPriceLabel } from "./tax";
import { isLiveDeadlinePassed, type LiveBlock, type LiveSession } from "./settings-types";
import {
  CATEGORY_CTA,
  DEFAULT_REGISTRATION_FIELDS,
  type Category,
  type ImageFocal,
  type RegistrationField,
} from "./types";

export interface PublicLiveBlock {
  id: string;
  kind: "paid" | "register" | "link";
  itemId: string;
  itemSlug: string;
  title: string;
  blurb: string;
  thumbnail: string | null;
  imageFocal: ImageFocal | null;
  category: Category;
  /** Already formatted and tax-adjusted. The browser does no arithmetic. */
  priceLabel: string | null;
  strikeLabel: string | null;
  badge: string | null;
  scarcity: string | null;
  deadlineIso: string | null;
  ctaLabel: string;
  externalUrl: string | null;
  /**
   * The item's own registration form, carried in the payload.
   *
   * It used to be resolved once, server-side, for the blocks visible at
   * first render — so a register block REVEALED during the webinar
   * arrived with nothing and silently fell back to the default name/
   * email/phone form. The custom questions were never asked, in exactly
   * the scenario the reveal mechanic exists for.
   */
  registrationFields: RegistrationField[] | null;
}

export interface PublicLiveSession {
  slug: string;
  title: string;
  subtitle: string;
  heroImageUrl: string | null;
  imageFocal: ImageFocal | null;
  startsAtIso: string | null;
  joinUrl: string | null;
  holdingLine: string;
  blocks: PublicLiveBlock[];
}

export async function publicLiveSession(
  session: LiveSession,
  holdingLine: string
): Promise<PublicLiveSession> {
  const tax = await getTaxSettingsForDisplay();

  const visible = session.blocks.filter((b) => b.visible && !isLiveDeadlinePassed(b));

  const blocks = await Promise.all(visible.map((b) => publicBlock(b, tax)));

  return {
    slug: session.slug,
    title: session.title,
    subtitle: session.subtitle,
    heroImageUrl: session.heroImageUrl ?? null,
    imageFocal: session.imageFocal ?? null,
    startsAtIso: session.startsAtIso ?? null,
    joinUrl: session.joinUrl ?? null,
    holdingLine,
    // A block whose item was deleted or unpublished resolves to null and
    // is dropped, rather than rendering a card that 404s on click.
    blocks: blocks.filter((b): b is PublicLiveBlock => b !== null),
  };
}

async function publicBlock(
  block: LiveBlock,
  tax: Awaited<ReturnType<typeof getTaxSettingsForDisplay>>
): Promise<PublicLiveBlock | null> {
  // A pure link block sells nothing, so it needs no item behind it.
  if (block.kind === "link") {
    if (!block.externalUrl) return null;
    return {
      id: block.id,
      kind: "link",
      itemId: "",
      itemSlug: "",
      title: block.headline || "",
      blurb: block.blurb || "",
      thumbnail: null,
      imageFocal: null,
      category: "course",
      priceLabel: null,
      strikeLabel: null,
      badge: block.badge ?? null,
      scarcity: block.scarcity ?? null,
      deadlineIso: block.deadlineIso ?? null,
      ctaLabel: block.ctaLabel || "Open",
      externalUrl: block.externalUrl,
      registrationFields: null,
    };
  }

  const item = await getItemById(block.itemId);
  if (!item || !item.live) return null;

  const details = item.details as { price?: number; imageFocal?: ImageFocal };
  const price = block.overridePrice !== undefined ? block.overridePrice : details.price;

  // A "paid" block at ₹0 has nothing to charge. Rather than send the
  // buyer to a checkout that will refuse the amount, it is dropped and
  // the admin panel warns about it at the point of editing.
  if (block.kind === "paid" && (!Number.isFinite(price) || (price as number) <= 0)) return null;

  return {
    id: block.id,
    kind: block.kind,
    itemId: item.id,
    itemSlug: item.slug,
    title: block.headline || item.title,
    blurb: block.blurb || item.description,
    thumbnail: item.thumbnail,
    imageFocal: details.imageFocal ?? null,
    category: item.category,
    priceLabel: block.kind === "paid" ? taxPriceLabel(price as number, tax) : null,
    // Struck through beside the price. Only shown when it is actually
    // higher than what is being charged — a "discount" that isn't one
    // is the fastest way to lose a room's trust.
    strikeLabel:
      block.kind === "paid" && block.strikePrice && block.strikePrice > (price as number)
        ? formatRupees(block.strikePrice)
        : null,
    badge: block.badge ?? null,
    scarcity: block.scarcity ?? null,
    deadlineIso: block.deadlineIso ?? null,
    ctaLabel: block.ctaLabel || (block.kind === "register" ? "Register free" : CATEGORY_CTA[item.category]),
    externalUrl: null,
    // Only for register blocks — a paid block has no form of its own, and
    // shipping one would be a field list in the payload for nothing.
    registrationFields:
      block.kind === "register"
        ? (item.details as { registrationFields?: RegistrationField[] }).registrationFields?.length
          ? (item.details as { registrationFields: RegistrationField[] }).registrationFields
          : DEFAULT_REGISTRATION_FIELDS
        : null,
  };
}
