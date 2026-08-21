"use client";
import ItemImage from "./ItemImage";
import type { Category, ImageFocal } from "@/lib/types";

// Shared by CheckoutModal/RegisterModal: a hero photo above the form with a
// persistent circular close button. When `showImage` is false (see
// HERO_COLLAPSE_HEIGHT in useModalViewport) the photo is dropped — it's
// decoration, the form is the job — but the button keeps the same size and
// corner position either way, so the tap target never moves underneath a
// thumb that already knows where it is.
export default function ModalHeroHeader({
  thumbnail,
  title,
  category,
  seed,
  imageFocal,
  showImage,
  onClose,
}: {
  thumbnail: string | null;
  title: string;
  category: Category;
  seed: string;
  imageFocal?: ImageFocal | null;
  showImage: boolean;
  onClose: () => void;
}) {
  return (
    <div className={`relative flex-none ${showImage ? "" : "h-14"}`}>
      {showImage && (
        <ItemImage
          thumbnail={thumbnail}
          title={title}
          category={category}
          seed={seed}
          sizes="(min-width: 480px) 420px, 90vw"
          imageFocal={imageFocal}
        />
      )}
      <button
        onClick={onClose}
        aria-label="Close"
        className={`absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-2xl leading-none transition-colors ${
          showImage
            ? "bg-ink/60 backdrop-blur-sm text-bone hover:bg-ink"
            : "bg-ink/10 text-ink hover:bg-ink/20"
        }`}
      >
        ×
      </button>
    </div>
  );
}
