// Every date on this site is authored and read in IST. Server components render
// in the server's zone (UTC on Vercel), so `toLocaleString("en-IN")` alone gives
// Indian *formatting* with UTC *values* — 5h30m early. Always pass timeZone.
export const SITE_TZ = "Asia/Kolkata";
