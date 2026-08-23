import { describe, expect, it } from "vitest";
import { computeInvoice } from "@/lib/invoice";
import { computePricing } from "@/lib/tax";
import type { TaxSettings } from "@/lib/settings-types";
import type { OrderTaxSnapshot } from "@/lib/order-tax";

const MODES: TaxSettings["mode"][] = ["inclusive", "exclusive"];
const RATES = [0, 5, 12, 18, 28];
const PRICES = [1, 49, 999, 6999, 12345.67];

function tax(mode: TaxSettings["mode"], ratePercent: number): TaxSettings {
  return { enabled: true, ratePercent, mode, display: "plus-gst", b2bEnabled: false, b2bPrompt: "" };
}

describe("computeInvoice", () => {
  for (const mode of MODES) {
    for (const ratePercent of RATES) {
      for (const listPrice of PRICES) {
        it(`mode=${mode} rate=${ratePercent} price=${listPrice}: grandTotal equals what was actually charged`, () => {
          const pricing = computePricing({ listPrice, tax: tax(mode, ratePercent), sellerStateCode: "09" });
          const invoice = computeInvoice(pricing.ratePercent, pricing.payable, pricing.intraState);
          expect(invoice.grandTotal).toBeCloseTo(pricing.payable, 10);
        });
      }
    }
  }

  it("a stored tax snapshot wins over the current live rate — an issued invoice never gets rewritten", () => {
    const snapshot: OrderTaxSnapshot = {
      ratePercent: 18,
      mode: "exclusive",
      taxableValue: 6999,
      taxTotal: 1259.82,
      cgst: 629.91,
      sgst: 629.91,
      igst: 0,
      discount: 0,
      listPrice: 6999,
    };

    // The live rate has since been raised to 28% and the amount paid recomputed
    // as if that were true — none of it should leak into the invoice.
    const invoice = computeInvoice(28, 8258.82 /* wrong on purpose */, true, snapshot);

    expect(invoice.fromSnapshot).toBe(true);
    expect(invoice.ratePercent).toBe(18);
    expect(invoice.taxableValue).toBe(6999);
    expect(invoice.taxTotal).toBe(1259.82);
    expect(invoice.cgst).toBe(629.91);
    expect(invoice.sgst).toBe(629.91);
    expect(invoice.grandTotal).toBe(6999 + 1259.82);
  });

  it("falls back to computing from the amount paid when there is no snapshot", () => {
    const invoice = computeInvoice(18, 8258.82, true, null);
    expect(invoice.fromSnapshot).toBe(false);
    expect(invoice.grandTotal).toBeCloseTo(8258.82, 10);
  });
});
