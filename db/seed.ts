import { sql } from "../src/lib/db";
import { randomUUID } from "crypto";

async function main() {
  await sql`DELETE FROM leads`;
  await sql`DELETE FROM orders`;
  await sql`DELETE FROM items`;
  await sql`DELETE FROM settings`;

  const items = [
    {
      title: "Business Foundations",
      slug: "business-foundations",
      category: "course",
      description: "Start, run and monetise a real business as a student. The exact playbook I use.",
      live: true,
      featured: false,
      order: 1,
      details: {
        price: 999,
        duration: "self-paced",
        curriculum: [
          { title: "Module 1 — Pick the idea", body: "How to choose something worth building, fast." },
          { title: "Module 2 — Build the offer", body: "Pricing, positioning, and your first landing page." },
          { title: "Module 3 — Get paid", body: "Wiring up payments and taking your first order." },
        ],
      },
    },
    {
      title: "Build-in-Public Workshop",
      slug: "build-in-public-workshop",
      category: "workshop",
      description:
        "One weekend, live with me. You leave with a landing page, a working payment link and your first public post.",
      live: true,
      featured: true,
      order: 1,
      details: {
        price: 499,
        date: new Date(Date.now() + 10 * 864e5).toISOString(),
        seatsTotal: 20,
        seatsLeft: 14,
        agenda: [
          { title: "Day 1 — Idea to internet", body: "Pick the idea, build and deploy a live page." },
          { title: "Day 2 — Internet to income", body: "Wire the payment link, publish together." },
        ],
      },
    },
    {
      title: "Website in 14 days",
      slug: "website-in-14-days",
      category: "agency",
      description: "Full store or landing page — design, build, payments wired. Fixed price.",
      live: true,
      featured: false,
      order: 1,
      details: {
        priceType: "from",
        priceValue: 15000,
        included: ["Design + build", "Payment gateway wired", "1 round of revisions", "14-day delivery"],
      },
    },
    {
      title: "Vyrelle on Meesho",
      slug: "vyrelle-meesho",
      category: "shop",
      description: "Our clothing drops, now on Meesho.",
      live: true,
      featured: false,
      order: 1,
      details: { platform: "Meesho", brand: "Vyrelle", externalUrl: "https://meesho.com" },
    },
    {
      title: "Sanskriti the Antique",
      slug: "sanskriti-the-antique",
      category: "shop",
      description: "1000+ Indian handicrafts — sarees, gemstones, wooden art.",
      live: true,
      featured: false,
      order: 2,
      details: { platform: "Website", brand: "Sanskriti", externalUrl: "https://sanskrititheantique.com" },
    },
    {
      title: "Muchhad — Desi Eats",
      slug: "muchhad-desi-eats",
      category: "venture",
      description: "Whole-wheat biscuits, zero preservatives, pure desi ghee.",
      live: true,
      featured: false,
      order: 1,
      details: { equityPercent: 10, status: "live", externalUrl: "https://muchhadeats.in", role: "Co-founder · CTO" },
    },
    {
      title: "FlatBot — PG finder",
      slug: "flatbot-pg-finder",
      category: "venture",
      description: "Trusted PGs & flatmates for Delhi students. Active community, real users.",
      live: true,
      featured: false,
      order: 2,
      details: { equityPercent: 100, status: "live", externalUrl: "https://flatbot.vyrelle.in", role: "Founder" },
    },
  ];

  for (const item of items) {
    await sql`
      INSERT INTO items (id, title, slug, description, category, live, featured, "order", details)
      VALUES (${randomUUID()}, ${item.title}, ${item.slug}, ${item.description}, ${item.category},
              ${item.live}, ${item.featured}, ${item.order}, ${JSON.stringify(item.details)})
    `;
  }

  await sql`
    INSERT INTO settings (key, value) VALUES
    ('ticker', ${JSON.stringify([
      "500+ students taught",
      "3 apps on Play Store",
      "10% equity · Muchhad",
      "15+ websites shipped",
      "HackArena · 6 cities",
    ])}),
    ('testimonials', ${JSON.stringify([
      { quote: "Made my first ₹300 before the Sunday session even ended.", who: "Priya, workshop attendee" },
      { quote: "The course is the only one I finished. Short lessons, real tasks.", who: "Business Foundations student" },
      { quote: "Store, cart and Cashfree live in two weeks, exactly as promised.", who: "D2C founder" },
    ])}),
    ('footerLinks', ${JSON.stringify({
      whatsapp: "https://wa.me/910000000000",
      instagram: "https://www.instagram.com/thedeepanshutyagii",
      youtube: "https://www.youtube.com/@thedeepanshutyagi",
      linkedin: "https://linkedin.com/in/deepanshutyagi86",
      email: "deepanshutyagi0784@gmail.com",
    })})
  `;

  console.log("Seeded ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
