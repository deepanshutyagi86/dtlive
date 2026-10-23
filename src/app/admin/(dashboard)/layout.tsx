import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import AdminNav, { type AdminNavGroup } from "./AdminNav";

export const dynamic = "force-dynamic";

// Grouped rather than one flat list. Settings used to be a single page
// with thirteen unrelated things on it — hero copy next to GST — and the
// only way to find anything was to scroll. The groups say what a screen
// is FOR: things you sell, money, the site itself, everything else.
const NAV: AdminNavGroup[] = [
  {
    group: "Sell",
    links: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/items", label: "Items" },
      { href: "/admin/live", label: "Live" },
      { href: "/admin/ads", label: "Ad pages" },
      { href: "/admin/guides", label: "Guides" },
    ],
  },
  {
    group: "Money",
    links: [
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/leads", label: "Leads" },
      { href: "/admin/pricing", label: "Pricing & GST" },
      { href: "/admin/business", label: "Business details" },
    ],
  },
  {
    group: "Site",
    links: [
      { href: "/admin/homepage", label: "Homepage" },
      { href: "/admin/appearance", label: "Appearance" },
      { href: "/admin/emails", label: "Emails" },
    ],
  },
  {
    group: "System",
    links: [
      { href: "/admin/extras", label: "Extras" },
      { href: "/admin/diagnostics", label: "Diagnostics" },
    ],
  },
];

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The Edge middleware can only check that the session cookie exists — it
  // can't verify the HMAC. This is the real lock: it runs on every page in
  // the (dashboard) group before any of them query the database.
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <div className="adm-brand">
          <Link href="/admin" className="adm-logo">
            deepanshu<span>.live</span>
          </Link>
          <span className="adm-badge">admin</span>
          <a href="/" target="_blank" rel="noopener noreferrer" className="adm-viewsite">
            View site ↗
          </a>
        </div>
        <AdminNav groups={NAV} />
        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noopener noreferrer">
            View site ↗
          </a>
          <LogoutButton />
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
