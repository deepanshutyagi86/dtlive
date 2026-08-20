import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Bricolage_Grotesque, Instrument_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { getBranding, SITE_URL } from "@/lib/site-settings";

// Variable font (wght 200-800) — no weight array on purpose, so the whole
// range is available and font-bold/font-extrabold both resolve to a real
// instance rather than a synthesised one.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});
const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

const DEFAULT_TITLE = "Deepanshu Tyagi — Live";
const DEFAULT_DESCRIPTION =
  "Courses, workshops, agency work, shop links and ventures — everything live, right now.";

// Async so the favicon and link-preview image can come from the DB rather
// than the repo. Falls through to the file conventions (icon.svg,
// apple-icon.tsx, opengraph-image.tsx) whenever the admin hasn't uploaded
// one — an explicit value here overrides the convention, so a blank
// setting has to mean "omit the key", not "set it to undefined-ish".
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();

  const title = branding.siteTitle || DEFAULT_TITLE;
  const description = branding.siteDescription || DEFAULT_DESCRIPTION;

  // Next's `metadata.icons` overrides the FILE CONVENTIONS as a whole, not
  // per-slot: setting only `icon` here would suppress apple-icon.tsx and
  // silently drop the iOS touch icon. So each slot always gets a value —
  // the uploaded one, or the other uploaded one, and the object is left
  // empty entirely when neither exists so icon.svg / apple-icon.tsx take
  // over untouched.
  const icons: NonNullable<Metadata["icons"]> = {};
  const anyIcon = branding.faviconUrl || branding.appleIconUrl;
  if (anyIcon) {
    icons.icon = branding.faviconUrl || anyIcon;
    icons.apple = branding.appleIconUrl || anyIcon;
  }

  return {
    // Required for any relative URL in openGraph/alternates to resolve.
    // Without it Next warns at build and social scrapers get a relative
    // path they cannot fetch.
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      // Every child page's own title flows through this, so /courses reads
      // "Courses — Deepanshu Tyagi Live" without repeating the suffix.
      template: "%s — Deepanshu Tyagi Live",
    },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: "Deepanshu Tyagi Live",
      url: SITE_URL,
      title,
      description,
      locale: "en_IN",
      ...(branding.ogImageUrl ? { images: [{ url: branding.ogImageUrl, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(branding.ogImageUrl ? { images: [branding.ogImageUrl] } : {}),
    },
    robots: { index: true, follow: true },
    ...(Object.keys(icons).length > 0 ? { icons } : {}),
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pixelId = process.env.META_PIXEL_ID;

  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable} ${spaceMono.variable}`}>
      <body className="font-body">
        {pixelId && (
          <>
            <Script
              id="meta-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(pixelId)});
fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
