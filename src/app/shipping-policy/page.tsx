import LegalPage from "@/components/LegalPage";
import { getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";
import { BUSINESS } from "@/lib/legal";


// Stays dynamic: this page reads footerLinks from the settings table,
// so a static render would bake the footer in at build time and break
// the rule that the DB row always wins over a deploy.
export const dynamic = "force-dynamic";

export const metadata = { title: "Shipping & Delivery Policy — Deepanshu Tyagi Live" };

export default async function ShippingPolicyPage() {
  const footerLinks = await getSetting<FooterLinks>("footerLinks", {});

  return (
    <LegalPage title="Shipping & Delivery Policy" updated="4 August 2026" footerLinks={footerLinks}>
      <h2>1. Digital products (courses, workshops, agency)</h2>
      <p>
        Everything currently sold through {BUSINESS.siteName}&apos;s checkout is delivered
        digitally — there is no physical shipping involved.
      </p>
      <ul>
        <li><strong>Courses:</strong> access is granted instantly (typically within a few minutes) after successful payment, via email or an on-site login.</li>
        <li><strong>Workshops:</strong> the session link (for online workshops) or venue details (for in-person workshops) are sent to the email/phone provided at checkout, ahead of the scheduled date.</li>
        <li><strong>Agency services:</strong> delivery timelines are agreed individually as part of each project&apos;s scope.</li>
      </ul>
      <p>
        If you haven&apos;t received access within 24 hours of a successful payment, please check
        your spam folder first, then contact us at{" "}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
      </p>

      <h2>2. Physical products (Vyrelle and other ventures)</h2>
      <p>
        Physical merchandise — apparel, accessories, home decor, and similar items from Vyrelle
        and other affiliated ventures — is <strong>not yet available for checkout</strong> on{" "}
        {BUSINESS.siteName}. Before this category goes live here, this policy will be updated to
        include shipping timelines, courier partners, delivery areas, shipping charges, and how to
        track an order.
      </p>

      <h2>3. Contact</h2>
      <p>
        For any delivery-related question on a current digital purchase, email{" "}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call {BUSINESS.phone}.
      </p>
    </LegalPage>
  );
}
