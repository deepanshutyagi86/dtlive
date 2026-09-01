import { describe, it, expect } from "vitest";
import { emailHtml, emailTextFooter, type EmailSender } from "../email";

// Gmail filed real order confirmations as spam with the reason "similar to
// messages that were identified as spam in the past". Authentication was
// fine; the message was the problem — a very short note carrying a money
// amount and an id, from a brand-new subdomain, with nothing in it that
// said who sent it. That is structurally what phishing looks like.
//
// The footer is the fix for the content half of that, so it is pinned:
// both parts must carry the same identity, because an HTML and a text
// part that disagree is itself a spam signal.

const SENDER: EmailSender = {
  tradeName: "Deepanshu Empire",
  address: "Badum, Meerut, Uttar Pradesh – 250502, India",
  email: "dtyagi.main@gmail.com",
  phone: "+91 98706 00903",
  siteUrl: "https://www.deepanshutyagi.live",
};

describe("email identity footer", () => {
  it("puts the full sender identity in the HTML part", () => {
    const html = emailHtml("<p>Body</p>", SENDER);
    expect(html).toContain("Deepanshu Empire");
    expect(html).toContain("Badum, Meerut");
    expect(html).toContain("dtyagi.main@gmail.com");
    expect(html).toContain("+91 98706 00903");
    expect(html).toContain("deepanshutyagi.live");
  });

  it("puts the same identity in the plain-text part", () => {
    const text = emailTextFooter(SENDER);
    expect(text).toContain("Deepanshu Empire");
    expect(text).toContain("Badum, Meerut");
    expect(text).toContain("dtyagi.main@gmail.com");
    expect(text).toContain("+91 98706 00903");
  });

  it("says why the recipient is getting it", () => {
    expect(emailHtml("<p>x</p>", SENDER)).toContain("because you bought or registered");
    expect(emailTextFooter(SENDER)).toContain("because you bought or registered");
  });

  // The footer must never be the reason a receipt fails to render.
  it("renders a complete email with no sender at all", () => {
    const html = emailHtml("<p>Body</p>");
    expect(html).toContain("Body");
    expect(html).not.toContain("undefined");
    expect(emailTextFooter(undefined)).toBe("");
  });

  it("still contains the body when a sender is present", () => {
    expect(emailHtml("<p>Payment received</p>", SENDER)).toContain("Payment received");
  });
});
