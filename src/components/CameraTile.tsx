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
  /** Flag to show tinted background when we only have a placeholder image */
  isFallbackImg?: boolean;
};

const CameraTile: React.FC<CameraTileProps> = ({
  ringColor = "ring-slate-400",
  embedUrl,
  embedTitle,
  imgSrc,
  className = "",
  alt = "camera-tile",
  isFallbackImg = false,
}) => {
  const title = embedTitle || alt;
  const fallbackColor = React.useMemo(() => {
    const match = ringColor.match(/#([0-9a-fA-F]{6})/);
    if (match) {
      const hex = match[0];
      return `${hex}55`; // ~33% opacity over white
    }
    if (ringColor.includes("ring-red") || ringColor.includes("ring-[#FB3F3F]")) return "#FB3F3F33";
    if (ringColor.includes("ring-[#FE9927]") || ringColor.includes("ring-orange")) return "#FE992733";
    if (ringColor.includes("ring-[#AFEAFF]") || ringColor.includes("ring-blue")) return "#39B1FF33";
    return "#F5F6FA";
  }, [ringColor]);

  const frameBg = isFallbackImg ? "" : "bg-white";

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
      <div
        className={`absolute inset-1 rounded-xl overflow-hidden ${
          frameBg || ""
        }`}
        style={isFallbackImg ? { backgroundColor: fallbackColor } : undefined}
      >
        {embedUrl ? (
          <div className="h-full w-full overflow-hidden">
            <iframe
              src={embedUrl}
              title={title}
              className="h-full w-full border-0 object-cover"
              style={{ objectFit: "cover" }} // ให้ scale เหมือนรูป
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : imgSrc ? (
          isFallbackImg ? (
            <div className="flex h-full w-full items-center justify-center p-1">
              <img
                src={imgSrc}
                alt={alt}
                className="max-h-[98%] max-w-[98%] object-contain select-none"
                draggable={false}
                loading="lazy"
              />
            </div>
          ) : (
            <img
              src={imgSrc}
              alt={alt}
              className="h-full w-full object-cover select-none"
              draggable={false}
              loading="lazy"
            />
          )
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
