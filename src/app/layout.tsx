import type { Metadata } from "next";
import { Syne, Instrument_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
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

export const metadata: Metadata = {
  title: "Deepanshu Tyagi — Live",
  description:
    "Courses, workshops, agency work, shop links and ventures — everything live, right now.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${instrument.variable} ${spaceMono.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
