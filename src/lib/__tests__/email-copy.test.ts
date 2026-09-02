import { describe, expect, it } from "vitest";
import {
  DEFAULT_EMAIL_COPY,
  EMAIL_TEMPLATE_META,
  PLACEHOLDER_HELP,
  PLACEHOLDER_KEYS,
  resolveTemplate,
  substitute,
  type EmailTemplateKey,
  type PlaceholderKey,
} from "../email-copy";
import { renderTemplate } from "../email-templates";

describe("substitute — flat tokens", () => {
  it("swaps a token for its value", () => {
    expect(substitute("Hi {firstName},", { firstName: "Deepanshu" }, false)).toBe("Hi Deepanshu,");
  });

  it("renders a missing token as empty, never the literal or undefined", () => {
    const out = substitute("Order: {orderId}", {}, false);
    expect(out).toBe("Order: ");
    expect(out).not.toContain("{orderId}");
    expect(out).not.toContain("undefined");
  });

  it("escapes interpolated values on the HTML pass only", () => {
    const values = { name: '<img src=x onerror="alert(1)">' };
    expect(substitute("{name}", values, true)).toContain("&lt;img");
    expect(substitute("{name}", values, true)).not.toContain("<img");
    expect(substitute("{name}", values, false)).toContain("<img");
  });

  it("does not escape the admin's own template text", () => {
    expect(substitute("A & B", {}, true)).toBe("A & B");
  });
});

describe("substitute — optional blocks", () => {
  const tpl = "{?invoiceUrl}Your GST invoice: {invoiceUrl}{/invoiceUrl}";

  it("keeps the block when the token has a value", () => {
    expect(substitute(tpl, { invoiceUrl: "https://x.test/i" }, false)).toBe(
      "Your GST invoice: https://x.test/i"
    );
  });

  it("removes the whole block — label included — when the token is empty", () => {
    expect(substitute(tpl, { invoiceUrl: "" }, false)).toBe("");
    expect(substitute(tpl, {}, false)).toBe("");
  });

  it("treats a whitespace-only value as absent", () => {
    expect(substitute(tpl, { invoiceUrl: "   " }, false)).toBe("");
  });

  it("eats one trailing newline so a dropped block leaves no orphan line", () => {
    const body = "A\n{?groupUrl}Group: {groupUrl}{/groupUrl}\nB";
    expect(substitute(body, {}, false)).toBe("A\nB");
  });

  it("handles two different blocks independently", () => {
    const body = "{?groupUrl}G:{groupUrl}{/groupUrl}|{?invoiceUrl}I:{invoiceUrl}{/invoiceUrl}";
    expect(substitute(body, { invoiceUrl: "u" }, false)).toBe("|I:u");
    expect(substitute(body, { groupUrl: "g" }, false)).toBe("G:g|");
  });

  it("strips an unclosed marker rather than mailing it to a customer", () => {
    const out = substitute("Hi {?groupUrl} there", { groupUrl: "g" }, false);
    expect(out).toBe("Hi  there");
    expect(out).not.toContain("{?");
    expect(out).not.toContain("{/");
  });
});

describe("renderTemplate", () => {
  const values = { firstName: "Aman", item: "Claude 01", amount: "₹27", orderId: "ord_1" };

  it("puts the invoice link in the body when there is one", () => {
    const out = renderTemplate(DEFAULT_EMAIL_COPY.paidBuyer, {
      ...values,
      invoiceUrl: "https://deepanshutyagi.live/order/ord_1/invoice",
    });
    expect(out.text).toContain("Your GST invoice: https://deepanshutyagi.live/order/ord_1/invoice");
    expect(out.html).toContain("https://deepanshutyagi.live/order/ord_1/invoice");
  });

  it("leaves no dangling label when there is no invoice", () => {
    const out = renderTemplate(DEFAULT_EMAIL_COPY.paidBuyer, values);
    expect(out.text).not.toContain("Your GST invoice");
    expect(out.html).not.toContain("Your GST invoice");
  });

  it("never renders an empty paragraph where a block used to be", () => {
    const out = renderTemplate(DEFAULT_EMAIL_COPY.paidBuyer, values);
    expect(out.html).not.toContain("<br></p>");
    expect(out.html).not.toMatch(/<p[^>]*><\/p>/);
    expect(out.text).not.toMatch(/\n{3,}/);
  });

  it("keeps the text and HTML parts telling the same story", () => {
    const withInvoice = renderTemplate(DEFAULT_EMAIL_COPY.paidBuyer, { ...values, invoiceUrl: "https://x.test/i" });
    const without = renderTemplate(DEFAULT_EMAIL_COPY.paidBuyer, values);
    expect(withInvoice.text.includes("https://x.test/i")).toBe(withInvoice.html.includes("https://x.test/i"));
    expect(without.text.includes("GST invoice")).toBe(without.html.includes("GST invoice"));
  });

  it("keeps a subject on one line", () => {
    const out = renderTemplate({ subject: "Paid — {item}", body: "x" }, { item: "A\nB" });
    expect(out.subject).toBe("Paid — A B");
    expect(out.subject).not.toContain("\n");
  });
});

describe("resolveTemplate", () => {
  it("falls back per field, not per template", () => {
    const r = resolveTemplate({ subject: "Mine" }, DEFAULT_EMAIL_COPY.paidBuyer);
    expect(r.subject).toBe("Mine");
    expect(r.body).toBe(DEFAULT_EMAIL_COPY.paidBuyer.body);
  });

  it("treats a whitespace-only field as blank", () => {
    const r = resolveTemplate({ subject: "   ", body: "  " }, DEFAULT_EMAIL_COPY.leadBuyer);
    expect(r.subject).toBe(DEFAULT_EMAIL_COPY.leadBuyer.subject);
    expect(r.body).toBe(DEFAULT_EMAIL_COPY.leadBuyer.body);
  });
});

// These are the regression guards for the bug this change fixed: the admin
// panel advertised 7 tokens while the server substituted 13, because the
// two lists were hand-copied into different files.
describe("the panel and the server agree about tokens", () => {
  const keys = Object.keys(EMAIL_TEMPLATE_META) as EmailTemplateKey[];

  it("advertises only tokens the server actually substitutes", () => {
    for (const key of keys) {
      for (const ph of EMAIL_TEMPLATE_META[key].placeholders) {
        expect(PLACEHOLDER_KEYS, `${key} advertises {${ph}}`).toContain(ph);
      }
    }
  });

  it("describes every token it can offer", () => {
    for (const ph of PLACEHOLDER_KEYS) {
      expect(PLACEHOLDER_HELP[ph], `no help text for {${ph}}`).toBeTruthy();
    }
  });

  it("uses no token in a default body that the token list does not know", () => {
    for (const key of keys) {
      const tpl = DEFAULT_EMAIL_COPY[key];
      const used = [...`${tpl.subject}\n${tpl.body}`.matchAll(/\{[?/]?(\w+)\}/g)].map((m) => m[1]);
      for (const token of used) {
        expect(PLACEHOLDER_KEYS, `${key} uses {${token}}`).toContain(token as PlaceholderKey);
      }
    }
  });

  it("has a meta entry for every default template and vice versa", () => {
    expect(Object.keys(EMAIL_TEMPLATE_META).sort()).toEqual(Object.keys(DEFAULT_EMAIL_COPY).sort());
  });

  it("offers the invoice link on both paid templates", () => {
    expect(EMAIL_TEMPLATE_META.paidBuyer.placeholders).toContain("invoiceUrl");
    expect(EMAIL_TEMPLATE_META.paidAdmin.placeholders).toContain("invoiceUrl");
  });

  it("balances every optional block it ships", () => {
    for (const key of keys) {
      const body = DEFAULT_EMAIL_COPY[key].body;
      const opens = [...body.matchAll(/\{\?(\w+)\}/g)].map((m) => m[1]).sort();
      const closes = [...body.matchAll(/\{\/(\w+)\}/g)].map((m) => m[1]).sort();
      expect(opens, `${key} has an unbalanced block`).toEqual(closes);
    }
  });
});
