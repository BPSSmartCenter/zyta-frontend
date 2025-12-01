import React from "react";

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
  const showActions = typeof onDownload === "function";
  const colSpan = showActions ? 5 : 4;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)] p-6">
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-[20px] font-semibold text-gray-900">
          Billing History
        </h3>
        <p className="text-sm text-gray-500">บิลย้อนหลังสำหรับมิเตอร์นี้</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">Month</th>
              <th className="px-4 py-2 text-left">Energy (kWh)</th>
              <th className="px-4 py-2 text-left">Cost (฿)</th>
              <th className="px-4 py-2 text-left">Status</th>
              {showActions && <th className="px-4 py-2 text-left">ไฟล์ PDF</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-6 text-center text-gray-500">
                  กำลังโหลดรายการบิล...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-6 text-center text-gray-500">
                  ยังไม่มีบิลสำหรับมิเตอร์นี้
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {row.monthYear}
                  </td>
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
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                        row.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {row.status === "paid" ? "ชำระแล้ว" : "ค้างชำระ"}
                    </span>
                  </td>
                  {showActions && (
                    <td className="px-4 py-3">
                      {row.documentUrl ? (
                        <button
                          onClick={() => onDownload?.(row.id)}
                          disabled={downloadingId === row.id}
                          className={[
                            "rounded-full border border-gray-200 px-4 py-1 text-xs font-semibold transition",
                            downloadingId === row.id
                              ? "cursor-not-allowed text-gray-400"
                              : "text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50",
                          ].join(" ")}
                        >
                          {downloadingId === row.id
                            ? "กำลังดาวน์โหลด..."
                            : "ดาวน์โหลด"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">ยังไม่มีไฟล์</span>
                      )}
                    </td>
                  )}
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
