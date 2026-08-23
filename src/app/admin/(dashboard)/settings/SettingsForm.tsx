"use client";
import { useEffect, useState } from "react";
import {
  BrandingSection,
  NavSection,
  BioSection,
  StarterSection,
  GuideCtaSection,
  CouponsSection,
  TaxSection,
  BusinessSection,
  InvoiceSection,
} from "./SettingsSections";
import {
  DEFAULT_BIO,
  DEFAULT_BUSINESS,
  DEFAULT_GUIDE_CTA,
  DEFAULT_INVOICE,
  DEFAULT_NAV,
  DEFAULT_STARTER,
  DEFAULT_TAX,
  type BioSettings,
  type Branding,
  type BusinessSettings,
  type Coupon,
  type GuideCtaSettings,
  type InvoiceSettings,
  type NavSettings,
  type StarterSettings,
  type TaxSettings,
} from "@/lib/settings-types";

interface Testimonial {
  quote: string;
  who: string;
}
interface FooterLinks {
  whatsapp?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  email?: string;
}
interface HeroCopy {
  eyebrow?: string;
  line1?: string;
  line2?: string;
  subline?: string;
}
interface EmailTemplate {
  subject?: string;
  body?: string;
}
interface EmailCopy {
  paidBuyer?: EmailTemplate;
  paidAdmin?: EmailTemplate;
  leadBuyer?: EmailTemplate;
  leadAdmin?: EmailTemplate;
}

const HERO_DEFAULTS = {
  eyebrow: "DEEPANSHUTYAGI.LIVE — THE STOREFRONT",
  line1: "Live,",
  line2: "right now.",
  subline: "Everything I teach, build, and sell.",
};

// Kept in sync with DEFAULT_EMAIL_COPY in src/lib/email-templates.ts — this
// copy is just what the placeholder text shows when a field is blank; the
// actual fallback used at send time lives server-side in that file.
const EMAIL_DEFAULTS: Record<keyof EmailCopy, Required<EmailTemplate>> = {
  paidBuyer: {
    subject: "Payment confirmed — {item}",
    body: "Hi {firstName},\n\nPayment received for {item} — thanks for joining.\n\nAmount: {amount}\nOrder ID: {orderId}\n\nI'll be in touch directly if there's anything else you need before it starts. See you there.\n\n— Deepanshu",
  },
  paidAdmin: {
    subject: "New order — {item} ({amount})",
    body: "New paid order.\n\nItem: {item}\nAmount: {amount}\nOrder ID: {orderId}\n\nBuyer\nName: {name}\nEmail: {email}\nPhone: {phone}",
  },
  leadBuyer: {
    subject: "Got your details",
    body: "Hi {firstName},\n\nThanks for getting in touch. I've got your details and will follow up directly.\n\nRe: {item}\n\n— Deepanshu",
  },
  leadAdmin: {
    subject: "New lead",
    body: "New lead.\n\nItem: {item}\n\nName: {name}\nEmail: {email}\nPhone: {phone}",
  },
};

const EMAIL_TEMPLATE_META: Record<keyof EmailCopy, { title: string; blurb: string; placeholders: string[] }> = {
  paidBuyer: {
    title: "Paid order — to the buyer",
    blurb: "Sent the moment an order is confirmed paid.",
    placeholders: ["firstName", "name", "item", "amount", "orderId", "email", "phone"],
  },
  paidAdmin: {
    title: "Paid order — to you",
    blurb: "Sent to the notification address below, same trigger.",
    placeholders: ["firstName", "name", "item", "amount", "orderId", "email", "phone"],
  },
  leadBuyer: {
    title: "New lead — to the registrant",
    blurb: "Sent after a free registration or enquiry, if they gave an email.",
    placeholders: ["firstName", "name", "item", "email", "phone"],
  },
  leadAdmin: {
    title: "New lead — to you",
    blurb: "Sent to the notification address below, same trigger.",
    placeholders: ["firstName", "name", "item", "email", "phone"],
  },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full px-3.5 py-2.5 text-sm bg-card border border-line rounded-[10px] placeholder-ink-soft focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold";

export default function SettingsForm() {
  const [heroCopy, setHeroCopy] = useState<HeroCopy>({});
  const [ticker, setTicker] = useState<string[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [emailCopy, setEmailCopy] = useState<EmailCopy>({});
  const [notifyEmail, setNotifyEmail] = useState("");
  const [links, setLinks] = useState<FooterLinks>({});
  const [branding, setBranding] = useState<Branding>({});
  const [nav, setNav] = useState<NavSettings>(DEFAULT_NAV);
  const [bio, setBio] = useState<BioSettings>(DEFAULT_BIO);
  const [starter, setStarter] = useState<StarterSettings>(DEFAULT_STARTER);
  const [guideCta, setGuideCta] = useState<GuideCtaSettings>(DEFAULT_GUIDE_CTA);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [business, setBusiness] = useState<BusinessSettings>(DEFAULT_BUSINESS);
  const [invoice, setInvoice] = useState<InvoiceSettings>(DEFAULT_INVOICE);
  const [tax, setTax] = useState<TaxSettings>(DEFAULT_TAX);
  // Whether the orders table can store a tax snapshot yet. Gates the B2B
  // switch so it can't be turned on into a void.
  const [b2bReady, setB2bReady] = useState(false);
  // Only used to render the "applies to" checkboxes on a coupon.
  const [items, setItems] = useState<{ id: string; title: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Each stored value is merged OVER its defaults rather than replacing
    // them, so a settings row written before a field existed still renders
    // a sensible form instead of blanks.
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setHeroCopy(d.heroCopy ?? {});
        setTicker(d.ticker ?? []);
        setTestimonials(d.testimonials ?? []);
        setEmailCopy(d.emailCopy ?? {});
        setLinks(d.footerLinks ?? {});
        setNotifyEmail(d.notifyEmail ?? "");
        setBranding(d.branding ?? {});
        setNav({ ...DEFAULT_NAV, ...(d.nav ?? {}), links: d.nav?.links?.length ? d.nav.links : DEFAULT_NAV.links });
        setBio({ ...DEFAULT_BIO, ...(d.bio ?? {}) });
        setStarter({
          ...DEFAULT_STARTER,
          ...(d.starter ?? {}),
          options: d.starter?.options?.length ? d.starter.options : DEFAULT_STARTER.options,
        });
        setGuideCta({ ...DEFAULT_GUIDE_CTA, ...(d.guideCta ?? {}) });
        setCoupons(Array.isArray(d.coupons) ? d.coupons : []);
        setBusiness({
          ...DEFAULT_BUSINESS,
          ...(d.business ?? {}),
          addressLines: d.business?.addressLines?.length ? d.business.addressLines : DEFAULT_BUSINESS.addressLines,
        });
        setInvoice({ ...DEFAULT_INVOICE, ...(d.invoice ?? {}) });
        setTax({ ...DEFAULT_TAX, ...(d.tax ?? {}) });
        setB2bReady(d.b2bReady === true);
        setLoading(false);
      });

    // A failure here only costs the coupon checkboxes their labels, so it
    // is deliberately not part of the loading gate.
    fetch("/api/items")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setItems(Array.isArray(rows) ? rows : []))
      .catch(() => setItems([]));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heroCopy,
        ticker,
        testimonials,
        emailCopy,
        footerLinks: links,
        notifyEmail,
        branding,
        nav,
        bio,
        starter,
        guideCta,
        // Blank rows are dropped on save rather than on every keystroke,
        // so a half-typed code isn't deleted out from under the cursor.
        coupons: coupons.filter((c) => (c.code ?? "").trim()),
        business,
        tax,
        invoice,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function updateTemplate(key: keyof EmailCopy, field: keyof EmailTemplate, value: string) {
    setEmailCopy({ ...emailCopy, [key]: { ...emailCopy[key], [field]: value } });
  }

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div className="max-w-[640px] space-y-12">
      <section>
        <h2 className="font-display font-bold text-lg mb-1">Homepage hero</h2>
        <p className="text-sm text-muted mb-3">The first thing a visitor reads. Blank fields fall back to the default shown.</p>
        <Field label="Eyebrow">
          <input
            className={inputClass}
            placeholder={HERO_DEFAULTS.eyebrow}
            value={heroCopy.eyebrow ?? ""}
            onChange={(e) => setHeroCopy({ ...heroCopy, eyebrow: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Headline, line 1">
            <input
              className={inputClass}
              placeholder={HERO_DEFAULTS.line1}
              value={heroCopy.line1 ?? ""}
              onChange={(e) => setHeroCopy({ ...heroCopy, line1: e.target.value })}
            />
          </Field>
          <Field label="Headline, line 2">
            <input
              className={inputClass}
              placeholder={HERO_DEFAULTS.line2}
              value={heroCopy.line2 ?? ""}
              onChange={(e) => setHeroCopy({ ...heroCopy, line2: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Subline">
          <input
            className={inputClass}
            placeholder={HERO_DEFAULTS.subline}
            value={heroCopy.subline ?? ""}
            onChange={(e) => setHeroCopy({ ...heroCopy, subline: e.target.value })}
          />
        </Field>
      </section>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Ticker lines</h2>
        <p className="text-sm text-muted mb-3">One proof point per line — scrolls on the homepage.</p>
        <textarea
          className={`${inputClass} leading-6`}
          rows={5}
          value={ticker.join("\n")}
          onChange={(e) => setTicker(e.target.value.split("\n"))}
        />
      </section>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Testimonials</h2>
        {testimonials.map((t, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              className="flex-1 px-3.5 py-2.5 text-sm bg-card border border-line rounded-[10px] placeholder-ink-soft"
              placeholder="Quote"
              value={t.quote}
              onChange={(e) => {
                const next = [...testimonials];
                next[i] = { ...next[i], quote: e.target.value };
                setTestimonials(next);
              }}
            />
            <input
              className="w-48 px-3.5 py-2.5 text-sm bg-card border border-line rounded-[10px] placeholder-ink-soft"
              placeholder="Who"
              value={t.who}
              onChange={(e) => {
                const next = [...testimonials];
                next[i] = { ...next[i], who: e.target.value };
                setTestimonials(next);
              }}
            />
            <button onClick={() => setTestimonials(testimonials.filter((_, j) => j !== i))} className="text-live-ink px-2">
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => setTestimonials([...testimonials, { quote: "", who: "" }])}
          className="text-sm font-semibold text-marigold-ink"
        >
          + Add testimonial
        </button>
      </section>

      <section>
        <h2 className="font-display font-bold text-lg mb-1">Email templates</h2>
        <p className="text-sm text-muted mb-4">
          Plain text only — placeholders get swapped in when each email sends. Blank subject or body falls back to
          the default independently.
        </p>
        <div className="space-y-6">
          {(Object.keys(EMAIL_TEMPLATE_META) as (keyof EmailCopy)[]).map((key) => {
            const meta = EMAIL_TEMPLATE_META[key];
            const defaults = EMAIL_DEFAULTS[key];
            const template = emailCopy[key] ?? {};
            return (
              <div key={key} className="bg-card border border-line rounded-card p-4">
                <p className="font-semibold text-sm">{meta.title}</p>
                <p className="text-xs text-muted mb-3">{meta.blurb}</p>
                <p className="font-mono text-[10px] text-muted mb-3">
                  Placeholders: {meta.placeholders.map((p) => `{${p}}`).join("  ")}
                </p>
                <Field label="Subject">
                  <input
                    className={inputClass}
                    placeholder={defaults.subject}
                    value={template.subject ?? ""}
                    onChange={(e) => updateTemplate(key, "subject", e.target.value)}
                  />
                </Field>
                <Field label="Body">
                  <textarea
                    className={`${inputClass} leading-6 font-mono text-[13px]`}
                    rows={7}
                    placeholder={defaults.body}
                    value={template.body ?? ""}
                    onChange={(e) => updateTemplate(key, "body", e.target.value)}
                  />
                </Field>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Notifications</h2>
        <p className="text-sm text-muted mb-3">
          Where new-order and new-lead alerts get sent. Leave blank to use the footer email below instead.
        </p>
        <input
          className={inputClass}
          placeholder="e.g. you@example.com"
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
        />
      </section>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Contact & social links</h2>
        <div className="space-y-3">
          {(["whatsapp", "instagram", "youtube", "linkedin", "email"] as const).map((key) => (
            <div key={key}>
              <label className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">{key}</label>
              <input
                className={inputClass}
                value={links[key] ?? ""}
                onChange={(e) => setLinks({ ...links, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>

      <hr className="border-line" />

      <BrandingSection value={branding} onChange={setBranding} />
      <NavSection value={nav} onChange={setNav} />
      <StarterSection value={starter} onChange={setStarter} />
      <GuideCtaSection value={guideCta} onChange={setGuideCta} />
      <BioSection value={bio} onChange={setBio} />
      <CouponsSection value={coupons} onChange={setCoupons} items={items} />
      <TaxSection value={tax} onChange={setTax} b2bReady={b2bReady} />
      <BusinessSection value={business} onChange={setBusiness} />
      <InvoiceSection value={invoice} onChange={setInvoice} />

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="bg-ink text-bone px-6 py-3 rounded-full font-semibold text-sm hover:bg-marigold hover:text-ink transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-marigold-ink font-medium text-sm">Saved ✓</span>}
      </div>
    </div>
  );
}
