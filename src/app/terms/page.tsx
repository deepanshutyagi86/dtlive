import LegalPage from "@/components/LegalPage";
import { getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";
import { getBusinessSettings } from "@/lib/site-settings";
import { businessFullAddress } from "@/lib/settings-types";
import { BUSINESS } from "@/lib/legal";


// Stays dynamic: this page reads footerLinks from the settings table,
// so a static render would bake the footer in at build time and break
// the rule that the DB row always wins over a deploy.
export const dynamic = "force-dynamic";

export const metadata = { title: "Terms & Conditions — Deepanshu Tyagi Live" };

export default async function TermsPage() {
  const [footerLinks, business] = await Promise.all([
    getSetting<FooterLinks>("footerLinks", {}),
    getBusinessSettings(),
  ]);
  const fullAddress = businessFullAddress(business);

  return (
    <LegalPage title="Terms & Conditions" updated="4 August 2026" footerLinks={footerLinks}>
      <p>
        This website, {BUSINESS.siteName} (&quot;the Site&quot;), is owned and operated by{" "}
        <strong>{business.legalName}</strong>, trading as <strong>{business.tradeName}</strong>{" "}
        ({BUSINESS.constitution}), GSTIN {business.gstin}, registered at {fullAddress}. By
        accessing or using this Site, purchasing a course, workshop seat, agency service, or any
        product listed here, you agree to the terms below.
      </p>

      <h2>1. Who we are</h2>
      <p>
        {business.tradeName} operates {BUSINESS.siteName} as a single hub for courses, live
        workshops, agency services, and links to affiliated ventures (including Vyrelle, Muchhad
        Eats, Sanskriti the Antique, and FlatBot). Each venture may have its own separate terms
        where noted.
      </p>

      <h2>2. What we offer</h2>
      <ul>
        <li><strong>Courses</strong> — self-paced digital content, delivered via access link/login after payment.</li>
        <li><strong>Workshops</strong> — live, scheduled sessions with limited seats, delivered online or in person as specified on the listing.</li>
        <li><strong>Agency services</strong> — website, app, and growth work, scoped and quoted individually before any payment is collected.</li>
        <li><strong>E-commerce products</strong> (via Vyrelle and other listed ventures) — physical merchandise. This category is not yet live for checkout on this Site; a separate Shipping &amp; Delivery Policy applies once it is.</li>
      </ul>

      <h2>3. Pricing and payment</h2>
      <p>
        All prices on the Site are listed in Indian Rupees (INR) and are inclusive of applicable
        taxes unless stated otherwise. Payments are processed securely through Razorpay.
        We do not store your card, UPI, or bank details — these are handled entirely by Razorpay.
      </p>

      <h2>4. Access and delivery</h2>
      <p>
        Course access is granted automatically after successful payment, typically via email or
        an on-site login. Workshop details (link or venue, timing) are shared to the email/phone
        provided at checkout. If you do not receive access within 24 hours of a successful
        payment, contact us using the details on our{" "}
        <a href="/contact">Contact page</a>.
      </p>

      <h2>5. Refunds and cancellations</h2>
      <p>
        Refund and cancellation terms differ by product type. See our{" "}
        <a href="/refund-policy">Refund &amp; Cancellation Policy</a> for full details.
      </p>

      <h2>6. User conduct</h2>
      <p>
        Course and workshop content is licensed for your personal use only. Redistributing,
        reselling, screen-recording for resale, or publicly sharing paid content without written
        permission is prohibited and may result in access being revoked without refund.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        Courses, workshops, and agency advice are provided on a best-effort, informational basis.
        {" "}{business.tradeName} is not liable for business outcomes, income claims, or decisions
        made based on this content. Agency service deliverables are governed by the specific scope
        agreed with each client.
      </p>

      <h2>8. Changes to these terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Site after an update
        constitutes acceptance of the revised terms.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Any disputes will be subject to the
        exclusive jurisdiction of the courts in Meerut, Uttar Pradesh.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these Terms? Reach us at{" "}
        <a href={`mailto:${business.email}`}>{business.email}</a> or {business.phone}.
      </p>
    </LegalPage>
  );
}
