import { describe, expect, it } from "vitest";
import { computePricing, isValidGstin } from "@/lib/tax";
import type { TaxSettings } from "@/lib/settings-types";

const MODES: TaxSettings["mode"][] = ["inclusive", "exclusive"];
const RATES = [0, 5, 12, 18, 28];
const PRICES = [1, 49, 999, 6999, 12345.67];
const DISCOUNTS = [0, 1, 500, 1000];

function tax(mode: TaxSettings["mode"], ratePercent: number): TaxSettings {
  return { enabled: true, ratePercent, mode, display: "plus-gst", b2bEnabled: false, b2bPrompt: "" };
}

describe("computePricing", () => {
  for (const mode of MODES) {
    for (const ratePercent of RATES) {
      for (const listPrice of PRICES) {
        for (const discount of DISCOUNTS) {
          if (discount >= listPrice) continue; // a coupon can't discount the whole price away in real usage

          it(`mode=${mode} rate=${ratePercent} price=${listPrice} discount=${discount}: charged == displayed == invoiceable`, () => {
            const pricing = computePricing({ listPrice, discount, tax: tax(mode, ratePercent), sellerStateCode: "09" });

            // "Charged" — what Razorpay is asked to collect, in paise.
            expect(pricing.payablePaise).toBe(Math.round(pricing.payable * 100));
            expect(Number.isInteger(pricing.payablePaise)).toBe(true);

            // "Displayed" — the same `payable` rupee figure the checkout modal renders.
            expect(pricing.payable).toBeCloseTo(pricing.taxableValue + pricing.taxTotal, 2);

            // "Invoiced" — CGST + SGST (or IGST) must reconstruct the tax total exactly,
            // and taxable + tax must reconstruct what was actually paid.
            expect(pricing.cgst + pricing.sgst + pricing.igst).toBeCloseTo(pricing.taxTotal, 10);
            expect(pricing.taxableValue + pricing.taxTotal).toBeCloseTo(pricing.payable, 10);
          });
        }
      }
    }
  }

  it("cgst + sgst === taxTotal exactly on an odd-paisa amount (intra-state)", () => {
    // 49 * 5% = 2.45 — an odd number of paise, so a naive half/half split
    // rounds each side independently and drifts from the total by a paisa.
    const pricing = computePricing({ listPrice: 49, tax: tax("exclusive", 5), sellerStateCode: "09" });
    expect(pricing.taxTotal).toBe(2.45);
    expect(pricing.igst).toBe(0);
    expect(pricing.cgst + pricing.sgst).toBe(pricing.taxTotal);
  });

  it("splits as IGST, not CGST+SGST, across state lines", () => {
    const pricing = computePricing({
      listPrice: 49,
      tax: tax("exclusive", 5),
      sellerStateCode: "09",
      buyerStateCode: "27",
    });
    expect(pricing.cgst).toBe(0);
    expect(pricing.sgst).toBe(0);
    expect(pricing.igst).toBe(pricing.taxTotal);
  });

  it("a coupon discounts the taxable base, and GST is computed on what's left", () => {
    const withoutCoupon = computePricing({ listPrice: 6999, tax: tax("exclusive", 18), sellerStateCode: "09" });
    const withCoupon = computePricing({ listPrice: 6999, discount: 1000, tax: tax("exclusive", 18), sellerStateCode: "09" });

    expect(withCoupon.taxableValue).toBe(6999 - 1000);
    // GST must be 18% of the discounted base, never the original price.
    expect(withCoupon.taxTotal).toBe(Math.round(withCoupon.taxableValue * 0.18 * 100) / 100);
    expect(withCoupon.taxTotal).toBeLessThan(withoutCoupon.taxTotal);
    expect(withCoupon.payable).toBe(withCoupon.taxableValue + withCoupon.taxTotal);
  });

  it("tax disabled: the buyer pays exactly the listed price minus discount, no GST at all", () => {
    const pricing = computePricing({
      listPrice: 999,
      discount: 100,
      tax: { enabled: false, ratePercent: 18, mode: "exclusive", display: "plus-gst", b2bEnabled: false, b2bPrompt: "" },
      sellerStateCode: "09",
    });
    expect(pricing.taxTotal).toBe(0);
    expect(pricing.payable).toBe(899);
    expect(pricing.taxApplied).toBe(false);
  });
});

describe("isValidGstin", () => {
  const REAL = "09HXMPD1277C1ZF";

  it("accepts a real, checksum-valid GSTIN", () => {
    expect(isValidGstin(REAL)).toBe(true);
  });

  it("rejects a garbage string", () => {
    expect(isValidGstin("not-a-gstin")).toBe(false);
  });

  it("accepts exactly 1 of the 36 possible checksum characters", () => {
    const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const base = REAL.slice(0, -1);
    const passing = [...ALPHABET].filter((ch) => isValidGstin(base + ch));
    expect(passing).toEqual([REAL.slice(-1)]);
  });
});
