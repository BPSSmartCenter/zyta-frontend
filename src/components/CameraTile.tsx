// src/components/CameraTile.tsx
import React from "react";

type CameraTileProps = {
  /** ring color เป็น class Tailwind เช่น "ring-red-500" */
  ringColor?: string;
  /** src ของรูปจริง (ยังไม่มีก็ปล่อยว่างไว้ได้) */
  imgSrc?: string;
  /** ใช้เพิ่มคลาสเสริม เช่น w-*, h-* */
  className?: string;
  /** alt ของรูป */
  alt?: string;
};

const CameraTile: React.FC<CameraTileProps> = ({
  ringColor = "ring-slate-400",
  imgSrc,
  className = "",
  alt = "camera-tile",
}) => {
  return (
    <div
      className={[
        "rounded-2xl ring-7 p-1 bg-white",
        "overflow-hidden",
        " min-w-[150px] w-[300px] aspect-square", 
        ringColor,
        className,
      ].join(" ")}
    >
      <div className="relative h-full w-full rounded-xl overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={alt}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          // ✅ Placeholder NO SIGNAL (ไม่ใช้รูปไฟล์)
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
    </div>
  );
};

export default CameraTile;
