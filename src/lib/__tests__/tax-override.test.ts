import { describe, it, expect } from "vitest";
import { DEFAULT_TAX, taxFor, taxModeFor, type TaxSettings } from "../settings-types";
import { computePricing } from "../tax";

// Per-thing GST overrides sit directly on the money path, so the rules are
// pinned here rather than trusted to read correctly.

const ON: TaxSettings = { ...DEFAULT_TAX, enabled: true, ratePercent: 18, mode: "exclusive" };
const OFF: TaxSettings = { ...DEFAULT_TAX, enabled: false, ratePercent: 18, mode: "exclusive" };

describe("taxFor", () => {
  it("follows the global switch when nothing overrides it", () => {
    expect(taxFor(ON).enabled).toBe(true);
    expect(taxFor(OFF).enabled).toBe(false);
    expect(taxFor(ON, undefined, undefined).enabled).toBe(true);
    expect(taxFor(ON, "default", "default").enabled).toBe(true);
  });

  it("lets one item switch tax off while the global switch is on", () => {
    expect(taxFor(ON, "off").enabled).toBe(false);
  });

  it("lets one item switch tax on while the global switch is off", () => {
    expect(taxFor(OFF, "on").enabled).toBe(true);
  });

  // The whole point of the ordering: pass least-specific first.
  it("gives the last override the final say", () => {
    expect(taxFor(ON, "on", "off").enabled).toBe(false);
    expect(taxFor(OFF, "off", "on").enabled).toBe(true);
  });

  it("lets a 'default' override fall through to the one before it", () => {
    // Item says off, ad page says nothing → still off.
    expect(taxFor(ON, "off", "default").enabled).toBe(false);
    expect(taxFor(ON, "off", undefined).enabled).toBe(false);
  });

  // Rate, inclusive/exclusive and B2B are properties of the BUSINESS. One
  // seller cannot charge 18% on one item and 12% on another.
  it("overrides only `enabled` — never the rate, the mode, or B2B", () => {
    const t = taxFor({ ...ON, b2bEnabled: true }, "off");
    expect(t.enabled).toBe(false);
    expect(t.ratePercent).toBe(18);
    expect(t.mode).toBe("exclusive");
    expect(t.b2bEnabled).toBe(true);
  });

  it("returns the same object when nothing changed", () => {
    expect(taxFor(ON, "on")).toBe(ON);
    expect(taxFor(ON, "default")).toBe(ON);
  });
});

describe("taxModeFor", () => {
  it("reads a real mode off an item's details", () => {
    expect(taxModeFor({ taxMode: "off" })).toBe("off");
    expect(taxModeFor({ taxMode: "on" })).toBe("on");
    expect(taxModeFor({ taxMode: "default" })).toBe("default");
  });

  // details is a schemaless JSON blob; anything unrecognised must read as
  // "no override", never crash and never accidentally switch tax ON.
  it("treats anything unrecognised as no override", () => {
    for (const bad of [undefined, null, {}, { taxMode: "" }, { taxMode: "yes" }, { taxMode: 1 }, "string", 42]) {
      expect(taxModeFor(bad), String(JSON.stringify(bad))).toBeUndefined();
    }
  });
});

// What the buyer is actually charged, end to end.
describe("an override changes the amount charged", () => {
  it("charges tax on top when the item says on and the global says off", () => {
    const p = computePricing({ listPrice: 1000, tax: taxFor(OFF, "on"), sellerStateCode: "09" });
    expect(p.taxApplied).toBe(true);
    expect(p.payable).toBe(1180);
  });

  it("charges the bare price when the item says off and the global says on", () => {
    const p = computePricing({ listPrice: 1000, tax: taxFor(ON, "off"), sellerStateCode: "09" });
    expect(p.taxApplied).toBe(false);
    expect(p.taxTotal).toBe(0);
    expect(p.payable).toBe(1000);
  });

  // The case this feature was asked for: a ₹27 ad price stays ₹27.
  it("keeps a ₹27 ad price at exactly ₹27", () => {
    const p = computePricing({ listPrice: 27, tax: taxFor(ON, undefined, "off"), sellerStateCode: "09" });
    expect(p.payable).toBe(27);
  });
});
