// src/components/CameraTile.tsx
import React from "react";

type CameraTileProps = {
  /** Ring color as a Tailwind class e.g. "ring-red-500" or "ring-[#FB3F3F] animate-[...]" */
  ringColor?: string;
  /** Optional URL to show via iframe inside the tile (takes priority over imgSrc) */
  embedUrl?: string;
  /** Title attribute for the iframe; defaults to the tile alt text */
  embedTitle?: string;
  /** Source of the preview image (kept for backward compatibility) */
  imgSrc?: string;
  /** Extra class names such as width/height overrides */
  className?: string;
  /** Alt text used by the image and as the iframe fallback title */
  alt?: string;
};

const CameraTile: React.FC<CameraTileProps> = ({
  ringColor = "ring-slate-400",
  embedUrl,
  embedTitle,
  imgSrc,
  className = "",
  alt = "camera-tile",
}) => {
  const title = embedTitle || alt;

  return (
    // Keep the original aspect ratio wrapper so existing layouts stay intact
    <div
      className={[
        "relative",
        "min-w-[150px] w-[300px] aspect-square",
        className,
      ].join(" ")}
    >
      {/* Inner frame with rounded corners and white background */}
      <div className="absolute inset-1 rounded-xl overflow-hidden bg-white">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : imgSrc ? (
          <img
            src={imgSrc}
            alt={alt}
            className="h-full w-full object-cover select-none"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0">
            <div className="h-full w-full bg-[repeating-linear-gradient(135deg,#e5e7eb_0px,#e5e7eb_14px,#cbd5e1_14px,#cbd5e1_28px)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="select-none text-sm font-semibold tracking-widest text-slate-400">
                NO&nbsp;SIGNAL
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Border ring overlay (pointer-events disabled so iframe remains interactive) */}
      <div
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0 rounded-2xl",
          "ring-7",
          ringColor,
        ].join(" ")}
      />
    </div>
  );
};

export default CameraTile;
