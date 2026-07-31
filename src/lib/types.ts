export type Category = "course" | "workshop" | "agency" | "shop" | "venture";

export type CurriculumBlock = { title: string; body: string };

export interface CourseDetails {
  price: number; // in rupees
  duration?: string;
  curriculum: CurriculumBlock[];
}

export interface WorkshopDetails {
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
