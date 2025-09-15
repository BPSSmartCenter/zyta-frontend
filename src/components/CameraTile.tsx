// src/components/CameraTile.tsx
import React from "react";

type CameraTileProps = {
  /** ring color เป็น class Tailwind เช่น "ring-red-500" หรือ "ring-[#FB3F3F] animate-[...]" */
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
    // ✅ ตัวห่อหลัก: เก็บสัดส่วน/ขนาด เหมือนเดิม เพื่อไม่กระทบ responsive
    <div
      className={[
        "relative",
        "min-w-[150px] w-[300px] aspect-square", // เดิม
        className,
      ].join(" ")}
    >
      {/* ✅ เฟรมเนื้อหา (พื้นขาว + มุมโค้ง) */}
      <div className="absolute inset-1 rounded-xl overflow-hidden bg-white">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={alt}
            className="h-full w-full object-cover select-none"
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

      {/* ✅ ขอบกระพริบเฉพาะ border: overlay แยกชั้น ไม่กิน pointer และไม่กระทบเนื้อหา */}
      <div
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0 rounded-2xl",
          "ring-7", // คงความหนาขอบแบบเดิม
          ringColor, // สี + animation จะถูกส่งมาจากภายนอก
        ].join(" ")}
      />

    </div>
  );
};

export default CameraTile;
