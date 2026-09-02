// Regression tests for the ₹0-GST tax invoice.
//
// A real ₹27 order rendered a tax invoice reading "GST @ 0%" under a live
// GSTIN, because the invoice page's no-snapshot fallback zeroed the rate
// whenever GST charging was switched off, while the checkout snapshot for
// the same sale backed the tax out of the amount paid. Two halves, two
// answers, and the one that reached the customer was the wrong one.
import { describe, expect, it } from "vitest";
import { declaredRatePercent, deemedInclusiveSplit, computePricing } from "../tax";
import { computeInvoice } from "../invoice";
import { quoteOrder } from "../checkout-pricing";
import { DEFAULT_TAX, taxFor } from "../settings-types";
import type { TaxSettings } from "../settings-types";

const GSTIN = "09HXMPD1277C1ZF";
const registered: TaxSettings = { ...DEFAULT_TAX, ratePercent: 18, enabled: false };

describe("declaredRatePercent", () => {
  it("declares the configured rate even when GST is not charged on top", () => {
    expect(declaredRatePercent({ ...registered, enabled: false }, GSTIN)).toBe(18);
  });

  it("declares the same rate when charging is on", () => {
    expect(declaredRatePercent({ ...registered, enabled: true }, GSTIN)).toBe(18);
  });

  it("is unaffected by a per-item or per-campaign override", () => {
    const off = taxFor({ ...registered, enabled: true }, "off");
    const on = taxFor({ ...registered, enabled: false }, "on");
    expect(declaredRatePercent(off, GSTIN)).toBe(18);
    expect(declaredRatePercent(on, GSTIN)).toBe(18);
  });

  it("declares nothing when the seller has no GSTIN", () => {
    expect(declaredRatePercent(registered, "")).toBe(0);
    expect(declaredRatePercent(registered, "   ")).toBe(0);
  });

  it("never returns a negative or non-finite rate", () => {
    expect(declaredRatePercent({ ...registered, ratePercent: -5 }, GSTIN)).toBe(0);
    expect(declaredRatePercent({ ...registered, ratePercent: NaN }, GSTIN)).toBe(0);
  });
});

describe("deemedInclusiveSplit", () => {
  it("splits ₹27 at 18% the way the invoice must show it", () => {
    const s = deemedInclusiveSplit(27, 18, true);
    expect(s.taxableValue).toBe(22.88);
    expect(s.taxTotal).toBe(4.12);
    expect(s.cgst).toBe(2.06);
    expect(s.sgst).toBe(2.06);
    expect(s.igst).toBe(0);
    expect(s.taxableValue + s.taxTotal).toBeCloseTo(27, 2);
  });

  it("keeps cgst + sgst exactly equal to the total on an odd paisa", () => {
    for (const paid of [27, 99, 199, 499, 999, 1499, 6999, 1]) {
      const s = deemedInclusiveSplit(paid, 18, true);
      expect(s.cgst + s.sgst).toBeCloseTo(s.taxTotal, 10);
      expect(s.taxableValue + s.taxTotal).toBeCloseTo(paid, 2);
    }
  });

  it("puts the whole tax in IGST for an out-of-state buyer", () => {
    const s = deemedInclusiveSplit(27, 18, false);
    expect(s.igst).toBe(4.12);
    expect(s.cgst).toBe(0);
    expect(s.sgst).toBe(0);
  });

  it("declares nothing at a zero rate, and still totals the amount paid", () => {
    const s = deemedInclusiveSplit(27, 0, true);
    expect(s.taxableValue).toBe(27);
    expect(s.taxTotal).toBe(0);
  });
});

describe("the ₹27 ad sale, end to end", () => {
  // The ad page is set to "Never charge GST here" so the advertised ₹27 is
  // the amount charged.
  const effective = taxFor({ ...DEFAULT_TAX, ratePercent: 18, enabled: false }, undefined, "off");

  const quote = quoteOrder({
    listPrice: 27,
    itemId: "claude-01",
    coupons: [],
    tax: effective,
    sellerStateCode: "09",
    sellerGstin: GSTIN,
  });

  it("charges exactly the advertised price", () => {
    expect(quote.ok).toBe(true);
    expect(quote.pricing.payable).toBe(27);
    expect(quote.pricing.payablePaise).toBe(2700);
  });

  it("freezes a snapshot that declares GST rather than zero", () => {
    expect(quote.snapshot.ratePercent).toBe(18);
    expect(quote.snapshot.taxableValue).toBe(22.88);
    expect(quote.snapshot.taxTotal).toBe(4.12);
    expect(quote.snapshot.mode).toBe("inclusive");
  });

  it("renders the same numbers from the snapshot", () => {
    const calc = computeInvoice(0, 27, true, quote.snapshot);
    expect(calc.fromSnapshot).toBe(true);
    expect(calc.ratePercent).toBe(18);
    expect(calc.taxTotal).toBe(4.12);
    expect(calc.grandTotal).toBe(27);
  });

  // This is the exact order that produced the broken invoice: created
  // before the tax_details migration was run, so there is no snapshot.
  it("renders the same numbers WITHOUT a snapshot", () => {
    const fallbackRate = declaredRatePercent(effective, GSTIN);
    const calc = computeInvoice(fallbackRate, 27, true, null);
    expect(calc.fromSnapshot).toBe(false);
    expect(calc.ratePercent).toBe(18);
    expect(calc.taxableValue).toBe(22.88);
    expect(calc.taxTotal).toBe(4.12);
    expect(calc.cgst).toBe(2.06);
    expect(calc.sgst).toBe(2.06);
    expect(calc.grandTotal).toBe(27);
  });

  it("agrees with itself whether or not the snapshot survived", () => {
    const withSnap = computeInvoice(0, 27, true, quote.snapshot);
    const without = computeInvoice(declaredRatePercent(effective, GSTIN), 27, true, null);
    expect(without.taxableValue).toBe(withSnap.taxableValue);
    expect(without.taxTotal).toBe(withSnap.taxTotal);
    expect(without.cgst).toBe(withSnap.cgst);
    expect(without.sgst).toBe(withSnap.sgst);
    expect(without.ratePercent).toBe(withSnap.ratePercent);
  });

  it("never issues a tax invoice declaring zero under a live GSTIN", () => {
    const calc = computeInvoice(declaredRatePercent(effective, GSTIN), 27, true, null);
    expect(calc.taxTotal).toBeGreaterThan(0);
  });
});

describe("charging GST on top still works", () => {
  const on = taxFor({ ...DEFAULT_TAX, ratePercent: 18, enabled: true }, undefined, "on");

  it("adds 18% to ₹27 and declares it on the taxable value", () => {
    const q = quoteOrder({
      listPrice: 27,
      itemId: "claude-01",
      coupons: [],
      tax: on,
      sellerStateCode: "09",
      sellerGstin: GSTIN,
    });
    expect(q.pricing.payable).toBe(31.86);
    expect(q.snapshot.taxableValue).toBe(27);
    expect(q.snapshot.taxTotal).toBe(4.86);
    expect(q.snapshot.mode).toBe("exclusive");
  });

  it("leaves computePricing itself unchanged", () => {
    const p = computePricing({ listPrice: 27, tax: on, sellerStateCode: "09" });
    expect(p.taxApplied).toBe(true);
    expect(p.payable).toBe(31.86);
  });
});

describe("an unregistered seller", () => {
  it("declares nothing, and the invoice totals the amount paid", () => {
    const calc = computeInvoice(declaredRatePercent(registered, ""), 27, true, null);
    expect(calc.taxTotal).toBe(0);
    expect(calc.taxableValue).toBe(27);
    expect(calc.grandTotal).toBe(27);
  });
});
