"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_REGISTRATION_FIELDS, type RegistrationField } from "@/lib/types";

type Category = "course" | "workshop" | "agency" | "shop" | "venture";

interface Block { title: string; body: string }

export interface ExistingItem {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  description: string;
  category: Category;
  live: boolean;
  featured: boolean;
  order: number;
  details: any;
}

function emptyDetails(category: Category): any {
  switch (category) {
    case "course":
      return { price: 0, duration: "", curriculum: [] as Block[] };
    case "workshop":
      return { price: 0, date: "", seatsTotal: 20, seatsLeft: 20, agenda: [] as Block[] };
    case "agency":
      return { priceType: "from", priceValue: 0, included: [] as string[] };
    case "shop":
      return { platform: "", brand: "", externalUrl: "" };
    case "venture":
      return { equityPercent: 0, status: "live", externalUrl: "", role: "" };
  }
}

export default function ItemForm({ existing }: { existing: ExistingItem | null }) {
  const router = useRouter();
  const isNew = !existing;

  const [category, setCategory] = useState<Category>(existing?.category ?? "course");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [thumbnail, setThumbnail] = useState(existing?.thumbnail ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [live, setLive] = useState(existing?.live ?? false);
  const [featured, setFeatured] = useState(existing?.featured ?? false);
  const [order, setOrder] = useState(existing?.order ?? 0);
  const [details, setDetails] = useState<any>(existing?.details ?? emptyDetails(category));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onCategoryChange(next: Category) {
    setCategory(next);
    if (isNew) setDetails(emptyDetails(next));
  }

  async function save() {
    setError(null);
    if (!title || !slug) {
      setError("Title and slug are required.");
      return;
    }
    setSaving(true);
    const payload = { title, slug, thumbnail, description, category, live, featured, order: Number(order), details };
    const res = await fetch(isNew ? "/api/items" : `/api/items/${existing!.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push("/admin/items");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Could not save.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[640px]">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value as Category)}
            className="input"
          >
            <option value="course">Course</option>
            <option value="workshop">Workshop</option>
            <option value="agency">Agency</option>
            <option value="shop">Shop</option>
            <option value="venture">Venture</option>
          </select>
        </Field>
        <Field label="Slug (URL)">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="build-in-public-workshop" className="input" />
        </Field>
      </div>

      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
      </Field>

      <Field label="Short description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input" />
      </Field>

      <Field label="Thumbnail URL (optional)">
        <input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} className="input" />
      </Field>

      <div className="flex gap-8 my-5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="w-4 h-4" />
          Live (visible on site)
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="w-4 h-4" />
          Featured (homepage spotlight)
        </label>
        <Field label="Order" inline>
          <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className="input w-20" />
        </Field>
      </div>

      <hr className="border-line my-6" />
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-4">{category}-specific details</p>

      {category === "course" && <CourseFields details={details} setDetails={setDetails} />}
      {category === "workshop" && <WorkshopFields details={details} setDetails={setDetails} />}
      {category === "agency" && <AgencyFields details={details} setDetails={setDetails} />}
      {category === "shop" && <ShopFields details={details} setDetails={setDetails} />}
      {category === "venture" && <VentureFields details={details} setDetails={setDetails} />}

      {error && <p className="text-live text-sm mt-5">{error}</p>}

      <div className="flex gap-3 mt-8">
        <button
          onClick={save}
          disabled={saving}
          className="bg-ink text-bone px-6 py-3 rounded-full font-semibold text-sm hover:bg-marigold hover:text-ink transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : isNew ? "Create item" : "Save changes"}
        </button>
        <button
          onClick={() => router.push("/admin/items")}
          className="border border-line px-6 py-3 rounded-full font-semibold text-sm hover:border-ink transition-colors"
        >
          Cancel
        </button>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          padding: 10px 14px;
          font-size: 16px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 10px;
        }
        .input:focus {
          outline: none;
          border-color: var(--marigold);
          box-shadow: 0 0 0 2px var(--marigold);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children, inline }: { label: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <div className={inline ? "" : "mb-4"}>
      <label className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function BlockListEditor({
  label,
  blocks,
  onChange,
}: {
  label: string;
  blocks: Block[];
  onChange: (b: Block[]) => void;
}) {
  return (
    <div className="mb-5">
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-2">{label}</p>
      {blocks.map((b, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            className="input"
            placeholder="Title"
            value={b.title}
            onChange={(e) => {
              const next = [...blocks];
              next[i] = { ...next[i], title: e.target.value };
              onChange(next);
            }}
          />
          <input
            className="input"
            placeholder="Body"
            value={b.body}
            onChange={(e) => {
              const next = [...blocks];
              next[i] = { ...next[i], body: e.target.value };
              onChange(next);
            }}
          />
          <button onClick={() => onChange(blocks.filter((_, j) => j !== i))} className="text-live px-2">
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...blocks, { title: "", body: "" }])}
        className="text-sm font-semibold text-marigold-deep"
      >
        + Add block
      </button>
    </div>
  );
}

function CourseFields({ details, setDetails }: { details: any; setDetails: (d: any) => void }) {
  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Price (₹)">
          <input type="number" className="input" value={details.price} onChange={(e) => setDetails({ ...details, price: Number(e.target.value) })} />
        </Field>
        <Field label="Duration label">
          <input className="input" placeholder="self-paced" value={details.duration} onChange={(e) => setDetails({ ...details, duration: e.target.value })} />
        </Field>
      </div>
      <BlockListEditor label="Curriculum" blocks={details.curriculum ?? []} onChange={(b) => setDetails({ ...details, curriculum: b })} />

      <DisplayToggles details={details} setDetails={setDetails} showSeats={false} />
      <RegistrationFieldsEditor
        fields={details.registrationFields ?? DEFAULT_REGISTRATION_FIELDS}
        onChange={(f) => setDetails({ ...details, registrationFields: f })}
      />
    </>
  );
}

function WorkshopFields({ details, setDetails }: { details: any; setDetails: (d: any) => void }) {
  return (
    <>
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Price (₹)">
          <input type="number" className="input" value={details.price} onChange={(e) => setDetails({ ...details, price: Number(e.target.value) })} />
        </Field>
        <Field label="Date & time">
          <input type="datetime-local" className="input" value={details.date?.slice(0, 16) ?? ""} onChange={(e) => setDetails({ ...details, date: new Date(e.target.value).toISOString() })} />
        </Field>
        {!details.unlimitedSeats && (
          <Field label="Seats left">
            <input type="number" className="input" value={details.seatsLeft} onChange={(e) => setDetails({ ...details, seatsLeft: Number(e.target.value) })} />
          </Field>
        )}
      </div>
      <BlockListEditor label="Agenda" blocks={details.agenda ?? []} onChange={(b) => setDetails({ ...details, agenda: b })} />

      <label className="flex items-center gap-2 text-sm font-medium mt-1 mb-4">
        <input
          type="checkbox"
          checked={!!details.unlimitedSeats}
          onChange={(e) => setDetails({ ...details, unlimitedSeats: e.target.checked })}
          className="w-4 h-4"
        />
        Unlimited registration
      </label>

      <DisplayToggles details={details} setDetails={setDetails} showSeats={!details.unlimitedSeats} />
      <RegistrationFieldsEditor
        fields={details.registrationFields ?? DEFAULT_REGISTRATION_FIELDS}
        onChange={(f) => setDetails({ ...details, registrationFields: f })}
      />
    </>
  );
}

function DisplayToggles({
  details,
  setDetails,
  showSeats,
}: {
  details: any;
  setDetails: (d: any) => void;
  showSeats: boolean;
}) {
  return (
    <div className="mb-5">
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-2">Display on page</p>
      <div className="flex flex-wrap gap-6">
        {showSeats && (
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={details.showSeatsBadge !== false}
              onChange={(e) => setDetails({ ...details, showSeatsBadge: e.target.checked })}
              className="w-4 h-4"
            />
            Seats badge
          </label>
        )}
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={details.showCountdown !== false}
            onChange={(e) => setDetails({ ...details, showCountdown: e.target.checked })}
            className="w-4 h-4"
          />
          Countdown
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={details.showPriceBadge !== false}
            onChange={(e) => setDetails({ ...details, showPriceBadge: e.target.checked })}
            className="w-4 h-4"
          />
          Price badge
        </label>
      </div>
    </div>
  );
}

function RegistrationFieldsEditor({
  fields,
  onChange,
}: {
  fields: RegistrationField[];
  onChange: (f: RegistrationField[]) => void;
}) {
  return (
    <div className="mb-5">
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-2">Registration fields</p>
      {fields.map((f, i) => (
        <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
          <input
            className="input flex-1 min-w-[100px]"
            placeholder="key"
            value={f.key}
            onChange={(e) => {
              const next = [...fields];
              next[i] = { ...next[i], key: e.target.value };
              onChange(next);
            }}
          />
          <input
            className="input flex-1 min-w-[120px]"
            placeholder="Label"
            value={f.label}
            onChange={(e) => {
              const next = [...fields];
              next[i] = { ...next[i], label: e.target.value };
              onChange(next);
            }}
          />
          <select
            className="input w-auto"
            value={f.type}
            onChange={(e) => {
              const next = [...fields];
              next[i] = { ...next[i], type: e.target.value as RegistrationField["type"] };
              onChange(next);
            }}
          >
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="tel">Phone</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
            <input
              type="checkbox"
              checked={f.required}
              onChange={(e) => {
                const next = [...fields];
                next[i] = { ...next[i], required: e.target.checked };
                onChange(next);
              }}
            />
            Required
          </label>
          <button onClick={() => onChange(fields.filter((_, j) => j !== i))} className="text-live px-2">
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...fields, { key: "", label: "", type: "text", required: false }])}
        className="text-sm font-semibold text-marigold-deep"
      >
        + Add field
      </button>
    </div>
  );
}

function AgencyFields({ details, setDetails }: { details: any; setDetails: (d: any) => void }) {
  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Price type">
          <select className="input" value={details.priceType} onChange={(e) => setDetails({ ...details, priceType: e.target.value })}>
            <option value="from">Starting at ₹</option>
            <option value="quote">Custom quote</option>
          </select>
        </Field>
        {details.priceType === "from" && (
          <Field label="Starting price (₹)">
            <input type="number" className="input" value={details.priceValue} onChange={(e) => setDetails({ ...details, priceValue: Number(e.target.value) })} />
          </Field>
        )}
      </div>
      <Field label="What's included (one per line)">
        <textarea
          className="input"
          rows={4}
          value={(details.included ?? []).join("\n")}
          onChange={(e) => setDetails({ ...details, included: e.target.value.split("\n") })}
        />
      </Field>
    </>
  );
}

function ShopFields({ details, setDetails }: { details: any; setDetails: (d: any) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Field label="Platform">
        <input className="input" placeholder="Amazon / Flipkart / Meesho / Website" value={details.platform} onChange={(e) => setDetails({ ...details, platform: e.target.value })} />
      </Field>
      <Field label="Brand">
        <input className="input" placeholder="Vyrelle / Muchhad / Sanskriti" value={details.brand} onChange={(e) => setDetails({ ...details, brand: e.target.value })} />
      </Field>
      <Field label="External URL">
        <input className="input" value={details.externalUrl} onChange={(e) => setDetails({ ...details, externalUrl: e.target.value })} />
      </Field>
    </div>
  );
}

function VentureFields({ details, setDetails }: { details: any; setDetails: (d: any) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Field label="Equity %">
        <input type="number" className="input" value={details.equityPercent} onChange={(e) => setDetails({ ...details, equityPercent: Number(e.target.value) })} />
      </Field>
      <Field label="Status">
        <select className="input" value={details.status} onChange={(e) => setDetails({ ...details, status: e.target.value })}>
          <option value="live">Live</option>
          <option value="coming-soon">Coming soon</option>
        </select>
      </Field>
      <Field label="External URL">
        <input className="input" value={details.externalUrl} onChange={(e) => setDetails({ ...details, externalUrl: e.target.value })} />
      </Field>
      <Field label="Your role">
        <input className="input" placeholder="Co-founder · CTO" value={details.role} onChange={(e) => setDetails({ ...details, role: e.target.value })} />
      </Field>
    </div>
  );
}
