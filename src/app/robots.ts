import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-settings";

// /admin and the API surface are disallowed because there is nothing there
// for a crawler and an indexed admin login is a free invitation. They are
// already behind real auth — this is hygiene, not the lock.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/order/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
