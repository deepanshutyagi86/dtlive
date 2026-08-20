import { ImageResponse } from "next/og";

// The fallback link-preview card, generated at request time so there is no
// binary asset to keep in the repo. An admin-uploaded image in
// /admin/settings → Branding overrides this via the root layout's
// openGraph.images, because an explicit metadata value wins over the file
// convention.
//
// Satori (what next/og renders with) supports a SUBSET of CSS: flexbox
// only, every element with more than one child needs an explicit
// display:flex, and there is no `gap` shorthand fallback. Keep this
// deliberately plain — a clever layout here fails at build, not at runtime.
export const runtime = "edge";
export const alt = "Deepanshu Tyagi — Live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F2F1EC",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 22,
              backgroundColor: "#FF3B30",
              marginRight: 18,
              display: "flex",
            }}
          />
          <div style={{ fontSize: 26, letterSpacing: 4, color: "#6E6D63", display: "flex" }}>
            DEEPANSHUTYAGI.LIVE
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 800, color: "#191913", letterSpacing: -3, display: "flex" }}>
            Live,
          </div>
          <div style={{ fontSize: 92, fontWeight: 800, color: "#B87A00", letterSpacing: -3, display: "flex" }}>
            right now.
          </div>
          <div style={{ fontSize: 34, color: "#41403a", marginTop: 22, display: "flex" }}>
            Courses, workshops, and work built for you.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: "#191913",
              color: "#F2F1EC",
              fontSize: 26,
              fontWeight: 600,
              padding: "16px 34px",
              borderRadius: 999,
            }}
          >
            deepanshutyagi.live
          </div>
        </div>
      </div>
    ),
    size
  );
}
