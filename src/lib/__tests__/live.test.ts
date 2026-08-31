import { describe, it, expect } from "vitest";
import {
  activeLiveSession,
  isLiveDeadlinePassed,
  liveSessionBySlug,
  liveSourceTag,
  resolveLiveOffer,
  type LiveBlock,
  type LiveSettings,
} from "../settings-types";

// resolveLiveOffer is the price gate: the browser sends ids, this decides
// what may be charged. Every test below is a way someone could get a
// webinar price they were not entitled to.

function block(over: Partial<LiveBlock> = {}): LiveBlock {
  return { id: "b1", kind: "paid", itemId: "item-1", visible: true, overridePrice: 999, ...over };
}

function settings(over: Partial<LiveSettings> = {}, blocks: LiveBlock[] = [block()]): LiveSettings {
  return {
    enabled: true,
    holdingLine: "",
    sessions: [
      { id: "s1", slug: "aug-31", title: "", subtitle: "", active: true, blocks },
    ],
    ...over,
  };
}

describe("resolveLiveOffer", () => {
  it("gives the webinar price for a visible block on a real session", () => {
    expect(resolveLiveOffer(settings(), "aug-31", "b1", "item-1")?.price).toBe(999);
  });

  it("treats ₹0 as a real price, not as absent", () => {
    const s = settings({}, [block({ overridePrice: 0 })]);
    expect(resolveLiveOffer(s, "aug-31", "b1", "item-1")?.price).toBe(0);
  });

  it("falls back to the item's own price when the block sets none", () => {
    const s = settings({}, [block({ overridePrice: undefined })]);
    expect(resolveLiveOffer(s, "aug-31", "b1", "item-1")).toBeNull();
  });

  // The reveal switch has to gate the PRICE, not just the pixels. A block
  // that hasn't been revealed yet is readable in the page source long
  // before it is pitched.
  it("refuses a block that has not been revealed", () => {
    const s = settings({}, [block({ visible: false })]);
    expect(resolveLiveOffer(s, "aug-31", "b1", "item-1")).toBeNull();
  });

  it("refuses a block whose deadline has passed", () => {
    const s = settings({}, [block({ deadlineIso: new Date(Date.now() - 60_000).toISOString() })]);
    expect(resolveLiveOffer(s, "aug-31", "b1", "item-1")).toBeNull();
  });

  it("honours a block whose deadline is still ahead", () => {
    const s = settings({}, [block({ deadlineIso: new Date(Date.now() + 60_000).toISOString() })]);
    expect(resolveLiveOffer(s, "aug-31", "b1", "item-1")?.price).toBe(999);
  });

  // The attack this exists for: quote a cheap block's id against an
  // expensive item and pay ₹999 for the ₹6,999 course.
  it("refuses a block pointed at a different item", () => {
    expect(resolveLiveOffer(settings(), "aug-31", "b1", "item-2")).toBeNull();
  });

  it("refuses everything when live is switched off entirely", () => {
    expect(resolveLiveOffer(settings({ enabled: false }), "aug-31", "b1", "item-1")).toBeNull();
  });

  it("refuses unknown sessions, unknown blocks, and missing ids", () => {
    const s = settings();
    expect(resolveLiveOffer(s, "nope", "b1", "item-1")).toBeNull();
    expect(resolveLiveOffer(s, "aug-31", "nope", "item-1")).toBeNull();
    expect(resolveLiveOffer(s, null, "b1", "item-1")).toBeNull();
    expect(resolveLiveOffer(s, "aug-31", undefined, "item-1")).toBeNull();
  });
});

describe("isLiveDeadlinePassed", () => {
  it("is false when there is no deadline at all", () => {
    expect(isLiveDeadlinePassed(block())).toBe(false);
  });

  // A typo in the admin panel must not silently kill a live offer
  // mid-webinar. Unparseable reads as "no deadline", not as "expired".
  it("is false for an unparseable deadline", () => {
    expect(isLiveDeadlinePassed(block({ deadlineIso: "not a date" }))).toBe(false);
  });
});

describe("session lookup", () => {
  it("resolves /live to the first active session", () => {
    expect(activeLiveSession(settings())?.slug).toBe("aug-31");
  });

  it("returns nothing for /live when the master switch is off", () => {
    expect(activeLiveSession(settings({ enabled: false }))).toBeNull();
  });

  // A finished webinar stops being THE live page but keeps working at its
  // own URL — that is what makes a replay page possible.
  it("still resolves a past session by slug once it is no longer active", () => {
    const s = settings();
    s.sessions[0].active = false;
    expect(activeLiveSession(s)).toBeNull();
    expect(liveSessionBySlug(s, "aug-31")?.slug).toBe("aug-31");
  });
});

describe("liveSourceTag", () => {
  it("formats the tag the admin filter will search for", () => {
    expect(liveSourceTag("aug-31")).toBe("live:aug-31");
  });
});
