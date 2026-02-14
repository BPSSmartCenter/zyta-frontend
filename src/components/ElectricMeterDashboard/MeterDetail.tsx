import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { MeterOption } from "../../types/meter";
import { useUserPath } from "../../routes/useUserPath";

type Props = {
  meter: MeterOption | null;
  onChange?: () => void;
};

const STATUS_COLOR: Record<MeterOption["status"], { dot: string; text: string }> = {
  online: { dot: "bg-emerald-400", text: "text-emerald-300" },
  warning: { dot: "bg-amber-400", text: "text-amber-300" },
  offline: { dot: "bg-rose-400", text: "text-rose-300" },
};

const MeterDetail: React.FC<Props> = ({ meter, onChange }) => {
  const { t } = useTranslation(["electricMeter"]);
  const navigate = useNavigate();
  const { abs } = useUserPath();

  const statusColor = meter
    ? STATUS_COLOR[meter.status]
    : { dot: "bg-slate-300", text: "text-slate-300" };

  const canCreateBill = Boolean(meter);
  const billDisabled = Boolean(!meter?.isOverall && meter?.billingStatus === "paid");

  const viewName = !meter
    ? t("view.noSelection", { defaultValue: "Please select a meter" })
    : meter.isOverall || meter.scope === "overview"
    ? t("view.overallLabel", { defaultValue: "All meters summary" })
    : meter.scope === "tag"
    ? t("view.buildingPrefix", {
        name: meter.name,
        defaultValue: `Building: ${meter.name}`,
      })
    : meter.name;

  return (
    <div className="mt-4 rounded-3xl border border-[#14334d] bg-[#05172c] p-6 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[20px] font-semibold uppercase tracking-[0.1em] text-white">
            {t("view.active", { defaultValue: "Active View" })}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-lg font-semibold text-[#0bb1f4]">
            {meter ? (
              <>
                <span>{meter.siteName}</span>
                <span className="text-[#51707f]">/</span>
                <span>{viewName}</span>
                {(meter.isOverall || meter.scope === "tag") &&
                typeof meter.includedMeters === "number" ? (
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-semibold text-white/80">
                    {t("view.overallCount", {
                      count: meter.includedMeters,
                      defaultValue: "{{count}} meters",
                    })}
                  </span>
                ) : null}
              </>
            ) : (
              <span>{viewName}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <button
            type="button"
            onClick={() => navigate(abs("/electric"))}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-400/60 px-4 py-2 text-sm font-medium text-white transition hover:border-white/70 hover:text-white/80 cursor-pointer"
          >
            {t("view.goBilling", { defaultValue: "Billing overview" })}
          </button>

          <button
            type="button"
            onClick={onChange}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-400/60 px-4 py-2 text-sm font-medium text-white transition hover:border-white/70 hover:text-white/80 cursor-pointer"
          >
            {t("view.openPicker", { defaultValue: "Select view" })}
          </button>

          {canCreateBill ? (
            <button
              type="button"
              onClick={() => {
                if (billDisabled || !meter?.id) return;
                const target = `${abs("/electric/generate-bill")}?meterId=${encodeURIComponent(
                  meter.id
                )}`;
                navigate(target, { state: { meterId: meter.id } });
              }}
              className={[
                "inline-flex items-center justify-center rounded-2xl border border-slate-400/60 px-4 py-2 text-sm font-medium text-white transition",
                billDisabled
                  ? "cursor-not-allowed border-white/20 text-white/40"
                  : "hover:border-white/70 hover:text-white/80 cursor-pointer",
              ].join(" ")}
              aria-disabled={billDisabled}
            >
              {t("view.createBill", { defaultValue: "Generate bill" })}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 text-sm text-white sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            {t("view.status", { defaultValue: "Status" })}
          </p>
          <div className="mt-1 flex items-center gap-2 font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor.dot}`} />
            <span className={statusColor.text}>
              {meter
                ? t(`status.${meter.status}`, { defaultValue: meter.status })
                : t("view.waiting", { defaultValue: "Waiting" })}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            {t("view.lastSync", { defaultValue: "Last update" })}
          </p>
          <p className="mt-1 font-semibold text-[#01faf8]">{meter ? meter.lastSync : "-"}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            {t("view.location", { defaultValue: "Location" })}
          </p>
          <p className="mt-1 font-semibold text-[#01faf8]">{meter?.location ?? "-"}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            {t("view.todayKwh", { defaultValue: "Today (kWh)" })}
          </p>
          <p className="mt-1 font-semibold text-[#01faf8]">
            {meter ? meter.todayKwh.toLocaleString() : "-"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-white/80">
        <span className="font-semibold uppercase tracking-[0.2em]">
          {t("view.monthData", { defaultValue: "Monthly data" })}
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {meter?.billingMonth ?? t("view.notSpecified", { defaultValue: "Not specified" })}
        </span>
      </div>
    </div>
  );
};

export default MeterDetail;

