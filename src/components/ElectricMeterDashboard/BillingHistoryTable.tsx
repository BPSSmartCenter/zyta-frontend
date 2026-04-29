import React from "react";
import { useTranslation } from "react-i18next";

export type BillingHistoryRow = {
  id: string;
  monthYear: string;
  energy: number;
  cost: number;
  status?: string;
  documentUrl?: string | null;
};

type Props = {
  rows: BillingHistoryRow[];
  loading?: boolean;
  onDownload?: (billId: string) => void;
  downloadingId?: string | null;
};

const BillingHistoryTable: React.FC<Props> = ({
  rows,
  loading = false,
  onDownload,
  downloadingId = null,
}) => {
  const { t } = useTranslation(["electricMeter"]);
  const showActions = typeof onDownload === "function";
  const colSpan = showActions ? 4 : 3;

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[18px] font-semibold text-slate-900">
            {t("history.title", { defaultValue: "Billing History" })}
          </h3>
          <p className="text-sm text-slate-400">
            {t("history.subtitle", { defaultValue: "Past bills for this meter" })}
          </p>
        </div>
        <div className="flex h-10 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-400">
          Search...
        </div>
      </div>

      <div className="overflow-x-auto rounded-[18px] border border-slate-100">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">
                {t("history.month", { defaultValue: "Month" })}
              </th>
              <th className="px-4 py-3 text-left">
                {t("history.energy", { defaultValue: "Energy (kWh)" })}
              </th>
              <th className="px-4 py-3 text-left">
                {t("history.cost", { defaultValue: "Cost (THB)" })}
              </th>
              {showActions ? (
                <th className="px-4 py-3 text-left">
                  {t("history.pdf", { defaultValue: "PDF" })}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400">
                  {t("history.loading", { defaultValue: "Loading billing history..." })}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400">
                  {t("history.empty", { defaultValue: "No bills for this meter yet" })}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-4 py-4 font-semibold text-slate-800">{row.monthYear}</td>
                  <td className="px-4 py-4 font-semibold text-slate-700">
                    {row.energy.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-4 font-semibold text-amber-600">
                    ฿{" "}
                    {row.cost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  {showActions ? (
                    <td className="px-4 py-4">
                      {row.documentUrl ? (
                        <button
                          onClick={() => onDownload?.(row.id)}
                          disabled={downloadingId === row.id}
                          className={[
                            "rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                            downloadingId === row.id
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              : "cursor-pointer border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
                          ].join(" ")}
                        >
                          {downloadingId === row.id
                            ? t("history.downloading", { defaultValue: "Downloading..." })
                            : t("history.download", { defaultValue: "Download" })}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {t("history.noFile", { defaultValue: "No file" })}
                        </span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-400"
          >
            Previous
          </button>
          <button
            type="button"
            disabled
            className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-400"
          >
            Next
          </button>
        </div>
        <span>
          {t("history.title", { defaultValue: "Billing History" })}
          : {rows.length.toLocaleString()} records
        </span>
      </div>
    </div>
  );
};

export default BillingHistoryTable;
