"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminNavGroup {
  group: string;
  links: { href: string; label: string }[];
}

// Client-side only for one reason: knowing which page you are on. The
// panel used to give no sign of it at all — every link looked the same.
export default function AdminNav({ groups }: { groups: AdminNavGroup[] }) {
  const path = usePathname() || "";
  const isOn = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));

  return (
    <nav className="adm-nav" aria-label="Admin">
      {groups.map((section) => (
        <div key={section.group} className="adm-nav-group">
          <p className="adm-nav-label">{section.group}</p>
          {section.links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`adm-nav-link ${isOn(item.href) ? "is-on" : ""}`}
              aria-current={isOn(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
