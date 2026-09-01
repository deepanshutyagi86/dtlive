import { afterEach, describe, expect, it, vi } from "vitest";
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

  // Expiry is authored as a plain date and means "usable through the whole
  // of that day in India". These pin the two edges of that day against a
  // frozen clock rather than against whatever time the suite happens to
  // run at — the previous version of this test derived "today" from
  // toISOString(), which is the UTC date, and so failed every day between
  // 00:00 and 05:30 IST when UTC is still on the previous date. The
  // production code was right; the test was measuring the wrong day.
  describe("end-of-day IST expiry", () => {
    // 2026-08-31T18:29:59Z is 2026-08-31 23:59:59 IST — the last second
    // a coupon dated 2026-08-31 is usable.
    const lastSecondIST = new Date("2026-08-31T18:29:59.000Z");
    // One second later: 2026-09-01 00:00:00 IST. Same UTC *date*, next
    // Indian day. This is the case a UTC-based check gets wrong.
    const firstSecondNextDayIST = new Date("2026-08-31T18:30:00.000Z");
    // 2026-08-31 02:00 IST — early morning in India, while UTC still
    // reads 2026-08-30. The window the old test broke in.
    const earlyMorningIST = new Date("2026-08-30T20:30:00.000Z");

    afterEach(() => vi.useRealTimers());

    function at(when: Date) {
      vi.useFakeTimers();
      vi.setSystemTime(when);
    }

    it("accepts through the last second of the expiry day", () => {
      at(lastSecondIST);
      expect(applyCoupon([coupon({ expiresAt: "2026-08-31" })], "SAVE10", "item-1", 1000).ok).toBe(true);
    });

    it("rejects one second into the next Indian day", () => {
      at(firstSecondNextDayIST);
      expect(applyCoupon([coupon({ expiresAt: "2026-08-31" })], "SAVE10", "item-1", 1000).ok).toBe(false);
    });

    it("accepts early on the expiry morning, when UTC still reads yesterday", () => {
      at(earlyMorningIST);
      expect(applyCoupon([coupon({ expiresAt: "2026-08-31" })], "SAVE10", "item-1", 1000).ok).toBe(true);
    });

    // A corrupt date must not read as "valid forever" — the opposite of
    // what anyone typing into an expiry field intends.
    it("rejects an unparseable expiry rather than ignoring it", () => {
      at(lastSecondIST);
      expect(applyCoupon([coupon({ expiresAt: "not-a-date" })], "SAVE10", "item-1", 1000).ok).toBe(false);
    });
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
