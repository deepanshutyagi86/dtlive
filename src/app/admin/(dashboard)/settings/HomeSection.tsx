"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import { ImageUploadField, LinesField, Repeater, TextField } from "@/components/admin/AdminFields";
import {
  cardFade,
  cardFadeBackground,
    DEFAULT_HOME,
  HOME_CARD_LABELS,
  MAX_TEXT_LIFT,
  SOFT_FADE_BELOW,
  type HomeCardKey,
  type HomeImage,
  type HomeSettings,
} from "@/lib/home-settings";

// Admin → Homepage. Laid out in the order a visitor scrolls the page, and
// each block names the section it controls, so "where does this show?"
// never needs asking. Every text box is blank = the default shown in grey.

const PREFIX = "branding/home-";

function Block({
  id,
  tag,
  title,
  blurb,
  children,
  open = false,
}: {
  id: string;
  tag: string;
  title: string;
  blurb: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details id={id} open={open} className="adm-block group">
      <summary className="adm-block-head">
        <span>
          <span className="adm-tag">{tag}</span>
          <span className="adm-block-title">{title}</span>
          <span className="adm-block-blurb">{blurb}</span>
        </span>
        <span className="adm-chev" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="adm-block-body">{children}</div>
    </details>
  );
}

/** Upload + focal point for one homepage photo, with an optional preview the caller draws. */
function PhotoField({
  label,
  value,
  onChange,
  help,
  sizeHint,
  aspect = "aspect-[4/3]",
  screenshot = false,
  preview,
}: {
  label: string;
  value: HomeImage;
  onChange: (v: HomeImage) => void;
  help?: string;
  sizeHint?: string;
  aspect?: string;
  screenshot?: boolean;
  preview?: ReactNode;
}) {
  return (
    <div>
      <ImageUploadField
        label={label}
        sizeHint={sizeHint}
        help={help}
        value={value.url}
        onChange={(url) =>
          onChange(url ? { ...value, url, focal: url === value.url ? value.focal : undefined } : { url: "" })
        }
        pathPrefix={PREFIX}
        maxWidth={screenshot ? 1440 : undefined}
        hidePreview
      />
      {value.url && (
        <div className="-mt-2 mb-5 space-y-3">
          {preview && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1.5">How it looks on the site</p>
              {preview}
            </div>
          )}
          {!screenshot && (
            <FocalPointPicker
              thumbnail={value.url}
              imageFocal={value.focal}
              onChange={(focal) => {
                const { focal: _old, ...rest } = value;
                onChange(focal ? { ...rest, focal } : rest);
              }}
              aspectClassName={aspect}
              showPreview={!preview}
            />
          )}
          <button type="button" className="adm-link-danger" onClick={() => onChange({ url: "" })}>
            Remove photo
          </button>
        </div>
      )}
    </div>
  );
}

const CARD_TONE: Record<HomeCardKey, { bg: string; fg: string; sub: string }> = {
  learn: { bg: "#ffffff", fg: "#0e0e0c", sub: "03 courses · self-paced" },
  live: { bg: "#0e0e0c", fg: "#efede6", sub: "Workshops · waitlist open" },
  studio: { bg: "#f5a300", fg: "#0e0e0c", sub: "From ₹15,000" },
  shipped: { bg: "#ffffff", fg: "#0e0e0c", sub: "Brands · ventures" },
};

/** A small copy of the homepage card — same fade formula as the site, so the sliders preview exactly. */
function CardPreview({ k, img }: { k: HomeCardKey; img: HomeImage }) {
  const tone = CARD_TONE[k];
  const soft = cardFade(img) < SOFT_FADE_BELOW;
  const glow = soft ? `0 0 2px ${tone.bg}, 0 1px 14px ${tone.bg}, 0 0 28px ${tone.bg}` : undefined;
  return (
    <div
      className="relative w-full max-w-[240px] aspect-[4/3.6] rounded-[18px] overflow-hidden border border-line"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {img.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={img.focal ? { objectPosition: `${img.focal.x}% ${img.focal.y}%` } : { objectPosition: "top" }}
        />
      )}
      <span className="absolute inset-0" style={{ background: cardFadeBackground(tone.bg, cardFade(img)) }} />
      <span className="absolute left-3.5 bottom-3.5" style={{ transform: `translateY(-${img.textLift ?? 0}px)` }}>
        <b className="block font-display text-[20px] tracking-tight leading-none" style={{ textShadow: glow }}>
          {HOME_CARD_LABELS[k]}
        </b>
        <span className="block font-mono text-[9px] uppercase tracking-wider opacity-75 mt-1.5" style={{ textShadow: glow }}>
          {tone.sub}
        </span>
      </span>
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  unit,
  onChange,
  onReset,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  return (
    <label className="adm-slider">
      <span className="adm-slider-top">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted">{label}</span>
        <span className="adm-slider-val">
          {value}
          {unit}
          <button type="button" onClick={(e) => (e.preventDefault(), onReset())}>
            reset
          </button>
        </span>
      </span>
      <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="text-[12px] text-muted">{hint}</span>
    </label>
  );
}

/** Photo + preview + the two sliders, for one shortcut card. */
function CardField({ k, value, onChange }: { k: HomeCardKey; value: HomeImage; onChange: (v: HomeImage) => void }) {
  return (
    <div className="adm-cardfield">
      <PhotoField
        label={`${HOME_CARD_LABELS[k]} card`}
        sizeHint="1200 × 900 px"
        value={value}
        onChange={onChange}
        aspect="aspect-[4/3.6]"
        preview={
          <div className="space-y-4">
            <CardPreview k={k} img={value} />
            <Slider
              label="Photo fade"
              hint="Lower = more of your photo shows. The label gets a soft glow when the fade is light."
              value={cardFade(value)}
              min={0}
              max={100}
              unit="%"
              onChange={(fade) => onChange({ ...value, fade })}
              onReset={() => {
                const { fade: _f, ...rest } = value;
                onChange(rest);
              }}
            />
            <Slider
              label="Text position"
              hint="Moves “Learn / Live / …” up from the bottom edge."
              value={value.textLift ?? 0}
              min={0}
              max={MAX_TEXT_LIFT}
              unit="px"
              onChange={(textLift) => onChange({ ...value, textLift })}
              onReset={() => {
                const { textLift: _t, ...rest } = value;
                onChange(rest);
              }}
            />
          </div>
        }
      />
    </div>
  );
}

export default function HomeSection({
  value,
  onChange,
  ticker,
  onTickerChange,
}: {
  value: HomeSettings;
  onChange: (v: HomeSettings) => void;
  ticker: string[];
  onTickerChange: (v: string[]) => void;
}) {
  const set = <K extends keyof HomeSettings>(key: K, patch: Partial<HomeSettings[K]>) =>
    onChange({ ...value, [key]: { ...(value[key] as object), ...patch } as HomeSettings[K] });
  const d = DEFAULT_HOME;

  return (
    <div className="space-y-3">
      <Block id="home-hero" tag="Top" title="Hero" blurb="The headline and the line under it." open>
        <TextField
          label="Small line above the headline"
          value={value.hero.eyebrow}
          onChange={(v) => set("hero", { eyebrow: v })}
          placeholder={d.hero.eyebrow}
          help="Shown after your name: “Deepanshu Tyagi · Builder / Seeker”."
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Headline, bold" value={value.hero.line1} onChange={(v) => set("hero", { line1: v })} placeholder={d.hero.line1} />
          <TextField
            label="Headline, italic gold"
            value={value.hero.line2}
            onChange={(v) => set("hero", { line2: v })}
            placeholder={d.hero.line2}
          />
        </div>
        <TextField label="Line under it" rows={2} value={value.hero.lede} onChange={(v) => set("hero", { lede: v })} placeholder={d.hero.lede} />
      </Block>

      <Block
        id="home-cards"
        tag="Under the hero"
        title="The four shortcut cards"
        blurb="Optional background photo for Learn, Live, Studio and Shipped."
      >
        <p className="adm-note">
          The photo fades into the card&rsquo;s own colour at the bottom so the label stays readable. Use{" "}
          <b>Photo fade</b> to show more or less of the photo and <b>Text position</b> to move the label — the small card
          shows exactly how it will look. Leave a card empty to keep it plain.
        </p>
        <div className="grid sm:grid-cols-2 gap-x-6">
          {(Object.keys(HOME_CARD_LABELS) as HomeCardKey[]).map((k) => (
            <CardField
              key={k}
              k={k}
              value={value.cards[k]}
              onChange={(img) => set("cards", { [k]: img } as Partial<HomeSettings["cards"]>)}
            />
          ))}
        </div>
      </Block>

      <Block id="home-bands" tag="Under the cards" title="The two moving bands" blurb="Black band = your credos. Gold band = proof lines.">
        <LinesField
          label="Black band — credos, one per line"
          value={value.credos}
          onChange={(v) => onChange({ ...value, credos: v })}
          placeholder={d.credos.join("\n")}
        />
        <LinesField
          label="Gold band — proof lines, one per line"
          value={ticker}
          onChange={onTickerChange}
          placeholder={"100+ students taught\nApps live on the Play Store\n15+ websites shipped"}
          help="Keep these numbers matching your bio. The first two also become the Proof tiles in Shipped unless you set your own below."
        />
      </Block>

      <Block id="home-live" tag="02 · Live" title="The live workshop ticket" blurb="Workshop photo on the left, your photo on the right.">
        <p className="adm-note">
          <b>The workshop photo is the workshop&rsquo;s own thumbnail</b> — set it in{" "}
          <Link href="/admin/items" className="underline">
            Items
          </Link>{" "}
          on that workshop. The ticket always shows the next upcoming workshop, with a live countdown to its start.
          <br />
          <br />
          <b>Free workshop:</b> the registration form sits right on the ticket (same fields as the workshop&rsquo;s own
          form). Registrations land in{" "}
          <Link href="/admin/leads" className="underline">
            Leads
          </Link>{" "}
          under that workshop, and the person immediately gets a &ldquo;Join the WhatsApp group&rdquo; button — set the link
          in Items → workshop → Joining info → Group link. It goes in their confirmation email too.
          <br />
          <b>Paid workshop:</b> the button opens checkout right there; orders land in Orders.
          <br />
          <b>Nothing scheduled:</b> a waitlist form, tagged <code>waitlist:live</code> in Leads.
        </p>
        <PhotoField
          label="Your photo"
          sizeHint="portrait, 900 × 1200 px"
          help="A clean portrait, face in the top third. Blank uses the photo from Appearance → About you."
          value={value.live.host}
          onChange={(img) => set("live", { host: img })}
          aspect="aspect-[3/4]"
        />
        <TextField
          label="Caption on your photo"
          value={value.live.hostCaption}
          onChange={(v) => set("live", { hostCaption: v })}
          placeholder={d.live.hostCaption}
        />
        <PhotoField
          label="Backup workshop photo"
          sizeHint="1200 × 1200 px"
          help="Only used when the workshop has no thumbnail, or none is scheduled and the last one had none either."
          value={value.live.cover}
          onChange={(img) => set("live", { cover: img })}
          aspect="aspect-[4/5]"
        />
        <TextField
          label="Line when a workshop is scheduled"
          rows={2}
          value={value.live.pitch}
          onChange={(v) => set("live", { pitch: v })}
          placeholder={d.live.pitch}
          help="Only used if the workshop itself has no description."
        />
        <TextField
          label="Line when nothing is scheduled (waitlist)"
          rows={2}
          value={value.live.waitlistPitch}
          onChange={(v) => set("live", { waitlistPitch: v })}
          placeholder={d.live.waitlistPitch}
        />
      </Block>

      <Block id="home-studio" tag="03 · Studio" title="The website demo" blurb="Real screenshots of sites you built — it plays brief → build → live.">
        <p className="adm-note">
          Add 2–4 sites. Take a <b>full-page desktop screenshot</b> (tall is good — it scrolls by itself on “Day 14”) and,
          if you have one, a phone screenshot for the phone that slides in. With none added, the demo uses your Shipped
          photos instead.
        </p>
        <Repeater
          items={value.studio.showcase}
          onChange={(showcase) => set("studio", { showcase })}
          addLabel="Add a site"
          emptyHint="No sites yet — the demo is using your Shipped photos."
          blank={() => ({ name: "", url: "", tag: "", desktop: { url: "" }, mobile: { url: "" } })}
          render={(s, update) => (
            <div>
              <div className="grid sm:grid-cols-2 gap-3">
                <TextField label="Brand name" value={s.name} onChange={(v) => update({ name: v })} placeholder="Sanskriti the Antique" />
                <TextField label="Short tag" value={s.tag} onChange={(v) => update({ tag: v })} placeholder="D2C store · Shopify" />
              </div>
              <TextField
                label="Live link (optional)"
                value={s.url}
                onChange={(v) => update({ url: v })}
                placeholder="https://sanskritiantique.com"
                help="Shown in the address bar and as a “See it live” link."
              />
              <div className="grid sm:grid-cols-2 gap-x-6">
                <PhotoField
                  label="Desktop screenshot"
                  sizeHint="1440 px wide, any height"
                  value={s.desktop}
                  onChange={(img) => update({ desktop: img })}
                  screenshot
                  preview={
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.desktop.url} alt="" className="w-full max-w-[260px] h-40 object-cover object-top rounded-[10px] border border-line" />
                  }
                />
                <PhotoField
                  label="Phone screenshot"
                  sizeHint="390 px wide, any height"
                  value={s.mobile}
                  onChange={(img) => update({ mobile: img })}
                  screenshot
                  preview={
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.mobile.url} alt="" className="w-20 h-40 object-cover object-top rounded-[12px] border-4 border-ink" />
                  }
                />
              </div>
            </div>
          )}
        />
      </Block>

      <Block id="home-proof" tag="04 · Shipped" title="Proof tiles" blurb="The tiles after your shipped work — now with photos.">
        <p className="adm-note">
          Your shops and ventures come from{" "}
          <Link href="/admin/items" className="underline">
            Items
          </Link>
          . These are the extra tiles at the end. Leave the list empty to show the first two gold-band lines as plain tiles.
        </p>
        <Repeater
          items={value.proof}
          onChange={(proof) => onChange({ ...value, proof })}
          addLabel="Add a proof tile"
          emptyHint="Showing the first two gold-band lines as plain tiles."
          blank={() => ({ text: "", image: { url: "" } })}
          render={(p, update) => (
            <div>
              <TextField label="Text" value={p.text} onChange={(v) => update({ text: v })} placeholder="100+ students taught" />
              <PhotoField
                label="Photo (optional)"
                sizeHint="1200 × 800 px"
                help="Darkened at the bottom so the white text reads. Without a photo the tile stays plain."
                value={p.image}
                onChange={(img) => update({ image: img })}
                aspect="aspect-[3/2]"
              />
            </div>
          )}
        />
      </Block>

      <Block id="home-seeker" tag="Off the build" title="The dark section" blurb="Meditate / dance line, and the books on your desk.">
        <TextField label="Opening line" value={value.seeker.line} onChange={(v) => set("seeker", { line: v })} placeholder={d.seeker.line} />
        <TextField
          label="Italic gold line"
          rows={2}
          value={value.seeker.accent}
          onChange={(v) => set("seeker", { accent: v })}
          placeholder={d.seeker.accent}
        />
        <TextField label="Small line under it" value={value.seeker.sub} onChange={(v) => set("seeker", { sub: v })} placeholder={d.seeker.sub} />
        <LinesField
          label="On my desk — one book per line"
          value={value.seeker.books}
          onChange={(books) => set("seeker", { books })}
          placeholder={d.seeker.books.join("\n")}
        />
      </Block>

      <Block id="home-note" tag="Before the footer" title="A note from me" blurb="The signed card.">
        <TextField label="Note" rows={3} value={value.note.text} onChange={(v) => set("note", { text: v })} placeholder={d.note.text} />
        <TextField label="Line under it" value={value.note.sub} onChange={(v) => set("note", { sub: v })} placeholder={d.note.sub} />
        <p className="adm-note">The signature photo is your photo from Appearance → About you.</p>
      </Block>
    </div>
  );
}
