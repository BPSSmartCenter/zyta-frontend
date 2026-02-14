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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-[20px] font-semibold text-gray-900">
          {t("history.title", { defaultValue: "Billing History" })}
        </h3>
        <p className="text-sm text-gray-500">
          {t("history.subtitle", { defaultValue: "Past bills for this meter" })}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">
                {t("history.month", { defaultValue: "Month" })}
              </th>
              <th className="px-4 py-2 text-left">
                {t("history.energy", { defaultValue: "Energy (kWh)" })}
              </th>
              <th className="px-4 py-2 text-left">
                {t("history.cost", { defaultValue: "Cost (THB)" })}
              </th>
              {showActions ? (
                <th className="px-4 py-2 text-left">
                  {t("history.pdf", { defaultValue: "PDF" })}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-6 text-center text-gray-500">
                  {t("history.loading", { defaultValue: "Loading billing history..." })}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-6 text-center text-gray-500">
                  {t("history.empty", { defaultValue: "No bills for this meter yet" })}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{row.monthYear}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {row.energy.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">
                    ฿{" "}
                    {row.cost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  {showActions ? (
                    <td className="px-4 py-3">
                      {row.documentUrl ? (
                        <button
                          onClick={() => onDownload?.(row.id)}
                          disabled={downloadingId === row.id}
                          className={[
                            "rounded-full border border-gray-200 px-4 py-1 text-xs font-semibold transition",
                            downloadingId === row.id
                              ? "cursor-not-allowed text-gray-400"
                              : "cursor-pointer text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50",
                          ].join(" ")}
                        >
                          {downloadingId === row.id
                            ? t("history.downloading", { defaultValue: "Downloading..." })
                            : t("history.download", { defaultValue: "Download" })}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">
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
    </div>
  );
};

export default BillingHistoryTable;

