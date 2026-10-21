import type { Category, ImageFocal } from "@/lib/types";
import type { TaxSettings } from "@/lib/settings-types";

// Everything the V4 homepage needs, already shaped on the server. Plain
// serialisable data only — this crosses the server → client boundary.

export interface V4Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  thumbnail: string | null;
  imageFocal: ImageFocal | null;
  price: number;
  priceLabel: string;
  priceNote: string;
  /** This item's own resolved tax — the same value its product page passes to checkout. */
  tax: TaxSettings;
  bestFor: string | null;
  level: string | null;
  forWho: string[];
  notForWho: string[];
  outcomes: string[];
  modules: string[];
  hasFreeLesson: boolean;
}

export interface V4NextLive {
  slug: string;
  title: string;
  dateLabel: string;
  seatsLabel: string | null;
  priceLabel: string;
}

export interface V4PastLive {
  title: string;
  dateLabel: string;
}

export interface V4Studio {
  slug: string;
  title: string;
  description: string;
  priceLabel: string;
}

export interface V4Shipped {
  id: string;
  title: string;
  label: string;
  href: string;
  external: boolean;
  thumbnail: string | null;
  imageFocal: ImageFocal | null;
  category: Category;
}

export interface V4Links {
  whatsapp?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  email?: string;
}

export interface V4HomeProps {
  fontVars: string;
  courses: V4Course[];
  nextLive: V4NextLive | null;
  pastLive: V4PastLive | null;
  studio: V4Studio | null;
  shipped: V4Shipped[];
  credentials: string[];
  links: V4Links;
  waitlistHref: string;
  bioName: string;
  bioAvatar: string | null;
  gstin: string;
}
