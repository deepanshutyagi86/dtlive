// Single source of truth for the legal/business facts that must appear
// consistently across Terms, Privacy, Refund, Shipping and Contact pages.
// Sourced from GST Registration Certificate (GSTIN 09HXMPD1277C1ZF).

export const BUSINESS = {
  legalName: "Deepanshu",
  tradeName: "Deepanshu Empire",
  constitution: "Proprietorship",
  gstin: "09HXMPD1277C1ZF",
  address: {
    line1: "Badum, Meerut",
    city: "Meerut",
    district: "Meerut",
    state: "Uttar Pradesh",
    pin: "250502",
    country: "India",
  },
  email: "dtyagi.main@gmail.com",
  phone: "+91 98706 00903",
  siteName: "deepanshutyagi.live",
} as const;

export const fullAddress = `${BUSINESS.address.line1}, ${BUSINESS.address.city}, ${BUSINESS.address.district}, ${BUSINESS.address.state} – ${BUSINESS.address.pin}, ${BUSINESS.address.country}`;
