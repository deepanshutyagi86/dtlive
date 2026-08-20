import { ImageResponse } from "next/og";

// iOS ignores SVG favicons and paints transparency black, so the touch
// icon has to be a real raster with a real background. Generated rather
// than committed for the same reason as opengraph-image.tsx; an uploaded
// one in /admin/settings → Branding overrides it.
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#191913",
          color: "#F2F1EC",
          fontSize: 84,
          fontWeight: 800,
          letterSpacing: -4,
        }}
      >
        DT
      </div>
    ),
    size
  );
}
