import LegalPage from "@/components/LegalPage";
import { getSetting } from "@/lib/items";
import type { FooterLinks } from "@/components/Footer";
import { BUSINESS, fullAddress } from "@/lib/legal";


// Stays dynamic: this page reads footerLinks from the settings table,
// so a static render would bake the footer in at build time and break
// the rule that the DB row always wins over a deploy.
export const dynamic = "force-dynamic";

export const metadata = { title: "Privacy Policy — Deepanshu Tyagi Live" };

export default async function PrivacyPage() {
  const footerLinks = await getSetting<FooterLinks>("footerLinks", {});

  return (
    <LegalPage title="Privacy Policy" updated="12 August 2026" footerLinks={footerLinks}>
      <p>
        {BUSINESS.tradeName} (&quot;we&quot;, &quot;us&quot;), operating {BUSINESS.siteName},
        respects your privacy. This policy explains what we collect, why, and how it&apos;s used
        when you browse the Site or make a purchase.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>At checkout:</strong> full name, email address, and phone number, to identify your order and deliver access/tickets.</li>
        <li><strong>Payment data:</strong> we never see or store your card, UPI, or bank details. These go directly to Razorpay, our payment processor, over an encrypted connection.</li>
        <li><strong>Automatically:</strong> basic technical data such as browser type and pages visited, used only for keeping the Site working correctly.</li>
        <li>
          <strong>Advertising &amp; analytics:</strong> we use the Meta Pixel, which sets
          cookies in your browser so we can measure whether an ad led to a purchase or a
          registration. You can opt out through your browser settings or your Meta ad
          preferences.
        </li>
      </ul>

      <h2>2. How we use your data</h2>
      <ul>
        <li>To process your order and deliver the course, workshop details, or service you paid for.</li>
        <li>To send order confirmations, receipts, and important updates about a purchase.</li>
        <li>To respond when you contact us via email, WhatsApp, or the Site.</li>
        <li>To meet legal and tax record-keeping requirements (e.g. GST invoicing).</li>
      </ul>
      <p>We do not sell your personal data to third parties.</p>

      <h2>3. Who we share data with</h2>
      <p>
        We share the minimum data necessary with: <strong>Razorpay</strong>{" "}
        (to process your payment); infrastructure providers (<strong>Vercel</strong>{" "}
        for hosting and <strong>Neon</strong> for database storage) who hold this
        Site&apos;s data on our behalf under their own security practices; and{" "}
        <strong>Meta Platforms</strong>, to measure how our advertising performs. What
        goes to Meta is limited to a one-way encrypted (hashed) form of your email
        address and phone number, your IP address, your browser type, and the page you
        were on. We never send Meta your name, your payment details, or the content of
        anything you write to us. We do not sell your personal data to anyone.
      </p>

      <h2>4. Data retention</h2>
      <p>
        We retain order and contact information for as long as needed to fulfil the order, meet
        tax/accounting obligations under Indian law, and resolve any disputes — typically up to 8
        years for financial records, in line with statutory requirements.
      </p>

      <h2>5. Your rights</h2>
      <p>
        You can ask us to access, correct, or delete the personal data we hold about you at any
        time by emailing <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. We&apos;ll
        respond within a reasonable time, subject to any records we&apos;re legally required to
        keep.
      </p>

      <h2>6. Cookies</h2>
      <p>
        The Site uses essential cookies required for admin login sessions and core
        functionality. It also uses the Meta Pixel, which sets third-party cookies
        (<code>_fbc</code> and <code>_fbp</code>) in your browser so we can measure
        whether an advertisement led to a purchase or registration. You can block or
        clear these through your browser settings, or opt out of interest-based ads
        through your Meta ad preferences — the Site will continue to work normally
        either way.
      </p>

      <h2>7. Children&apos;s privacy</h2>
      <p>The Site is not directed at children under 18, and we do not knowingly collect data from them.</p>

      <h2>8. Changes to this policy</h2>
      <p>We may update this policy periodically. The &quot;Last updated&quot; date above will always reflect the latest version.</p>

      <h2>9. Contact us</h2>
      <p>
        {BUSINESS.legalName}, trading as {BUSINESS.tradeName} ({BUSINESS.constitution}), GSTIN{" "}
        {BUSINESS.gstin}
        <br />
        {fullAddress}
        <br />
        Email: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · Phone: {BUSINESS.phone}
      </p>
    </LegalPage>
  );
}
