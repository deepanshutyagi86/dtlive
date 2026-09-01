import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

// Grouped rather than one flat list. Settings used to be a single page
// with thirteen unrelated things on it — hero copy next to GST — and the
// only way to find anything was to scroll. The groups say what a screen
// is FOR: things you sell, money, the site itself, everything else.
const NAV: { group: string; links: { href: string; label: string }[] }[] = [
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
    <div className="min-h-screen bg-bone flex flex-col md:flex-row">
      <aside className="md:w-[220px] md:min-h-screen md:border-r border-line bg-card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between md:block">
          <Link href="/admin" className="font-display font-extrabold text-[16px]">
            DT<span className="text-marigold-ink">.live</span>
          </Link>
          <span className="font-mono text-[10px] text-muted md:block md:mt-1">admin panel</span>
        </div>
        {/* On a phone the groups flatten into one scrolling row — a
            stack of headed lists on a 60px-tall bar would be unusable. */}
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible md:py-2">
          {NAV.map((section) => (
            <div key={section.group} className="contents md:block">
              <p className="hidden md:block font-mono text-[9.5px] uppercase tracking-wider text-muted px-5 pt-4 pb-1.5">
                {section.group}
              </p>
              {section.links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap px-5 py-3 md:py-2 text-sm font-medium border-b md:border-b-0 md:border-l-2 border-transparent hover:bg-bone hover:border-marigold transition-colors block"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 md:mt-auto">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10 md:py-10 max-w-[1100px]">{children}</main>
    </div>
  );
}
