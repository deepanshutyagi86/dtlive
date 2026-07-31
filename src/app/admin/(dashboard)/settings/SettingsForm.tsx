"use client";
import { useEffect, useState } from "react";

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

export default function SettingsForm() {
  const [ticker, setTicker] = useState<string[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [links, setLinks] = useState<FooterLinks>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setTicker(d.ticker ?? []);
        setTestimonials(d.testimonials ?? []);
        setLinks(d.footerLinks ?? {});
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, testimonials, footerLinks: links }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div className="max-w-[640px] space-y-10">
      <section>
        <h2 className="font-display font-bold text-lg mb-3">Ticker lines</h2>
        <p className="text-sm text-muted mb-3">One proof point per line — scrolls on the homepage.</p>
        <textarea
          className="w-full px-3.5 py-3 text-sm bg-card border border-line rounded-[10px] focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
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
              className="flex-1 px-3.5 py-2.5 text-sm bg-card border border-line rounded-[10px]"
              placeholder="Quote"
              value={t.quote}
              onChange={(e) => {
                const next = [...testimonials];
                next[i] = { ...next[i], quote: e.target.value };
                setTestimonials(next);
              }}
            />
            <input
              className="w-48 px-3.5 py-2.5 text-sm bg-card border border-line rounded-[10px]"
              placeholder="Who"
              value={t.who}
              onChange={(e) => {
                const next = [...testimonials];
                next[i] = { ...next[i], who: e.target.value };
                setTestimonials(next);
              }}
            />
            <button onClick={() => setTestimonials(testimonials.filter((_, j) => j !== i))} className="text-live px-2">
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => setTestimonials([...testimonials, { quote: "", who: "" }])}
          className="text-sm font-semibold text-marigold-deep"
        >
          + Add testimonial
        </button>
      </section>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Contact & social links</h2>
        <div className="space-y-3">
          {(["whatsapp", "instagram", "youtube", "linkedin", "email"] as const).map((key) => (
            <div key={key}>
              <label className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">{key}</label>
              <input
                className="w-full px-3.5 py-2.5 text-sm bg-card border border-line rounded-[10px]"
                value={links[key] ?? ""}
                onChange={(e) => setLinks({ ...links, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="bg-ink text-bone px-6 py-3 rounded-full font-semibold text-sm hover:bg-marigold hover:text-ink transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-marigold-deep font-medium text-sm">Saved ✓</span>}
      </div>
    </div>
  );
}
