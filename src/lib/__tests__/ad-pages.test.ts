import { describe, it, expect } from "vitest";
import {
  adPageBySlug,
  adSourceTag,
  isOfferSellable,
  resolveAdOffer,
  type AdPage,
  type AdPagesSettings,
} from "../settings-types";

// resolveAdOffer is the price gate for /w, the pages paid ad traffic lands
// on. Every test here is a way someone could get an ad price they were
// not entitled to.

function page(over: Partial<AdPage> = {}): AdPage {
  return {
    id: "p1",
    slug: "claude-workshop",
    enabled: true,
    headline: "",
    subheadline: "",
    itemId: "item-1",
    kind: "paid",
    price: 27,
    ctaLabel: "",
    bullets: [],
    faq: [],
    proofPoints: [],
    testimonialPicks: [],
    forWho: [],
    notForWho: [],
    agenda: [],
    ...over,
  };
}

const settings = (p: AdPage = page()): AdPagesSettings => ({ pages: [p] });

describe("resolveAdOffer", () => {
  it("gives the ad price for a live page", () => {
    expect(resolveAdOffer(settings(), "claude-workshop", "item-1")?.price).toBe(27);
  });

  it("treats ₹0 as a real price, not as absent", () => {
    expect(resolveAdOffer(settings(page({ price: 0 })), "claude-workshop", "item-1")?.price).toBe(0);
  });

  it("falls back to the item's own price when the page sets none", () => {
    expect(resolveAdOffer(settings(page({ price: undefined })), "claude-workshop", "item-1")).toBeNull();
  });

  // The attack this exists for: quote the ₹27 workshop page against the
  // ₹6,999 course and pay ₹27 for it.
  it("refuses a page pointed at a different item", () => {
    expect(resolveAdOffer(settings(), "claude-workshop", "item-2")).toBeNull();
  });

  it("refuses a switched-off page", () => {
    expect(resolveAdOffer(settings(page({ enabled: false })), "claude-workshop", "item-1")).toBeNull();
  });

  // A campaign that ended must stop selling at its campaign price, not
  // merely stop counting down.
  it("refuses a page whose deadline has passed", () => {
    const expired = page({ deadlineIso: new Date(Date.now() - 60_000).toISOString() });
    expect(resolveAdOffer(settings(expired), "claude-workshop", "item-1")).toBeNull();
  });

  it("honours a page whose deadline is still ahead", () => {
    const live = page({ deadlineIso: new Date(Date.now() + 60_000).toISOString() });
    expect(resolveAdOffer(settings(live), "claude-workshop", "item-1")?.price).toBe(27);
  });

  it("refuses unknown slugs and missing ones", () => {
    expect(resolveAdOffer(settings(), "nope", "item-1")).toBeNull();
    expect(resolveAdOffer(settings(), null, "item-1")).toBeNull();
    expect(resolveAdOffer(settings(), undefined, "item-1")).toBeNull();
  });
});

describe("adPageBySlug", () => {
  it("hides a switched-off page from the public lookup entirely", () => {
    expect(adPageBySlug(settings(page({ enabled: false })), "claude-workshop")).toBeNull();
  });
});

describe("adSourceTag", () => {
  it("formats the tag the signups view searches for", () => {
    expect(adSourceTag("claude-workshop")).toBe("ad:claude-workshop");
  });

  // /live and /w must never collide in the source column — the two
  // surfaces are reported on separately.
  it("cannot collide with a live session tag", () => {
    expect(adSourceTag("x").startsWith("live:")).toBe(false);
  });
});

// The shared predicate. /live blocks and /w pages both route through it,
// so a rule added here is added to both surfaces at once — which is the
// entire reason it was factored out.
describe("isOfferSellable", () => {
  const base = { live: true, itemId: "item-1" };

  it("passes a live offer for the right item with no deadline", () => {
    expect(isOfferSellable(base, "item-1")).toBe(true);
  });

  it("fails when switched off, or aimed at another item", () => {
    expect(isOfferSellable({ ...base, live: false }, "item-1")).toBe(false);
    expect(isOfferSellable(base, "item-2")).toBe(false);
  });

  it("fails past the deadline and passes before it", () => {
    const past = { ...base, deadlineIso: "2020-01-01T00:00:00.000Z" };
    const future = { ...base, deadlineIso: "2099-01-01T00:00:00.000Z" };
    expect(isOfferSellable(past, "item-1")).toBe(false);
    expect(isOfferSellable(future, "item-1")).toBe(true);
  });

  // A typo in the admin panel must not silently kill a live offer.
  it("treats an unparseable deadline as no deadline, never as expired", () => {
    expect(isOfferSellable({ ...base, deadlineIso: "not a date" }, "item-1")).toBe(true);
  });
});
