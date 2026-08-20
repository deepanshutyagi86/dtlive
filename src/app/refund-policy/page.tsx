import LegalPage from "@/components/LegalPage";
import { getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";
import { BUSINESS } from "@/lib/legal";


// Stays dynamic: this page reads footerLinks from the settings table,
// so a static render would bake the footer in at build time and break
// the rule that the DB row always wins over a deploy.
export const dynamic = "force-dynamic";

export const metadata = { title: "Refund & Cancellation Policy — Deepanshu Tyagi Live" };

export default async function RefundPolicyPage() {
  const footerLinks = await getSetting<FooterLinks>("footerLinks", {});

  return (
    <LegalPage title="Refund & Cancellation Policy" updated="4 August 2026" footerLinks={footerLinks}>
      <p>
        This policy covers everything sold through {BUSINESS.siteName}&apos;s checkout, operated
        by {BUSINESS.tradeName}. It varies by product type — please read the section relevant to
        your purchase.
      </p>

      <h2>1. Courses (self-paced, digital)</h2>
      <p>
        <strong>No refunds</strong> once payment is successful and access has been granted. Because
        course content is digital and access is instant, we&apos;re unable to offer refunds or
        cancellations after purchase. Please review the course description, curriculum, and any
        free preview material carefully before buying.
      </p>

      <h2>2. Workshops (live sessions)</h2>
      <p>
        <strong>No refunds</strong> once a seat is booked and payment is successful — including if
        you are unable to attend the live session. Seats are limited and confirmed on a first-come
        basis, so a booking directly holds a spot that would otherwise go to someone else.
      </p>
      <p>
        If {BUSINESS.tradeName} cancels or reschedules a workshop, you will be offered a seat in
        the next available session or, if that doesn&apos;t work for you, a full refund to your
        original payment method.
      </p>

      <h2>3. Agency services</h2>
      <p>
        Agency engagements are scoped and quoted individually before any payment is collected.
        Cancellation and refund terms for agency work are governed by the specific agreement or
        scope document shared with each client at the time of booking, not by this general policy.
      </p>

      <h2>4. E-commerce products (Vyrelle and other ventures)</h2>
      <p>
        Physical products (such as apparel, accessories, or home decor from Vyrelle and other
        listed ventures) are <strong>not yet available for checkout</strong> on {BUSINESS.siteName}.
        When this category goes live, this section will be updated with return, replacement, and
        refund terms specific to physical goods before checkout is enabled for them.
      </p>

      <h2>5. Failed or duplicate payments</h2>
      <p>
        If a payment is deducted from your account but the order does not show as successful on
        our end, or you are charged twice for the same order due to a technical error, the full
        amount will be refunded to your original payment method within 5–7 business days. Contact
        us at <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> with your payment
        reference so we can trace it with Razorpay.
      </p>

      <h2>6. How refunds are processed</h2>
      <p>
        Where a refund is due under this policy, it will be issued to the original payment method
        via Razorpay. Processing typically takes 5–7 business days depending on your bank
        or payment provider.
      </p>

      <h2>7. Contact</h2>
      <p>
        For any refund or cancellation query, email{" "}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call {BUSINESS.phone}.
      </p>
    </LegalPage>
  );
}
