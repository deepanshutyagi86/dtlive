"use client";
import ItemImage from "./ItemImage";
import type { Category, ImageFocal } from "@/lib/types";

// Shared by CheckoutModal/RegisterModal: a hero photo above the form with a
// persistent circular close button. When `showImage` is false (see
// HERO_COLLAPSE_HEIGHT in useModalViewport) the photo is dropped — it's
// decoration, the form is the job — but the button keeps the same size and
// corner position either way, so the tap target never moves underneath a
// thumb that already knows where it is.
//
// The image is also dropped below `sm` regardless of `showImage`: on a
// phone-width bottom sheet, a full-width 3:2 photo ate the top third of an
// already height-constrained panel and pushed the actual form down below
// the fold. Desktop's centred dialog has the room to spare; the sheet
// doesn't.
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
    <div className={`relative flex-none h-14 ${showImage ? "sm:h-auto" : ""}`}>
      {showImage && (
        <div className="hidden sm:block">
          <ItemImage
            thumbnail={thumbnail}
            title={title}
            category={category}
            seed={seed}
            sizes="420px"
            imageFocal={imageFocal}
          />
        </div>
      )}
      <button
        onClick={onClose}
        aria-label="Close"
        className={`absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-2xl leading-none transition-colors bg-ink/10 text-ink hover:bg-ink/20 ${
          showImage ? "sm:bg-ink/60 sm:backdrop-blur-sm sm:text-bone sm:hover:bg-ink" : ""
        }`}
      >
        ×
      </button>
    </div>
  );
}
