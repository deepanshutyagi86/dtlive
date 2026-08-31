import { describe, it, expect } from "vitest";
import { parseVideoUrl } from "../video";

describe("parseVideoUrl", () => {
  it("accepts every shape of YouTube link a person actually copies", () => {
    const shapes = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      // The share link carries a timestamp and a tracking param.
      "https://youtu.be/dQw4w9WgXcQ?t=42&si=abc123",
      // Pasted with whitespace, which is what a copy off a phone does.
      "  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ",
      // A bare id typed by hand.
      "dQw4w9WgXcQ",
    ];
    for (const url of shapes) {
      const parsed = parseVideoUrl(url);
      expect(parsed, url).not.toBeNull();
      expect(parsed!.kind).toBe("youtube");
      expect(parsed!.embedUrl).toContain("/embed/dQw4w9WgXcQ");
      expect(parsed!.posterUrl).toContain("dQw4w9WgXcQ");
    }
  });

  it("embeds YouTube without cookies, without related videos, and autoplaying", () => {
    const { embedUrl } = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")!;
    expect(embedUrl.startsWith("https://www.youtube-nocookie.com/")).toBe(true);
    expect(embedUrl).toContain("rel=0");
    // Safe only because the iframe mounts on click; see OverviewVideo.tsx.
    expect(embedUrl).toContain("autoplay=1");
  });

  it("turns a Drive share link into the preview player, not the download", () => {
    const shapes = [
      "https://drive.google.com/file/d/1AbC_dEfGh/view?usp=sharing",
      "https://drive.google.com/open?id=1AbC_dEfGh",
      "https://drive.google.com/uc?id=1AbC_dEfGh&export=download",
    ];
    for (const url of shapes) {
      const parsed = parseVideoUrl(url);
      expect(parsed, url).not.toBeNull();
      expect(parsed!.kind).toBe("drive");
      expect(parsed!.embedUrl).toBe("https://drive.google.com/file/d/1AbC_dEfGh/preview");
    }
  });

  it("plays a direct video file natively", () => {
    const parsed = parseVideoUrl("https://blob.vercel-storage.com/module-0.mp4");
    expect(parsed!.kind).toBe("file");
    expect(parsed!.embedUrl).toBe("https://blob.vercel-storage.com/module-0.mp4");
  });

  it("returns null rather than an empty player for anything unusable", () => {
    for (const bad of [
      "",
      "   ",
      undefined,
      null,
      "not a url",
      "youtube.com/watch?v=dQw4w9WgXcQ", // no scheme — new URL() throws
      // http:// would be blocked as mixed content on an https page, and
      // the failure is silent, so it must be refused at save time instead.
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=tooshort",
      "https://vimeo.com/123456789", // not supported, must not half-work
      "https://example.com/page.html",
    ]) {
      expect(parseVideoUrl(bad as string), String(bad)).toBeNull();
    }
  });
});
