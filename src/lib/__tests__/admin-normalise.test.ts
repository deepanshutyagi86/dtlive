import { describe, it, expect } from "vitest";
import {
  asArray,
  normaliseAdPage,
  normaliseBlock,
  normaliseBoothSet,
  normaliseBoothSets,
  normaliseSession,
} from "../admin-normalise";

// These exist because of a real outage, not a hypothetical one.
//
// GET /api/settings returns the RAW stored JSON — NOT the shape the
// server-side getters normalise. So every field added to AdPage or
// LiveSession after a row was written arrives in the admin panel as
// undefined. `page.testimonialPicks.includes(...)` on undefined threw,
// and the entire ad-pages editor rendered the error boundary instead.
//
// The rule these lock in: an object loaded from settings must be usable
// without a single optional-chain at the point of use. If a field is
// required by the type, the normaliser supplies it.

describe("normaliseAdPage", () => {
  // The exact shape that broke it: a page saved before the proof fields
  // existed.
  it("fills every required array on a page saved before those fields existed", () => {
    const page = normaliseAdPage({ id: "p1", slug: "claude-workshop", headline: "x" });
    expect(page.bullets).toEqual([]);
    expect(page.faq).toEqual([]);
    expect(page.proofPoints).toEqual([]);
    expect(page.testimonialPicks).toEqual([]);
    expect(page.forWho).toEqual([]);
    expect(page.notForWho).toEqual([]);
    expect(page.agenda).toEqual([]);
  });

  it("survives a completely empty object", () => {
    const page = normaliseAdPage({});
    expect(page.id).toBeTruthy();
    expect(page.slug).toBe("");
    expect(page.enabled).toBe(false);
    // The operation that actually threw in production.
    expect(() => page.testimonialPicks.includes(0)).not.toThrow();
  });

  it("keeps everything a saved page already had", () => {
    const page = normaliseAdPage({
      id: "p1",
      slug: "keep-me",
      enabled: true,
      headline: "Real headline",
      price: 27,
      testimonialPicks: [0, 2],
      guarantee: "Recording included.",
    });
    expect(page.slug).toBe("keep-me");
    expect(page.enabled).toBe(true);
    expect(page.price).toBe(27);
    expect(page.testimonialPicks).toEqual([0, 2]);
    expect(page.guarantee).toBe("Recording included.");
  });

  // enabled and visible default to OFF everywhere, deliberately: a page
  // in an unrecognised shape must never be live or sellable.
  it("defaults to switched off, never on", () => {
    expect(normaliseAdPage({}).enabled).toBe(false);
    expect(normaliseAdPage({ enabled: undefined }).enabled).toBe(false);
  });
});

describe("normaliseSession / normaliseBlock", () => {
  it("fills blocks on a session that has none", () => {
    const session = normaliseSession({ id: "s1", slug: "aug-31" });
    expect(session.blocks).toEqual([]);
    expect(() => session.blocks.map((b) => b.id)).not.toThrow();
  });

  it("normalises the blocks inside a session, not just the session", () => {
    const session = normaliseSession({ id: "s1", blocks: [{ id: "b1" } as never] });
    expect(session.blocks[0].kind).toBe("register");
    expect(session.blocks[0].itemId).toBe("");
    expect(session.blocks[0].visible).toBe(false);
  });

  it("keeps a block that is genuinely revealed", () => {
    expect(normaliseBlock({ id: "b1", visible: true, kind: "paid" }).visible).toBe(true);
  });

  // The one that matters during a webinar: an unrecognised block must not
  // appear on the live page by accident.
  it("defaults a block to hidden", () => {
    expect(normaliseBlock({ id: "b1" }).visible).toBe(false);
    expect(normaliseBlock({ id: "b1", visible: undefined }).visible).toBe(false);
  });

  it("survives a session array full of junk without throwing", () => {
    const session = normaliseSession({ id: "s1", blocks: [{}, { id: "b2" }] as never });
    expect(session.blocks).toHaveLength(2);
    expect(session.blocks.every((b) => typeof b.id === "string" && b.id.length > 0)).toBe(true);
  });
});

// Found by audit, not by an outage — but the same asymmetry, and it took
// the whole Extras page down when a booth set was missing a field.
describe("normaliseBoothSet / normaliseBoothSets", () => {
  it("fills the fields whose absence crashed the editor", () => {
    const set = normaliseBoothSet({ id: "s1" });
    // LinesField calls value.join() — undefined threw here.
    expect(() => set.tracklist.join("\n")).not.toThrow();
    // PlaylistUrlField calls value.trim(); the status line calls title.trim().
    expect(() => set.youtubePlaylistUrl.trim()).not.toThrow();
    expect(() => set.title.trim()).not.toThrow();
    expect(set.live).toBe(false);
  });

  it("keeps real values and drops junk from the tracklist", () => {
    const set = normaliseBoothSet({
      id: "s1",
      title: "Late night",
      tracklist: ["one", 2, null, "three"] as never,
      live: true,
    });
    expect(set.title).toBe("Late night");
    expect(set.tracklist).toEqual(["one", "three"]);
    expect(set.live).toBe(true);
  });

  // A booth row written before the YouTube switch stores its sets under
  // `mixes`. The server still reads that; the admin panel did not, and so
  // reported "no playlists" about a room that was actually playing.
  it("reads the old `mixes` key the way the server does", () => {
    expect(normaliseBoothSets({ mixes: [{ id: "m1", title: "Old" }] })).toHaveLength(1);
    expect(normaliseBoothSets({ sets: [{ id: "s1" }] })).toHaveLength(1);
    expect(normaliseBoothSets({})).toEqual([]);
    expect(normaliseBoothSets(undefined)).toEqual([]);
  });
});

describe("asArray", () => {
  // `?? []` is not enough: these all survive it and then throw on .map.
  it("refuses everything that is not an array", () => {
    expect(asArray(undefined)).toEqual([]);
    expect(asArray(null)).toEqual([]);
    expect(asArray("a string")).toEqual([]);
    expect(asArray({ 0: "looks arrayish", length: 1 })).toEqual([]);
    expect(asArray(42)).toEqual([]);
  });

  it("passes a real array through untouched", () => {
    const rows = [{ quote: "q", who: "w" }];
    expect(asArray(rows)).toBe(rows);
  });
});
