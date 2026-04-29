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
  online: { dot: "bg-emerald-400", text: "text-emerald-600" },
  warning: { dot: "bg-amber-400", text: "text-amber-600" },
  offline: { dot: "bg-rose-400", text: "text-rose-600" },
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
    <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {t("view.active", { defaultValue: "Active View" })}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-lg font-semibold text-slate-900">
            {meter ? (
              <>
                <span>{meter.siteName}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-600">{viewName}</span>
                {(meter.isOverall || meter.scope === "tag") &&
                typeof meter.includedMeters === "number" ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
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

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(abs("/electric"))}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white cursor-pointer"
          >
            {t("view.goBilling", { defaultValue: "Billing overview" })}
          </button>

          <button
            type="button"
            onClick={onChange}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white cursor-pointer"
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
                "inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition",
                billDisabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "cursor-pointer border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
              ].join(" ")}
              aria-disabled={billDisabled}
            >
              {t("view.createBill", { defaultValue: "Generate bill" })}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            {t("view.status", { defaultValue: "Status" })}
          </p>
          <div className="mt-2 flex items-center gap-2 font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor.dot}`} />
            <span className={statusColor.text}>
              {meter
                ? t(`status.${meter.status}`, { defaultValue: meter.status })
                : t("view.waiting", { defaultValue: "Waiting" })}
            </span>
          </div>
        </div>

        <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            {t("view.lastSync", { defaultValue: "Last update" })}
          </p>
          <p className="mt-2 font-semibold text-slate-800">{meter ? meter.lastSync : "-"}</p>
        </div>

        <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            {t("view.location", { defaultValue: "Location" })}
          </p>
          <p className="mt-2 font-semibold text-slate-800">{meter?.location ?? "-"}</p>
        </div>

        <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            {t("view.todayKwh", { defaultValue: "Today (kWh)" })}
          </p>
          <p className="mt-2 font-semibold text-slate-800">
            {meter ? meter.todayKwh.toLocaleString() : "-"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-[0.2em] text-slate-400">
          {t("view.monthData", { defaultValue: "Monthly data" })}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
          {meter?.billingMonth ?? t("view.notSpecified", { defaultValue: "Not specified" })}
        </span>
      </div>
    </div>
  );
};

export default MeterDetail;
