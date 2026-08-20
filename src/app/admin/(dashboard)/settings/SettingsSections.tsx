"use client";
import {
  ImageUploadField,
  LinesField,
  NumberField,
  Repeater,
  SelectField,
  TextField,
  Toggle,
} from "@/components/admin/AdminFields";
import {
  BRANDING_HELP,
  DEFAULT_BIO,
  DEFAULT_INVOICE,
  DEFAULT_NAV,
  DEFAULT_STARTER,
  type BioSettings,
  type Branding,
  type Coupon,
  type InvoiceSettings,
  type NavSettings,
  type StarterSettings,
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
                  const on = (c.appliesTo ?? []).includes(item.id);
                  return (
                    <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={on}
                        onChange={(e) =>
                          update({
                            appliesTo: e.target.checked
                              ? [...(c.appliesTo ?? []), item.id]
                              : (c.appliesTo ?? []).filter((id) => id !== item.id),
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
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-3">Seller details</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Legal name" value={value.legalName} onChange={(v) => set({ legalName: v })} placeholder={DEFAULT_INVOICE.legalName} />
        <TextField label="Trade name" value={value.tradeName} onChange={(v) => set({ tradeName: v })} placeholder={DEFAULT_INVOICE.tradeName} />
        <TextField label="GSTIN" value={value.gstin} onChange={(v) => set({ gstin: v.toUpperCase() })} placeholder={DEFAULT_INVOICE.gstin} />
        <TextField label="State" value={value.stateName} onChange={(v) => set({ stateName: v })} placeholder="Uttar Pradesh" />
        <TextField
          label="State code"
          value={value.stateCode}
          onChange={(v) => set({ stateCode: v })}
          placeholder="09"
          help="Two digits. The first two of your GSTIN."
        />
        <TextField label="Contact email" value={value.email} onChange={(v) => set({ email: v })} />
        <TextField label="Contact phone" value={value.phone} onChange={(v) => set({ phone: v })} />
      </div>

      <LinesField
        label="Address (one line per line)"
        value={value.addressLines}
        onChange={(v) => set({ addressLines: v })}
        placeholder={"Badum, Meerut\nMeerut, Uttar Pradesh – 250502\nIndia"}
      />

      <hr className="border-line my-6" />
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-3">Tax</p>

      <div className="grid sm:grid-cols-3 gap-3">
        <TextField
          label="SAC code"
          value={value.hsnSac}
          onChange={(v) => set({ hsnSac: v })}
          placeholder="999293"
          help="999293 is commercial training & coaching."
        />
        <NumberField
          label="GST rate %"
          value={value.taxRatePercent}
          onChange={(v) => set({ taxRatePercent: v })}
          min={0}
          max={28}
          help="Split into equal CGST + SGST on the invoice."
        />
        <div className="mb-3">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">Your listed prices are</p>
          <p className="text-sm py-2.5">Inclusive of GST</p>
          <p className="text-[12px] text-muted leading-relaxed">
            Fixed, and not an option on purpose: checkout charges exactly the price on the item, it never
            adds tax on top. The invoice back-computes the taxable value from what was actually paid, so the
            &ldquo;Total paid&rdquo; line always equals the amount that hit your Razorpay account. Changing
            this would need checkout to start adding GST first.
          </p>
        </div>
      </div>

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
