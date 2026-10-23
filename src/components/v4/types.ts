import type { Category, ImageFocal, RegistrationField } from "@/lib/types";
import type { TaxSettings } from "@/lib/settings-types";
import type { HomeSettings } from "@/lib/home-settings";

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
  id: string;
  /** ISO start time — the countdown runs to this. */
  dateIso: string;
  price: number;
  priceNote: string;
  tax: TaxSettings;
  /** The workshop's own registration form (Items → workshop). */
  fields: RegistrationField[];
  /** Seats are tracked and none are left. */
  isFull: boolean;
  slug: string;
  title: string;
  description: string;
  thumbnail: string | null;
  imageFocal: ImageFocal | null;
  dateLabel: string;
  /** "30 Sept" — the big line on the ticket stub. */
  bigDate: string;
  /** "Sat · 10:00 am IST" — under it. */
  smallDate: string;
  seatsLabel: string | null;
  priceLabel: string;
}

export interface V4PastLive {
  slug: string;
  title: string;
  dateLabel: string;
  thumbnail: string | null;
  imageFocal: ImageFocal | null;
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
  home: HomeSettings;
  bioName: string;
  bioAvatar: string | null;
  gstin: string;
}
