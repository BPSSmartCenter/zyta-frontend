// src/hooks/toastProvider.tsx
import React from "react";

export type ToastVariant = "normal" | "success" | "error" | "warning";

export type ToastOptions = {
  message: React.ReactNode; // ให้ child จัดสไตล์เอง
  variant?: ToastVariant;
  duration?: number; // default 2600ms, 0 = no auto close
};

export type ToastRecord = {
  id: string;
  message: React.ReactNode;
  variant: ToastVariant;
  duration: number;
  leaving?: boolean; // ← ใช้สำหรับ fade-out
};

type ToastCtx = {
  show: (opt: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = React.useState<ToastRecord[]>([]);
  const ANIM_MS = 220; // ระยะเวลา fade-out

  // start fade-out แล้วค่อยลบจริง
  const beginDismiss = React.useCallback((id: string) => {
    setList((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => {
      setList((prev) => prev.filter((t) => t.id !== id));
    }, ANIM_MS);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    beginDismiss(id);
  }, [beginDismiss]);

  const show = React.useCallback(
    (opt: ToastOptions) => {
      const id: string = crypto.randomUUID();
      const item: ToastRecord = {
        id,
        message: opt.message,
        variant: opt.variant ?? "normal",
        duration: opt.duration ?? 2600,
      };
      setList((prev) => [...prev, item]);
      if (item.duration > 0) window.setTimeout(() => beginDismiss(id), item.duration);
      return id;
    },
    [beginDismiss]
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}

      {/* Top-center viewport */}
      <div className="fixed top-0 start-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 p-3">
        {list.map((t) => (
          <ToastCard
            key={t.id}
            item={t}
            onClose={() => beginDismiss(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* === UI === */
function ToastCard({
  item,
  onClose,
}: {
  item: ToastRecord;
  onClose: () => void;
}) {
  const { message, variant, leaving } = item;
  const isSuccess = variant === "success";

  const cardClass = [
    // เดิม
    "max-w-xs rounded-lg shadow-lg overflow-hidden items-center select-none",
    isSuccess ? "bg-[#1CB26C] border border-transparent" : "bg-white border border-gray-200",
    // ✅ fade-out animation
    "transition-all duration-200",
    leaving ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0",
  ].join(" ");

  const iconClass =
    isSuccess ? "text-white" : variant === "error" ? "text-red-500" : variant === "warning" ? "text-yellow-500" : "text-blue-500";

  return (
    <div role="alert" className={cardClass} tabIndex={-1}>
      <div className="flex p-2 sm:p-4">
        <div className="shrink-0">
          <svg
            className={`shrink-0 size-4 ${iconClass} mt-0.5`}
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            {variant === "success" && (
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"></path>
            )}
            {variant === "error" && (
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"></path>
            )}
            {variant === "warning" && (
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"></path>
            )}
            {variant === "normal" && (
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"></path>
            )}
          </svg>
        </div>

        {/* message: ให้ child ใส่สไตล์เอง */}
        <div className="ms-3">{message}</div>

        {/* ปุ่มปิด (ไม่ใส่ไอคอนตามที่ใช้ก่อนหน้า) */}
        <button
          onClick={onClose}
          className={`ms-3 -me-2 ${isSuccess ? "text-white/80 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}
          aria-label="Close"
        />
      </div>
    </div>
  );
}
