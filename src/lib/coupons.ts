// Pure coupon resolution. No DB access here on purpose so the checkout
// modal can show the same wording the server will apply.
//
// SECURITY NOTE: the client only ever *previews* a discount. The amount
// actually charged is recomputed here on the server inside
// /api/checkout/create-order from the item's own price. A tampered client
// can change what it displays and nothing else.

import type { Coupon } from "./settings-types";

export interface CouponResult {
  ok: boolean;
  reason?: string;
  code?: string;
  /** Rupees taken off. */
  discount: number;
  /** Rupees actually payable after the discount. */
  payable: number;
  label?: string;
}

function endOfDayIST(isoDate: string): number {
  // Coupon expiry is authored as a plain date in the admin panel and must
  // mean "usable through the whole of that day in India" — not "expires at
  // 05:30 IST", which is what a naive UTC midnight parse would produce.
  const d = new Date(`${isoDate}T23:59:59+05:30`);
  return d.getTime();
}

export function findCoupon(coupons: Coupon[], code: string): Coupon | null {
  const wanted = code.trim().toUpperCase();
  if (!wanted) return null;
  return coupons.find((c) => (c.code ?? "").trim().toUpperCase() === wanted) ?? null;
}

/**
 * @param amount  order value in RUPEES (not paise)
 */
export function applyCoupon(
  coupons: Coupon[],
  rawCode: string,
  itemId: string,
  amount: number
): CouponResult {
  const none: CouponResult = { ok: false, discount: 0, payable: amount };

  const code = rawCode.trim().toUpperCase();
  if (!code) return { ...none, reason: "Enter a code." };

  const coupon = findCoupon(coupons, code);
  if (!coupon) return { ...none, reason: "That code isn't valid." };
  if (!coupon.active) return { ...none, reason: "That code is no longer active." };

  if (coupon.expiresAt) {
    const expiry = endOfDayIST(coupon.expiresAt);
    // Fails CLOSED: an unparseable date used to skip the check entirely,
    // which made a corrupt expiry mean "valid forever" - the opposite of
    // what anyone typing a date into an expiry field intends.
    if (Number.isNaN(expiry) || Date.now() > expiry) {
      return { ...none, reason: "That code has expired." };
    }
  }

  if (coupon.maxUses && coupon.maxUses > 0 && (coupon.usedCount ?? 0) >= coupon.maxUses) {
    return { ...none, reason: "That code has been fully claimed." };
  }

  if (coupon.appliesTo && coupon.appliesTo.length > 0 && !coupon.appliesTo.includes(itemId)) {
    return { ...none, reason: "That code doesn't apply to this one." };
  }

  if (coupon.minAmount && amount < coupon.minAmount) {
    return { ...none, reason: `That code needs an order of ₹${coupon.minAmount} or more.` };
  }

  const raw =
    coupon.type === "percent"
      ? Math.floor((amount * Math.min(Math.max(coupon.value, 0), 100)) / 100)
      : Math.floor(Math.max(coupon.value, 0));

  // Razorpay cannot charge ₹0, and a free order would skip the payment
  // path entirely without also running the free-registration path — so the
  // floor is ₹1 unless the admin set a higher one.
  const floor = Math.max(1, Math.floor(coupon.minPayable ?? 1));
  const payable = Math.max(floor, amount - raw);
  const discount = amount - payable;

  if (discount <= 0) {
    return { ...none, reason: "That code doesn't reduce this price." };
  }

  return {
    ok: true,
    code: coupon.code.trim().toUpperCase(),
    discount,
    payable,
    label:
      coupon.type === "percent"
        ? `${coupon.value}% off`
        : `₹${coupon.value} off`,
  };
}

/** Returns the list with usedCount incremented for `code`, or the list unchanged. */
export function markCouponUsed(coupons: Coupon[], code: string): Coupon[] {
  const wanted = code.trim().toUpperCase();
  return coupons.map((c) =>
    (c.code ?? "").trim().toUpperCase() === wanted
      ? { ...c, usedCount: (c.usedCount ?? 0) + 1 }
      : c
  );
}
