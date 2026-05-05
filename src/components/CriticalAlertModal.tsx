import React from "react";
import { useTranslation } from "react-i18next";
import type { Noti } from "../data/Dashboard/notis";

type Props = {
  open: boolean;
  alert: Noti | null;
  soundPending?: boolean;
  onClose: () => void;
};

function formatAlertTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function CriticalAlertModal({
  open,
  alert,
  soundPending = false,
  onClose,
}: Props) {
  const { t } = useTranslation(["alert", "dashboard"]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !alert) return null;

  const occurredAt = alert.occurredAt ?? alert.createdAt ?? alert.date;
  const siteLabel =
    alert.siteName ?? alert.site ?? alert.siteCode ?? alert.siteId ?? "-";

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-[#180307]/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="critical-alert-title"
      onClick={onClose}
    >
      <div
        className="pointer-events-auto w-full max-w-[520px] overflow-hidden rounded-[28px] border border-[#FFB0BE]/60 bg-[linear-gradient(180deg,#7F1025_0%,#C61F41_52%,#8D122A_100%)] text-white shadow-[0_36px_90px_rgba(127,16,37,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden px-6 pb-6 pt-7 sm:px-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-28 w-28 rounded-full bg-[#FF7A95]/20 blur-2xl" />

          <div className="relative flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/14 ring-1 ring-white/20">
              <span className="material-icons-outlined animate-pulse text-[30px] text-white">
                warning_amber
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[#FFD7DF]">
                {t("dashboard:navbar.notifications", {
                  defaultValue: "Critical alert",
                })}
              </div>
              <h2
                id="critical-alert-title"
                className="mt-2 text-[28px] font-bold leading-none text-white"
              >
                {t("alert:criticalModal.title", {
                  defaultValue: "Critical Alert",
                })}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#FFE8ED]">
                {alert.title}
              </p>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 rounded-[22px] border border-white/12 bg-black/10 p-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FFC8D2]">
                {t("alert:table.headers.site", { defaultValue: "Site" })}
              </div>
              <div className="mt-1 text-base font-semibold text-white">
                {siteLabel}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FFC8D2]">
                {t("alert:table.headers.timestamp", {
                  defaultValue: "Timestamp",
                })}
              </div>
              <div className="mt-1 text-base font-semibold text-white">
                {formatAlertTime(occurredAt)}
              </div>
            </div>
            {alert.deviceId ? (
              <div className="sm:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FFC8D2]">
                  {t("alert:criticalModal.device", {
                    defaultValue: "Device",
                  })}
                </div>
                <div className="mt-1 text-base font-semibold text-white">
                  {alert.deviceId}
                </div>
              </div>
            ) : null}
          </div>

          {soundPending ? (
            <div className="relative mt-4 rounded-2xl border border-[#FFD3DC]/30 bg-white/10 px-4 py-3 text-sm text-[#FFF1F4]">
              {t("alert:criticalModal.soundBlocked", {
                defaultValue:
                  "Tap or press any key once to enable the alert sound in this browser.",
              })}
            </div>
          ) : null}

          <div className="relative mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 min-w-[148px] items-center justify-center rounded-[16px] bg-white px-5 text-sm font-semibold text-[#9F1530] shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition hover:bg-[#FFF5F7] hover:cursor-pointer"
            >
              {t("alert:criticalModal.acknowledge", {
                defaultValue: "Acknowledge",
              })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
