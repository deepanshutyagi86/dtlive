"use client";
import { asArray } from "@/lib/admin-normalise";
import { useId } from "react";
import {
  ImageUploadField,
  LinesField,
  NumberField,
  Repeater,
  SelectField,
  TextField,
  Toggle,
} from "@/components/admin/AdminFields";
import { INPUT_CLASS } from "@/components/admin/AdminFields";
import { boothStatusLine, parsePlaylistId } from "@/lib/booth";
import { computePricing, formatRupees } from "@/lib/tax";
import {
  BRANDING_HELP,
  DEFAULT_AVG_TRACK_SEC,
  DEFAULT_BIO,
  DEFAULT_BOOTH,
  DEFAULT_BUSINESS,
  DEFAULT_GUIDE_CTA,
  DEFAULT_STREAM,
  DEFAULT_SYLLABUS,
  DEFAULT_INVOICE,
  DEFAULT_NAV,
  DEFAULT_STARTER,
  type BioSettings,
  type BoothSet,
  type BoothSettings,
  type Branding,
  type BusinessSettings,
  type Coupon,
  type GuideCtaSettings,
  type StreamSettings,
  type SyllabusSettings,
  type InvoiceSettings,
  type NavSettings,
  type StarterSettings,
  type TaxSettings,
  DEFAULT_TAX,
} from "@/lib/settings-types";

/* ------------------------------------------------------------------ */
/* Branding                                                            */
/* ------------------------------------------------------------------ */

export function BrandingSection({ value, onChange }: { value: Branding; onChange: (v: Branding) => void }) {
  const set = (patch: Partial<Branding>) => onChange({ ...value, ...patch });

  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">Branding &amp; link previews</h2>
      <p className="text-sm text-muted mb-5">
        These are the images people see before they see the site — in a browser tab, on a home screen, and in
        a WhatsApp or Instagram link preview. Leave any of them blank to use the built-in default.
      </p>

      <ImageUploadField
        label={BRANDING_HELP.faviconUrl.label}
        sizeHint={BRANDING_HELP.faviconUrl.size}
        help={BRANDING_HELP.faviconUrl.note}
        value={value.faviconUrl ?? ""}
        onChange={(v) => set({ faviconUrl: v })}
        pathPrefix="branding/favicon-"
        previewClassName="w-16 h-16"
      />

      <ImageUploadField
        label={BRANDING_HELP.appleIconUrl.label}
        sizeHint={BRANDING_HELP.appleIconUrl.size}
        help={BRANDING_HELP.appleIconUrl.note}
        value={value.appleIconUrl ?? ""}
        onChange={(v) => set({ appleIconUrl: v })}
        pathPrefix="branding/apple-icon-"
        previewClassName="w-16 h-16"
      />

      <ImageUploadField
        label={BRANDING_HELP.ogImageUrl.label}
        sizeHint={BRANDING_HELP.ogImageUrl.size}
        help={BRANDING_HELP.ogImageUrl.note}
        value={value.ogImageUrl ?? ""}
        onChange={(v) => set({ ogImageUrl: v })}
        pathPrefix="branding/og-"
        previewClassName="w-full max-w-[320px] aspect-[1200/630]"
      />

      <TextField
        label="Site title"
        value={value.siteTitle ?? ""}
        onChange={(v) => set({ siteTitle: v })}
        placeholder="Deepanshu Tyagi — Live"
        help="Shown in the browser tab and as the headline of a link preview. Blank uses the default."
      />
      <TextField
        label="Site description"
        rows={3}
        value={value.siteDescription ?? ""}
        onChange={(v) => set({ siteDescription: v })}
        placeholder="Courses, workshops, agency work…"
        help="The one line under the title in Google results and link previews. Aim for 140–160 characters."
      />

      <div className="bg-card border border-line rounded-card p-4 mt-4">
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-2">After you save</p>
        <p className="text-[13px] text-ink-soft leading-relaxed">
          Link previews are cached hard by every platform. WhatsApp and Instagram will keep showing the old
          card for a while — to force a refresh, run the URL through Facebook&apos;s Sharing Debugger and hit
          &ldquo;Scrape Again&rdquo;. A browser tab icon may need a hard reload.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export function NavSection({ value, onChange }: { value: NavSettings; onChange: (v: NavSettings) => void }) {
  const links = value.links?.length ? value.links : DEFAULT_NAV.links;

  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">Navigation</h2>
      <p className="text-sm text-muted mb-5">
        The links in the top bar, the phone menu, and the footer&apos;s Explore column — one list, three
        places. Untick &ldquo;Show&rdquo; to hide a link everywhere without deleting it.
      </p>

      <Repeater
        items={links}
        onChange={(next) => onChange({ ...value, links: next })}
        addLabel="Add link"
        blank={() => ({ label: "", href: "/", show: true })}
        render={(link, update) => (
          <div className="grid sm:grid-cols-2 gap-3">
            <TextField label="Label" value={link.label} onChange={(v) => update({ label: v })} placeholder="Courses" />
            <TextField label="Link" value={link.href} onChange={(v) => update({ href: v })} placeholder="/courses" />
            <div className="sm:col-span-2">
              <Toggle label="Show" checked={link.show !== false} onChange={(v) => update({ show: v })} />
            </div>
          </div>
        )}
      />

      <div className="grid sm:grid-cols-2 gap-3 mt-6">
        <TextField
          label="Button label"
          value={value.ctaLabel ?? ""}
          onChange={(v) => onChange({ ...value, ctaLabel: v })}
          placeholder={DEFAULT_NAV.ctaLabel}
        />
        <TextField
          label="Button link"
          value={value.ctaHref ?? ""}
          onChange={(v) => onChange({ ...value, ctaHref: v })}
          placeholder={DEFAULT_NAV.ctaHref}
          help="Can be a path like /agency or a full URL — a WhatsApp link works here too."
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Bio                                                                 */
/* ------------------------------------------------------------------ */

export function BioSection({ value, onChange }: { value: BioSettings; onChange: (v: BioSettings) => void }) {
  const set = (patch: Partial<BioSettings>) => onChange({ ...value, ...patch });
  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">About you</h2>
      <p className="text-sm text-muted mb-5">
        The &ldquo;Who&apos;s teaching&rdquo; card on every course and workshop page. This used to be
        hardcoded, which is how the ticker said 100+ students while this card said 500+ — keep the numbers
        here and in the ticker telling the same story.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Name" value={value.name} onChange={(v) => set({ name: v })} placeholder={DEFAULT_BIO.name} />
        <TextField label="Role (optional)" value={value.role} onChange={(v) => set({ role: v })} placeholder="Founder · Deepanshu Empire" />
      </div>

      <TextField
        label="Blurb"
        rows={4}
        value={value.blurb}
        onChange={(v) => set({ blurb: v })}
        help="Two or three sentences. Concrete beats impressive — what you did, not what you know."
      />

      <ImageUploadField
        label="Photo (optional)"
        sizeHint="square, 400 × 400 px"
        help="Shown as a circle. Blank falls back to your initials on a dark disc."
        value={value.avatarUrl ?? ""}
        onChange={(v) => set({ avatarUrl: v })}
        pathPrefix="branding/avatar-"
        previewClassName="w-20 h-20"
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <TextField
          label="Portfolio link (optional)"
          value={value.portfolioUrl ?? ""}
          onChange={(v) => set({ portfolioUrl: v })}
          placeholder="https://deepanshutyagi.me"
          help="Kept deliberately understated — a small link in the footer and under your bio, not a banner."
        />
        <TextField
          label="Portfolio label"
          value={value.portfolioLabel ?? ""}
          onChange={(v) => set({ portfolioLabel: v })}
          placeholder="Portfolio"
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Starter router                                                      */
/* ------------------------------------------------------------------ */

export function StarterSection({ value, onChange }: { value: StarterSettings; onChange: (v: StarterSettings) => void }) {
  const options = value.options?.length ? value.options : DEFAULT_STARTER.options;
  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">&ldquo;Not sure where to start?&rdquo;</h2>
      <p className="text-sm text-muted mb-5">
        A three-way signpost on the homepage, above the category sections. It routes on what someone
        <em> wants</em> rather than what a category is called.
      </p>

      <Toggle label="Show this block" checked={value.enabled !== false} onChange={(v) => onChange({ ...value, enabled: v })} />

      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <TextField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} placeholder={DEFAULT_STARTER.eyebrow} />
        <TextField label="Heading" value={value.title} onChange={(v) => onChange({ ...value, title: v })} placeholder={DEFAULT_STARTER.title} />
      </div>

      <div className="mt-4">
        <Repeater
          items={options}
          onChange={(next) => onChange({ ...value, options: next })}
          addLabel="Add option"
          blank={() => ({ label: "", sub: "", href: "/" })}
          render={(o, update) => (
            <>
              <TextField label="Label" value={o.label} onChange={(v) => update({ label: v })} placeholder="I want to learn" />
              <TextField label="Sub-line" value={o.sub} onChange={(v) => update({ sub: v })} placeholder="Self-paced courses you keep forever." />
              <TextField label="Link" value={o.href} onChange={(v) => update({ href: v })} placeholder="/courses" />
            </>
          )}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Guide CTA                                                           */
/* ------------------------------------------------------------------ */

export function GuideCtaSection({ value, onChange }: { value: GuideCtaSettings; onChange: (v: GuideCtaSettings) => void }) {
  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">Guide CTA on course/workshop pages</h2>
      <p className="text-sm text-muted mb-5">
        Shown at the bottom of every course and workshop page, pointing at the free guides. Someone who read
        the whole page and didn&apos;t buy is exactly who a free guide converts later.
      </p>

      <Toggle label="Show this block" checked={value.enabled !== false} onChange={(v) => onChange({ ...value, enabled: v })} />

      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <TextField
          label="Eyebrow"
          value={value.eyebrow}
          onChange={(v) => onChange({ ...value, eyebrow: v })}
          placeholder={DEFAULT_GUIDE_CTA.eyebrow}
        />
        <TextField
          label="Heading"
          value={value.title}
          onChange={(v) => onChange({ ...value, title: v })}
          placeholder={DEFAULT_GUIDE_CTA.title}
        />
      </div>
      <TextField
        label="Subline"
        value={value.subtitle}
        onChange={(v) => onChange({ ...value, subtitle: v })}
        placeholder={DEFAULT_GUIDE_CTA.subtitle}
      />
      <TextField
        label="Button label"
        value={value.buttonLabel}
        onChange={(v) => onChange({ ...value, buttonLabel: v })}
        placeholder={DEFAULT_GUIDE_CTA.buttonLabel}
      />
    </section>
  );
}

export function StreamSection({ value, onChange }: { value: StreamSettings; onChange: (v: StreamSettings) => void }) {
  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">Live stream carousel</h2>
      <p className="text-sm text-muted mb-5">
        The dragging row of cards under the homepage headline. Smaller cards fit more on screen at once;
        larger ones give the image and the title more room. Save and reload the homepage to see it.
      </p>

      <SelectField
        label="Card size"
        value={value.cardSize}
        onChange={(v) => onChange({ ...value, cardSize: v as StreamSettings["cardSize"] })}
        options={[
          { value: "small", label: "Small — 220px, 240px on desktop" },
          { value: "medium", label: `Medium — 270px, 290px on desktop (default)` },
          { value: "large", label: "Large — 320px, 350px on desktop" },
        ]}
        help={`Three fixed steps rather than a free number: the widths have to exist in the stylesheet at build time, so a typed-in value would leave the cards with no width at all. Default is ${DEFAULT_STREAM.cardSize}.`}
      />
    </section>
  );
}

export function SyllabusSection({ value, onChange }: { value: SyllabusSettings; onChange: (v: SyllabusSettings) => void }) {
  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">Syllabus PDF</h2>
      <p className="text-sm text-muted mb-5">
        The master switch for the long-form PDF pages. Off hides every syllabus link across the site and
        closes the pages, without deleting a single uploaded file. The PDF itself is uploaded per item, in
        that item&apos;s editor.
      </p>

      <Toggle
        label="Enable syllabus pages"
        checked={value.enabled !== false}
        onChange={(v) => onChange({ ...value, enabled: v })}
      />

      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <TextField
          label="Link / button label"
          value={value.ctaLabel}
          onChange={(v) => onChange({ ...value, ctaLabel: v })}
          placeholder={DEFAULT_SYLLABUS.ctaLabel}
        />
        <TextField
          label="Page heading"
          value={value.heading}
          onChange={(v) => onChange({ ...value, heading: v })}
          placeholder={DEFAULT_SYLLABUS.heading}
        />
      </div>
      <TextField
        label="Page subline"
        value={value.blurb}
        onChange={(v) => onChange({ ...value, blurb: v })}
        placeholder={DEFAULT_SYLLABUS.blurb}
      />
      <TextField
        label="Download button label"
        value={value.downloadLabel}
        onChange={(v) => onChange({ ...value, downloadLabel: v })}
        placeholder={DEFAULT_SYLLABUS.downloadLabel}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Coupons                                                             */
/* ------------------------------------------------------------------ */

export function CouponsSection({
  value,
  onChange,
  items,
}: {
  value: Coupon[];
  onChange: (v: Coupon[]) => void;
  items: { id: string; title: string; category: string }[];
}) {
  const paidItems = items.filter((i) => i.category === "course" || i.category === "workshop");

  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">Discount codes</h2>
      <p className="text-sm text-muted mb-5">
        Buyers type these into the checkout. The discount is recomputed on the server before anyone is
        charged, so nothing here can be faked from a browser. A code with no items ticked applies to
        everything.
      </p>

      <Repeater
        items={value}
        onChange={onChange}
        addLabel="Add code"
        emptyHint="No codes yet. Add one and it works immediately — no deploy."
        blank={() => ({
          code: "",
          type: "percent" as const,
          value: 10,
          appliesTo: [],
          active: true,
          usedCount: 0,
        })}
        render={(c, update) => (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <TextField
                label="Code"
                value={c.code}
                onChange={(v) => update({ code: v.toUpperCase().replace(/\s+/g, "") })}
                placeholder="EARLYBIRD"
              />
              <SelectField
                label="Type"
                value={c.type}
                onChange={(v) => update({ type: v as Coupon["type"] })}
                options={[
                  { value: "percent", label: "% off" },
                  { value: "flat", label: "₹ off" },
                ]}
              />
              <NumberField
                label={c.type === "percent" ? "Percent off" : "Rupees off"}
                value={c.value}
                onChange={(v) => update({ value: v })}
                min={0}
                max={c.type === "percent" ? 100 : undefined}
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <TextField
                label="Expires (optional)"
                type="date"
                value={c.expiresAt ?? ""}
                onChange={(v) => update({ expiresAt: v })}
                help="Usable through the whole of this day, IST."
              />
              <NumberField
                label="Max uses (0 = unlimited)"
                value={c.maxUses ?? 0}
                onChange={(v) => update({ maxUses: v })}
                min={0}
              />
              <NumberField
                label="Min order ₹ (optional)"
                value={c.minAmount ?? 0}
                onChange={(v) => update({ minAmount: v })}
                min={0}
              />
            </div>

            <div className="mb-3">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-2">
                Applies to (none ticked = everything)
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {paidItems.map((item) => {
                  // asArray, not `?? []`: coupons go through asArray but
                  // each coupon's own appliesTo does not, and a stored
                  // string survives `??` — .includes then answers wrongly
                  // and .filter below throws outright.
                  const appliesTo = asArray<string>(c.appliesTo);
                  const on = appliesTo.includes(item.id);
                  return (
                    <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={on}
                        onChange={(e) =>
                          update({
                            appliesTo: e.target.checked
                              ? [...appliesTo, item.id]
                              : appliesTo.filter((id) => id !== item.id),
                          })
                        }
                      />
                      {item.title}
                    </label>
                  );
                })}
                {paidItems.length === 0 && <span className="text-[13px] text-muted">No paid items yet.</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <Toggle label="Active" checked={c.active !== false} onChange={(v) => update({ active: v })} />
              <span className="font-mono text-[11px] text-muted">Used {c.usedCount ?? 0} time(s)</span>
            </div>
          </>
        )}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tax & pricing — decides what the buyer is CHARGED                   */
/* ------------------------------------------------------------------ */

export function TaxSection({
  value,
  onChange,
  b2bReady,
}: {
  value: TaxSettings;
  onChange: (v: TaxSettings) => void;
  /** False until the tax_details column exists — see docs/MIGRATIONS.md. */
  b2bReady: boolean;
}) {
  const set = (patch: Partial<TaxSettings>) => onChange({ ...value, ...patch });
  const rate = Number.isFinite(value.ratePercent) ? value.ratePercent : 18;
  const example = 6999;
  // Computed by the same function that charges, then formatted the same
  // way — a rounded estimate here would quote ₹8,259 for a charge of
  // ₹8,258.82, which is exactly the mismatch this panel exists to warn about.
  const exampleTotal = formatRupees(
    computePricing({
      listPrice: example,
      tax: { ...value, ratePercent: rate },
      sellerStateCode: "",
    }).payable
  );

  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">Tax &amp; pricing</h2>
      <p className="text-sm text-muted mb-5">
        This is the only setting on the site that changes what people are charged. Read the example before
        you touch it.
      </p>

      <div className="bg-marigold/10 border border-marigold rounded-card p-4 mb-5">
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-marigold-ink mb-2">
          Careful — this moves money
        </p>
        <p className="text-[13px] text-ink-soft leading-relaxed">
          Turning GST on in <b>&ldquo;added on top&rdquo;</b> mode raises the price of every paid item at
          once. A course you typed as ₹{example.toLocaleString("en-IN")} starts charging{" "}
          <b>₹{exampleTotal}</b>. Nobody who already bought is affected — only new
          orders. Change it when you are ready to collect the tax, not before.
        </p>
      </div>

      <Toggle
        label="Charge GST"
        checked={value.enabled}
        onChange={(v) => set({ enabled: v })}
        help="Off means buyers pay exactly the price on the item and no tax logic runs at all."
      />

      {value.enabled && (
        <>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <NumberField
              label="GST rate %"
              value={rate}
              onChange={(v) => set({ ratePercent: v })}
              min={0}
              max={28}
              help="18% is the usual rate for online courses and training."
            />
            <SelectField
              label="The price I type is"
              value={value.mode}
              onChange={(v) => set({ mode: v as TaxSettings["mode"] })}
              options={[
                { value: "exclusive", label: "Before GST — add it on top" },
                { value: "inclusive", label: "The final price — GST is inside it" },
              ]}
              help={
                value.mode === "exclusive"
                  ? `Type ${example}, buyer pays ₹${exampleTotal}.`
                  : `Type ${example}, buyer pays ₹${example.toLocaleString("en-IN")} and the invoice shows the GST inside it.`
              }
            />
          </div>

          {value.mode === "exclusive" && (
            <SelectField
              label="On cards and item pages, show"
              value={value.display}
              onChange={(v) => set({ display: v as TaxSettings["display"] })}
              options={[
                { value: "plus-gst", label: `"₹${example.toLocaleString("en-IN")} + GST"` },
                { value: "total", label: `"₹${exampleTotal}" with "incl. ${rate}% GST" under it` },
              ]}
              help="Either way the checkout shows the full breakdown and charges the same total. This is only about the first number a stranger sees."
            />
          )}

          <hr className="border-line my-6" />
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-3">Business buyers</p>

          {b2bReady ? (
            <>
              <Toggle
                label="Let buyers add their GSTIN at checkout"
                checked={value.b2bEnabled}
                onChange={(v) => set({ b2bEnabled: v })}
                help="Adds an optional 'Buying for a business?' link in the checkout. The invoice is then raised to their company, and taxed as IGST when they are outside your state."
              />
              {value.b2bEnabled && (
                <TextField
                  label="What buyers see above the GSTIN field"
                  rows={3}
                  value={value.b2bPrompt}
                  onChange={(v) => set({ b2bPrompt: v })}
                  placeholder={DEFAULT_TAX.b2bPrompt}
                />
              )}
            </>
          ) : (
            <div className="bg-card border border-line rounded-card p-4">
              <p className="text-[13px] text-ink-soft leading-relaxed">
                <b>One database change needed first.</b> Storing a buyer&apos;s GSTIN — and freezing each
                order&apos;s tax split so old invoices never change when you change the rate — needs one new
                column on the orders table. Run the single line in{" "}
                <code className="font-mono text-[12px]">docs/MIGRATIONS.md</code> in your Neon console, and
                this switch turns itself on within a few minutes. Nothing else breaks in the meantime.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Business details — the one place to change a phone number, email,   */
/* GSTIN or address. Read by the GST invoice AND by                    */
/* Terms/Privacy/Refund/Shipping/Contact, so it lives once here rather  */
/* than as separate copies on each.                                    */
/* ------------------------------------------------------------------ */

export function BusinessSection({ value, onChange }: { value: BusinessSettings; onChange: (v: BusinessSettings) => void }) {
  const set = (patch: Partial<BusinessSettings>) => onChange({ ...value, ...patch });

  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">Business details</h2>
      <p className="text-sm text-muted mb-5">
        Your legal identity and contact details. This is the single source for all of it — the GST invoice
        header and the Terms, Privacy, Refund, Shipping and Contact pages all read from here. Blank fields
        fall back to what&apos;s already on those pages, so nothing goes empty while you fill this in.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Legal name" value={value.legalName} onChange={(v) => set({ legalName: v })} placeholder={DEFAULT_BUSINESS.legalName} />
        <TextField label="Trade name" value={value.tradeName} onChange={(v) => set({ tradeName: v })} placeholder={DEFAULT_BUSINESS.tradeName} />
        <TextField label="GSTIN" value={value.gstin} onChange={(v) => set({ gstin: v.toUpperCase() })} placeholder={DEFAULT_BUSINESS.gstin} />
        <TextField label="State" value={value.stateName} onChange={(v) => set({ stateName: v })} placeholder={DEFAULT_BUSINESS.stateName} />
        <TextField
          label="State code"
          value={value.stateCode}
          onChange={(v) => set({ stateCode: v })}
          placeholder={DEFAULT_BUSINESS.stateCode}
          help="Two digits. The first two of your GSTIN — also decides CGST+SGST vs IGST on every order."
        />
        <TextField label="Contact email" value={value.email} onChange={(v) => set({ email: v })} placeholder={DEFAULT_BUSINESS.email} />
        <TextField label="Contact phone" value={value.phone} onChange={(v) => set({ phone: v })} placeholder={DEFAULT_BUSINESS.phone} />
      </div>

      <LinesField
        label="Address (one line per line)"
        value={value.addressLines}
        onChange={(v) => set({ addressLines: v })}
        placeholder={DEFAULT_BUSINESS.addressLines.join("\n")}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* GST invoicing                                                       */
/* ------------------------------------------------------------------ */

export function InvoiceSection({ value, onChange }: { value: InvoiceSettings; onChange: (v: InvoiceSettings) => void }) {
  const set = (patch: Partial<InvoiceSettings>) => onChange({ ...value, ...patch });

  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">GST invoices</h2>
      <p className="text-sm text-muted mb-5">
        When this is on, every paid order gets a tax invoice at its own link, shown on the confirmation page
        and available in the buyer&apos;s email via the <code className="font-mono">{"{invoiceUrl}"}</code>{" "}
        token. Buyers save it as a PDF from their browser&apos;s print dialog.
      </p>

      <Toggle
        label="Enable GST invoices"
        checked={value.enabled}
        onChange={(v) => set({ enabled: v })}
        help="Master switch. Off means no invoice is generated for anything, even items set to 'always'."
      />

      <SelectField
        label="Issue invoices for"
        value={value.mode}
        onChange={(v) => set({ mode: v as InvoiceSettings["mode"] })}
        options={[
          { value: "all", label: "Every paid order" },
          { value: "none", label: "Only items I opt in individually" },
        ]}
        help="Each course or workshop can override this in its own form: Default / Always / Never."
      />

      <hr className="border-line my-6" />

      <TextField
        label="SAC code"
        value={value.hsnSac}
        onChange={(v) => set({ hsnSac: v })}
        placeholder="999293"
        help="999293 is commercial training & coaching. Your legal name, GSTIN, address and contact details now live in the Business details section above — this document reads them from there."
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <TextField
          label="Invoice number prefix"
          value={value.numberPrefix}
          onChange={(v) => set({ numberPrefix: v })}
          placeholder="DE/"
        />
        <TextField
          label="Financial year"
          value={value.financialYear}
          onChange={(v) => set({ financialYear: v })}
          placeholder="2026-27"
        />
      </div>

      <div className="bg-card border border-line rounded-card p-4 mb-4">
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-2">Read this once</p>
        <p className="text-[13px] text-ink-soft leading-relaxed">
          Invoice numbers are derived from the order ID, so the same order always shows the same number and
          two orders can never collide. They are <b>not</b> strictly sequential. Most CAs accept that for a
          digital-only seller, but confirm it with yours before you rely on these for filing — making them
          sequential needs a counter in the database, which is a bigger change.
        </p>
      </div>

      <TextField label="Declaration" rows={3} value={value.declaration} onChange={(v) => set({ declaration: v })} />
      <TextField label="Extra notes (optional)" rows={2} value={value.notes} onChange={(v) => set({ notes: v })} />

      <ImageUploadField
        label="Signature image (optional)"
        sizeHint="transparent PNG, about 400 × 140 px"
        value={value.signatureUrl ?? ""}
        onChange={(v) => set({ signatureUrl: v })}
        pathPrefix="branding/signature-"
        previewClassName="w-40 h-16"
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Booth — the DJ / music room                                         */
/* ------------------------------------------------------------------ */

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function StartedAtField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const id = useId();
  return (
    <div className="mb-3">
      <label htmlFor={id} className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
        Started at
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={id}
          type="datetime-local"
          className={`${INPUT_CLASS} flex-1 min-w-[220px]`}
          value={isoToLocalInput(value)}
          onChange={(e) => {
            const iso = localInputToIso(e.target.value);
            if (iso) onChange(iso);
          }}
        />
        <button
          type="button"
          onClick={() => onChange(new Date().toISOString())}
          className="border border-line px-4 py-2.5 rounded-[10px] text-sm font-semibold whitespace-nowrap hover:border-ink transition-colors"
        >
          Set to now
        </button>
      </div>
      <p className="text-[12px] text-muted mt-1.5 leading-relaxed">
        The least obvious field here: this is the moment the playlist is treated as having begun, at its first
        track. Nobody who lands on /booth restarts it from the top — they join wherever it&apos;s got to since
        this moment, on a loop. Hit &ldquo;Set to now&rdquo; to restart the room from the beginning right now.
      </p>
    </div>
  );
}

function PlaylistUrlField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  const trimmed = value.trim();
  const invalid = trimmed.length > 0 && !parsePlaylistId(trimmed);
  return (
    <div className="mb-3">
      <label htmlFor={id} className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
        YouTube playlist URL
      </label>
      <input
        id={id}
        className={`${INPUT_CLASS} ${invalid ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
        placeholder="https://www.youtube.com/playlist?list=PLxxxxxxxx"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {invalid ? (
        <p className="text-[12px] text-red-600 mt-1.5 leading-relaxed">
          Couldn&apos;t find a playlist ID in that. Paste the playlist page URL, a watch URL with &amp;list=... in
          it, or a bare playlist ID.
        </p>
      ) : (
        <p className="text-[12px] text-muted mt-1.5 leading-relaxed">
          Paste the playlist&apos;s URL (youtube.com/playlist?list=... or a watch URL carrying &amp;list=...), or
          just the bare playlist ID.
        </p>
      )}
    </div>
  );
}

export function BoothSection({ value, onChange }: { value: BoothSettings; onChange: (v: BoothSettings) => void }) {
  const set = (patch: Partial<BoothSettings>) => onChange({ ...value, ...patch });
  const status = boothStatusLine(value);
  const statusIsLive = status.startsWith("Live");

  return (
    <section>
      <h2 className="font-display font-bold text-lg mb-1">The Booth</h2>
      <p className="text-sm text-muted mb-3">
        A DJ room at /booth, built around a YouTube playlist that&apos;s already playing on a server clock when
        someone walks in — not a player anyone presses start on. Off by default: the page 404s and the nav link
        stays hidden until this is switched on <em>and</em> one set below is marked live.
      </p>

      {/* Computed live from the form state below, not from the last save —
          this is what tells you WHY the room is hidden instead of leaving
          you to guess which of the two switches disagrees. */}
      <p
        className={`text-[13px] font-semibold px-3 py-2 rounded-[8px] mb-5 inline-flex items-center gap-2 ${
          statusIsLive ? "bg-live/10 text-live" : "bg-card text-ink-soft border border-line"
        }`}
      >
        <span aria-hidden>{statusIsLive ? "●" : "○"}</span>
        {status}
      </p>

      <Toggle
        label="Enable the Booth"
        checked={value.enabled === true}
        onChange={(v) => set({ enabled: v })}
        help="Off means /booth 404s and the nav link hides, even if a set below is marked live."
      />

      <TextField label="Page heading" value={value.heading} onChange={(v) => set({ heading: v })} placeholder={DEFAULT_BOOTH.heading} />
      <TextField label="Blurb" rows={2} value={value.blurb} onChange={(v) => set({ blurb: v })} placeholder={DEFAULT_BOOTH.blurb} />

      <ImageUploadField
        label="Gear photo (optional)"
        sizeHint="landscape reads best on the page"
        value={value.gearImageUrl ?? ""}
        onChange={(v) => set({ gearImageUrl: v })}
        pathPrefix="booth/gear-"
        previewClassName="w-40 h-28"
      />
      <TextField
        label="Gear caption (optional)"
        value={value.gearCaption ?? ""}
        onChange={(v) => set({ gearCaption: v })}
        placeholder="The setup."
      />

      <hr className="border-line my-6" />
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-3">Playlists</p>
      <p className="text-[13px] text-ink-soft mb-3 leading-relaxed">
        Only the first one with &ldquo;Live&rdquo; checked plays on the page. To switch what&apos;s playing,
        untick the old one and tick the new one — don&apos;t leave two ticked, the earlier row silently wins.
      </p>

      <Repeater<BoothSet>
        items={value.sets}
        onChange={(next) => onChange({ ...value, sets: next })}
        addLabel="Add playlist"
        emptyHint="No playlists yet. Add one, paste its YouTube playlist URL, mark it live, and it's playing on /booth — no deploy."
        blank={() => ({
          id: crypto.randomUUID(),
          title: "",
          youtubePlaylistUrl: "",
          avgTrackSec: DEFAULT_AVG_TRACK_SEC,
          bpm: 120,
          startedAtIso: new Date().toISOString(),
          tracklist: [],
          live: false,
        })}
        render={(item, update) => (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <TextField label="Title" value={item.title} onChange={(v) => update({ title: v })} placeholder="Late Night, Vol. 3" />
              <PlaylistUrlField value={item.youtubePlaylistUrl} onChange={(v) => update({ youtubePlaylistUrl: v })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <NumberField
                label="Fallback avg. track length (sec)"
                value={item.avgTrackSec}
                onChange={(v) => update({ avgTrackSec: v })}
                min={1}
                help="Only used without a YOUTUBE_API_KEY — everyone's clock guesses which track using this average, so it's deterministic even though it's approximate. Ignored once real durations are available."
              />
              <NumberField
                label="BPM"
                value={item.bpm}
                onChange={(v) => update({ bpm: v })}
                min={1}
                max={220}
                help="Typed by hand — drives the light show's tempo only. Nothing reads the audio."
              />
            </div>
            <StartedAtField value={item.startedAtIso} onChange={(v) => update({ startedAtIso: v })} />
            <LinesField
              label="Tracklist (one title per line, in playlist order — optional)"
              value={item.tracklist}
              onChange={(v) => update({ tracklist: v })}
              rows={6}
              placeholder={"Opening track\nSecond track"}
              help="Only used without a YOUTUBE_API_KEY. With a key set, real titles fetched from YouTube are shown instead — nothing needs to be typed here."
            />
            <Toggle label="Live — this is the set playing right now" checked={item.live === true} onChange={(v) => update({ live: v })} />
          </>
        )}
      />
    </section>
  );
}
