import React, { useEffect, useRef } from "react";

type IconType = "warning" | "mail" | "cancel" | "check";

export interface PrelineModalProps {
  open: boolean;
  id?: string;
  icon?: IconType;
  title: string;
  message?: string | React.ReactNode;
  closeLabel?: string; // ปุ่มเดี่ยว (เดิม)
  onClose: () => void;

  // ⬇️ NEW: โหมดยืนยัน 2 ปุ่ม
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
}

const ICON_MAP: Record<IconType, { name: string; color: string }> = {
  warning: { name: "warning_amber", color: "text-[#EC0357]" },
  cancel: { name: "cancel", color: "text-[#EC0357]" },
  mail: { name: "mail", color: "text-blue-600" },
  check: { name: "check_circle", color: "text-green-600" },
};

export default function Modal({
  open,
  id = "hs-scale-animation-modal",
  icon = "cancel",
  title,
  message,
  closeLabel = "ตกลง",
  onClose,
  confirmLabel,
  cancelLabel = "ยกเลิก",
  onConfirm,
}: PrelineModalProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (window as any).HSStaticMethods?.autoInit?.();
  }, []);

  useEffect(() => {
    const el = overlayRef.current;
    const HSO = (window as any).HSOverlay;
    if (!el) return;

    if (open) {
      if (HSO?.open) {
        try {
          HSO.open(el);
          return;
        } catch {}
      }
      el.classList.add("open");
      el.classList.remove("hidden", "pointer-events-none", "opacity-0");
    } else {
      if (HSO?.close) {
        try {
          HSO.close(el);
          return;
        } catch {}
      }
      el.classList.remove("open");
      el.classList.add("hidden", "pointer-events-none");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        try {
          const el = overlayRef.current;
          const HSO = (window as any).HSOverlay;
          if (el && HSO?.close) HSO.close(el);
        } catch {}
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      try {
        const el = overlayRef.current;
        const HSO = (window as any).HSOverlay;
        if (el && HSO?.close) HSO.close(el);
      } catch {}
      // Fallback: remove any stray backdrops if present
      try {
        document
          .querySelectorAll<HTMLElement>(
            ".hs-overlay-backdrop, .preline-backdrop"
          )
          .forEach((b) => b.remove());
      } catch {}
      onClose();
    }
  };

  const iconCfg = ICON_MAP[icon];

  return (
    <>
      {/* Removed Preline trigger: control via React state only */}
      <div
        id={id}
        ref={overlayRef}
        className="hs-overlay hidden fixed inset-0 z-[80] size-full overflow-x-hidden overflow-y-auto pointer-events-none bg-black/50 opacity-0 transition-opacity hs-overlay-open:opacity-100 flex items-center justify-center"
        role="dialog"
        tabIndex={-1}
        aria-labelledby={`${id}-label`}
        aria-modal="true"
        onClick={handleBackdropClick}
      >
        <div className="hs-overlay-animation-target hs-overlay-open:scale-100 hs-overlay-open:opacity-100 scale-95 opacity-0 ease-in-out transition-all w-[90%] max-w-[340px] sm:max-w-[360px] md:max-w-[400px] m-3 sm:mx-auto min-h-[calc(100%-56px)] flex items-center">
          <div className="w-full flex flex-col bg-white border border-gray-200 shadow-2xs rounded-xl pointer-events-auto">
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
                  <div className="mt-2 text-gray-700 text-sm leading-6">
                    {message}
                  </div>
                ) : null}
              </div>

              {/* Actions */}
              {confirmLabel ? (
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    type="button"
                    className="py-2.5 px-5 w-[140px] inline-flex items-center justify-center text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:cursor-pointer"
                    onClick={() => {
                      try {
                        const el = overlayRef.current;
                        const HSO = (window as any).HSOverlay;
                        if (el && HSO?.close) HSO.close(el);
                      } catch {}
                      try {
                        document
                          .querySelectorAll<HTMLElement>(
                            ".hs-overlay-backdrop, .preline-backdrop"
                          )
                          .forEach((b) => b.remove());
                      } catch {}
                      onClose();
                    }}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    className="py-2.5 px-5 w-[160px] inline-flex items-center justify-center text-sm font-semibold rounded-lg bg-[#5397EE] text-white hover:bg-blue-700 hover:cursor-pointer"
                    onClick={() => {
                      onConfirm?.();
                      try {
                        const el = overlayRef.current;
                        const HSO = (window as any).HSOverlay;
                        if (el && HSO?.close) HSO.close(el);
                      } catch {}
                      try {
                        document
                          .querySelectorAll<HTMLElement>(
                            ".hs-overlay-backdrop, .preline-backdrop"
                          )
                          .forEach((b) => b.remove());
                      } catch {}
                      onClose();
                    }}
                  >
                    {confirmLabel}
                  </button>
                </div>
              ) : (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    className="py-2.5 px-5 w-[200px] inline-flex items-center justify-center text-sm font-semibold rounded-lg bg-[#5397EE] text-white hover:bg-blue-700 hover:cursor-pointer"
                    onClick={() => {
                      try {
                        const el = overlayRef.current;
                        const HSO = (window as any).HSOverlay;
                        if (el && HSO?.close) HSO.close(el);
                      } catch {}
                      try {
                        document
                          .querySelectorAll<HTMLElement>(
                            ".hs-overlay-backdrop, .preline-backdrop"
                          )
                          .forEach((b) => b.remove());
                      } catch {}
                      onClose();
                    }}
                  >
                    {closeLabel}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
