export type Category = "course" | "workshop" | "agency" | "shop" | "venture";

export type CurriculumBlock = { title: string; body: string };

export interface RegistrationField {
  key: string;
  label: string;
  type: "text" | "email" | "tel";
  required: boolean;
}

// The form RegisterModal has always rendered. Every read site must fall
// back to this when an item has no registrationFields configured, so
// existing items render and behave identically after this field shipped.
export const DEFAULT_REGISTRATION_FIELDS: RegistrationField[] = [
  { key: "name", label: "Full name", type: "text", required: true },
  { key: "email", label: "email", type: "email", required: true },
  { key: "phone", label: "WhatsApp number", type: "tel", required: true },
];

// Shared by CourseDetails/WorkshopDetails — all optional, all read sites
// must treat undefined as: fields = DEFAULT_REGISTRATION_FIELDS, every
// showX flag = true, unlimitedSeats = false.
interface RegistrationDisplayOptions {
  registrationFields?: RegistrationField[];
  showSeatsBadge?: boolean;
  showCountdown?: boolean;
  showPriceBadge?: boolean;
  unlimitedSeats?: boolean;
}

export interface CourseDetails extends RegistrationDisplayOptions {
  price: number; // in rupees
  duration?: string;
  curriculum: CurriculumBlock[];
}

export interface WorkshopDetails extends RegistrationDisplayOptions {
  price: number;
  date: string; // ISO datetime
  seatsTotal: number;
  seatsLeft: number;
  agenda: CurriculumBlock[];
}

export interface AgencyDetails {
  priceType: "from" | "quote";
  priceValue?: number; // used if priceType === "from"
  included: string[];
}

export interface ShopDetails {
  platform: string; // Amazon | Flipkart | Meesho | Website | ...
  brand: string; // Vyrelle | Muchhad | Sanskriti | ...
  externalUrl: string;
}

export interface VentureDetails {
  equityPercent?: number;
  status: "live" | "coming-soon";
  externalUrl?: string;
  role?: string;
}

export type ItemDetails =
  | CourseDetails
  | WorkshopDetails
  | AgencyDetails
  | ShopDetails
  | VentureDetails;

export const CATEGORY_LABELS: Record<Category, string> = {
  course: "Course",
  workshop: "Workshop",
  agency: "Agency",
  shop: "Shop",
  venture: "Venture",
};

export const CATEGORY_CTA: Record<Category, string> = {
  course: "Enroll now",
  workshop: "Reserve seat",
  agency: "Get a quote",
  shop: "Visit store",
  venture: "Visit site",
};
