import { describe, it, expect } from "vitest";
import { DEFAULT_HOME, normaliseHome, resolveHome } from "../home-settings";

// GET /api/settings hands the admin panel RAW stored JSON. normaliseHome is
// the boundary that makes any stored shape — missing, partial, a string
// where an object was expected — safe to edit; resolveHome is what the
// homepage renders.

describe("normaliseHome", () => {
  it("turns nothing into a complete, blank form", () => {
    const h = normaliseHome(undefined);
    expect(h.hero.line1).toBe("");
    expect(h.cards.learn).toEqual({ url: "" });
    expect(h.studio.showcase).toEqual([]);
    expect(h.proof).toEqual([]);
    expect(h.seeker.books).toEqual([]);
  });

  it("survives junk shapes without throwing", () => {
    const h = normaliseHome({ hero: "x", cards: [], live: { host: 5 }, studio: { showcase: [null, "a", { name: 3 }] }, proof: "no" });
    expect(h.hero.line1).toBe("");
    expect(h.live.host).toEqual({ url: "" });
    expect(h.studio.showcase).toHaveLength(1);
    expect(h.studio.showcase[0].name).toBe("");
    expect(h.proof).toEqual([]);
  });

  it("accepts a bare URL string where an image object belongs", () => {
    expect(normaliseHome({ cards: { live: " https://x.public.blob.vercel-storage.com/a.webp " } }).cards.live).toEqual({
      url: "https://x.public.blob.vercel-storage.com/a.webp",
    });
  });

  it("keeps a valid focal point and drops a broken one", () => {
    expect(normaliseHome({ cards: { learn: { url: "u", focal: { x: 20, y: 30 } } } }).cards.learn.focal).toEqual({ x: 20, y: 30 });
    expect(normaliseHome({ cards: { learn: { url: "u", focal: { x: "a" } } } }).cards.learn.focal).toBeUndefined();
  });
});

describe("resolveHome", () => {
  it("renders the shipped words when nothing is saved", () => {
    const h = resolveHome({});
    expect(h.hero).toEqual(DEFAULT_HOME.hero);
    expect(h.credos).toEqual(DEFAULT_HOME.credos);
    expect(h.seeker.books).toEqual(DEFAULT_HOME.seeker.books);
  });

  it("treats whitespace as blank", () => {
    expect(resolveHome({ hero: { line1: "   " } }).hero.line1).toBe(DEFAULT_HOME.hero.line1);
    expect(resolveHome({ credos: ["", "  "] }).credos).toEqual(DEFAULT_HOME.credos);
  });

  it("uses saved text over defaults", () => {
    expect(resolveHome({ hero: { line1: "I build." } }).hero.line1).toBe("I build.");
  });

  it("drops showcase entries with no screenshot and empty proof rows", () => {
    const h = resolveHome({
      studio: { showcase: [{ name: "a" }, { name: "b", desktop: { url: "d" } }] },
      proof: [{ text: "" }, { text: " 100+ students " }],
    });
    expect(h.studio.showcase.map((s) => s.name)).toEqual(["b"]);
    expect(h.proof).toEqual([{ text: "100+ students", image: { url: "" } }]);
  });
});
