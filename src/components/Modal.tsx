import React, { useEffect, useRef } from "react";

type IconType = "warning" | "mail" | "cancel";

export interface PrelineModalProps {
  open: boolean; // คุมเปิด/ปิดจาก React
  id?: string; // id ของ overlay (ต้อง unique)
  icon?: IconType; // ไอคอน: warning | mail | cancel
  title: string;
  message?: string | React.ReactNode;
  closeLabel?: string; // ป้ายปุ่มปิด
  onClose: () => void; // ให้ React sync state ปิด
}

const ICON_MAP: Record<IconType, { name: string; color: string }> = {
  warning: { name: "warning_amber", color: "text-[#EC0357]" },
  cancel: { name: "cancel", color: "text-[#EC0357]" },
  mail: { name: "mail", color: "text-blue-600" },
};

export default function Modal({
  open,
  id = "hs-scale-animation-modal",
  icon = "cancel",
  title,
  message,
  closeLabel = "ตกลง",
  onClose,
}: PrelineModalProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const hiddenTriggerRef = useRef<HTMLSpanElement | null>(null);

  // 1) ให้ Preline scan DOM (เผื่อ SPA mount ใหม่)
  useEffect(() => {
    (window as any).HSStaticMethods?.autoInit?.();
  }, []);

  // 2) เปิด/ปิดด้วย Preline API ถ้าพร้อม (HSOverlay)
  useEffect(() => {
    const overlayEl = overlayRef.current;
    const HSO = (window as any).HSOverlay;

    if (!overlayEl) return;

    if (open) {
      // ถ้า HSOverlay พร้อม → ใช้ API เปิด (แอนิเมชันสมบูรณ์)
      if (HSO?.open) {
        try {
          HSO.open(overlayEl);
          return;
        } catch {}
      }
      // Fallback: บังคับสถานะให้ variant ทำงาน (กรณี HSO ยังไม่พร้อม)
      overlayEl.classList.add("open");
      overlayEl.classList.remove("hidden", "pointer-events-none", "opacity-0");
    } else {
      if (HSO?.close) {
        try {
          HSO.close(overlayEl);
          return;
        } catch {}
      }
      // Fallback: เอา .open ออก และซ่อน
      overlayEl.classList.remove("open");
      overlayEl.classList.add("hidden", "pointer-events-none");
    }
  }, [open]);

  // 3) ปิดด้วย ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 4) กัน scroll พื้นหลังขณะเปิด
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 5) คลิกพื้นหลังเพื่อปิด
  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const iconCfg = ICON_MAP[icon];

  return (
    <>
      {/* trigger ซ่อน ไว้ให้ Preline initial instance ได้แน่นอน */}
      <span
        ref={hiddenTriggerRef}
        className="hidden"
        aria-hidden="true"
        data-hs-overlay={`#${id}`}
      />

      {/* ===== Overlay (คง UI/สไตล์เดิม – แค่เพิ่มคลาส Preline) ===== */}
      <div
        id={id}
        ref={overlayRef}
        className="
          hs-overlay hidden fixed inset-0 z-[80] size-full
          overflow-x-hidden overflow-y-auto pointer-events-none
          bg-black/50 opacity-0 transition-opacity 
          hs-overlay-open:opacity-100
          flex items-center justify-center
        "
        role="dialog"
        tabIndex={-1}
        aria-labelledby={`${id}-label`}
        aria-modal="true"
        onMouseDown={handleBackdropMouseDown}
      >
        {/* กล่องโมดัล: target แอนิเมชันแบบ Preline */}
        <div
          className="
            hs-overlay-animation-target
            hs-overlay-open:scale-100 hs-overlay-open:opacity-100
            scale-95 opacity-0 ease-in-out transition-all 
            w-[90%] max-w-[340px] sm:max-w-[360px] md:max-w-[400px] m-3 sm:mx-auto min-h-[calc(100%-56px)]
            flex items-center
          "
        >
          {/* เนื้อใน (UI เดิม) */}
          <div className="w-full flex flex-col bg-white border border-gray-200 shadow-2xs rounded-xl pointer-events-auto">
            {/* Content */}
            <div className="px-6 pb-6 mt-2">
              <div className="w-full flex justify-center">
                <i
                  className={`material-icons-outlined text-[32px] modalIcon ${iconCfg.color}`}
                  aria-hidden="true"
                >
                  {iconCfg.name}
                </i>
              </div>

              <div className="mt-4 text-center">
                <h3
                  id={`${id}-label`}
                  className="text-[18px] sm:text-[20px] font-bold text-gray-800"
                >
                  {title}
                </h3>
                {message ? (
                  <p className="mt-2 text-gray-700 text-sm leading-6">
                    {message}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  className="py-2.5 px-5 w-[200px] inline-flex items-center justify-center text-sm font-semibold rounded-lg
                             bg-[#5397EE] text-white hover:bg-blue-700 hover:cursor-pointer"
                  data-hs-overlay={`#${id}`} // ปิดด้วย Preline
                  onClick={onClose}
                >
                  {closeLabel}
                </button>
              </div>
            </div>
          </div>
          {/* /content */}
        </div>
      </div>
    </>
  );
}
