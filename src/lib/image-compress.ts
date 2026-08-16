const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

export interface CompressedImage {
  blob: Blob;
  extension: "webp" | "jpg";
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Resizes and re-encodes an image entirely in the browser before it's
// uploaded: caps the longest edge at MAX_DIMENSION (never upscales),
// re-encodes to WebP at ~0.82 quality, and falls back to JPEG if the
// browser can't actually produce WebP (canvas.toBlob silently returns a
// different mime type instead of erroring, so we check for that rather
// than trust the request).
//
// EXIF orientation: handled for free by passing imageOrientation:
// "from-image" to createImageBitmap — every modern engine (Chrome 81+,
// Firefox 77+, Safari 15.4+) rotates the pixels to match the embedded EXIF
// tag during decode, before anything is drawn to canvas. That's the cheap
// path. If createImageBitmap isn't available at all, we fall back to a
// plain <img> decode, which does NOT correct rotation — hand-rolling EXIF
// byte parsing just to cover that fallback isn't cheap, so it's skipped
// rather than faked.
export async function compressImage(file: File): Promise<CompressedImage> {
  const originalBytes = file.size;

  let source: CanvasImageSource;
  let sourceWidth: number;
  let sourceHeight: number;
  let bitmap: ImageBitmap | null = null;

  if (typeof createImageBitmap === "function") {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    source = bitmap;
    sourceWidth = bitmap.width;
    sourceHeight = bitmap.height;
  } else {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image."));
      el.src = URL.createObjectURL(file);
    });
    source = img;
    sourceWidth = img.naturalWidth;
    sourceHeight = img.naturalHeight;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.round(sourceWidth * scale);
  const targetHeight = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser.");
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  bitmap?.close();

  let blob = await canvasToBlob(canvas, "image/webp", QUALITY);
  let extension: "webp" | "jpg" = "webp";

  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg", QUALITY);
    extension = "jpg";
  }
  if (!blob) throw new Error("Could not encode that image in this browser.");

  const compressedBytes = blob.size;
  console.log(
    `[image-compress] ${file.name}: ${originalBytes.toLocaleString()}B -> ${compressedBytes.toLocaleString()}B ` +
      `(${extension}, ${sourceWidth}x${sourceHeight} -> ${targetWidth}x${targetHeight})`
  );

  return { blob, extension, originalBytes, compressedBytes, width: targetWidth, height: targetHeight };
}
