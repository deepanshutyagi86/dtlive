import { describe, expect, it } from "vitest";
import { applyCoupon, markCouponUsed } from "@/lib/coupons";
import { computePricing } from "@/lib/tax";
import type { Coupon } from "@/lib/settings-types";

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return { code: "SAVE10", type: "percent", value: 10, appliesTo: [], active: true, ...overrides };
}

describe("applyCoupon", () => {
  it("computes a percent discount off the order amount", () => {
    const result = applyCoupon([coupon({ value: 10 })], "SAVE10", "item-1", 1000);
    expect(result.ok).toBe(true);
    expect(result.discount).toBe(100);
    expect(result.payable).toBe(900);
  });

  it("computes a flat discount", () => {
    const result = applyCoupon([coupon({ type: "flat", value: 200 })], "SAVE10", "item-1", 1000);
    expect(result.ok).toBe(true);
    expect(result.discount).toBe(200);
    expect(result.payable).toBe(800);
  });

  it("is case- and whitespace-insensitive on the code", () => {
    const result = applyCoupon([coupon()], "  save10  ", "item-1", 1000);
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown code", () => {
    expect(applyCoupon([coupon()], "NOPE", "item-1", 1000).ok).toBe(false);
  });

  it("rejects an inactive coupon", () => {
    expect(applyCoupon([coupon({ active: false })], "SAVE10", "item-1", 1000).ok).toBe(false);
  });

  it("rejects an expired coupon", () => {
    expect(applyCoupon([coupon({ expiresAt: "2020-01-01" })], "SAVE10", "item-1", 1000).ok).toBe(false);
  });

  it("accepts a coupon that expires today, through end of day IST", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(applyCoupon([coupon({ expiresAt: today })], "SAVE10", "item-1", 1000).ok).toBe(true);
  });

  it("rejects once maxUses is reached", () => {
    const c = coupon({ maxUses: 2, usedCount: 2 });
    expect(applyCoupon([c], "SAVE10", "item-1", 1000).ok).toBe(false);
  });

  it("rejects an item not in appliesTo", () => {
    const c = coupon({ appliesTo: ["item-2"] });
    expect(applyCoupon([c], "SAVE10", "item-1", 1000).ok).toBe(false);
  });

  it("rejects an order below minAmount", () => {
    const c = coupon({ minAmount: 5000 });
    expect(applyCoupon([c], "SAVE10", "item-1", 1000).ok).toBe(false);
  });

  it("never discounts below minPayable", () => {
    const c = coupon({ type: "percent", value: 99, minPayable: 500 });
    const result = applyCoupon([c], "SAVE10", "item-1", 1000);
    expect(result.ok).toBe(true);
    expect(result.payable).toBe(500);
  });

  it("never discounts below the ₹1 Razorpay floor when no minPayable is set", () => {
    const c = coupon({ type: "flat", value: 100000 });
    const result = applyCoupon([c], "SAVE10", "item-1", 10);
    expect(result.ok).toBe(true);
    expect(result.payable).toBe(1);
  });

  it("markCouponUsed increments only the matching code", () => {
    const coupons = [coupon({ code: "A", usedCount: 0 }), coupon({ code: "B", usedCount: 5 })];
    const next = markCouponUsed(coupons, "a");
    expect(next.find((c) => c.code === "A")!.usedCount).toBe(1);
    expect(next.find((c) => c.code === "B")!.usedCount).toBe(5);
  });

  it("a coupon's rupee discount feeds into computePricing as the taxable-base discount, so GST is charged on the discounted amount, never the original price", () => {
    const listPrice = 6999;
    const applied = applyCoupon([coupon({ type: "flat", value: 1000 })], "SAVE10", "item-1", listPrice);
    expect(applied.ok).toBe(true);

    const pricing = computePricing({
      listPrice,
      discount: applied.discount,
      tax: { enabled: true, ratePercent: 18, mode: "exclusive", display: "plus-gst", b2bEnabled: false, b2bPrompt: "" },
      sellerStateCode: "09",
    });

    expect(pricing.taxableValue).toBe(listPrice - applied.discount);
    expect(pricing.taxTotal).toBe(Math.round(pricing.taxableValue * 0.18 * 100) / 100);
  });
});
