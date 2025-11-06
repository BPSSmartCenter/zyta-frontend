// src/components/CCTV/cctvTable.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import SearchInput from "../../SearchInput";
import {
  CCTV_ROWS,
  type CCTVRow,
} from "../devices.constant";

const relHours = (fromISO: string, t: (k: string, o?: any) => string) => {
  const now = Date.now();
  const at = new Date(fromISO).getTime();
  const diffH = Math.max(0, Math.round((now - at) / 36e5));
  if (diffH === 0)
    return t("table.relative.justNow", { defaultValue: "just now" });
  return t("table.relative.hoursAgo", {
    count: diffH,
    defaultValue: "{{count}} hours ago",
  });
};

export default function CCTVTable() {
  const { t } = useTranslation("devices");

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState<string>("");

  const [page, setPage] = React.useState(1);
  const pageSize = 5;

  const rowsFiltered: CCTVRow[] = React.useMemo(() => {
    if (!query.trim()) return CCTV_ROWS;
    const lowered = query.toLowerCase();
    return CCTV_ROWS.filter((r) =>
      r.event.toLowerCase().includes(lowered)
    );
  }, [query]);

  React.useEffect(() => setPage(1), [query]);

  const pageCount = Math.max(1, Math.ceil(rowsFiltered.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = rowsFiltered.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  // คง layout table เดิม
  const GRID_COLS =
    "grid-cols-[48px_120px_200px_minmax(200px,1fr)_180px_140px_220px]";

  return (
    <div className="p-6">
      <div className="mb-3">
        <h2 className="text-[28px] font-semibold">
          {t("table.title", { defaultValue: "Consolidated Alert Log" })}
        </h2>
      </div>

      {/* Filters row */}
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t("table.searchPlaceholder", {
          defaultValue: "Search events",
        })}
        className="w-full md:w-[340px]"
      />

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg bg-white">
        <div className="inline-block w-full min-w-[950px] align-middle">
          {/* Header */}
          <div
            className={`grid w-full ${GRID_COLS} place-items-center px-4 py-3 text-[12px] font-medium text-gray-500 text-center bg-gray-100`}
          >
            <div>{t("table.columns.no", { defaultValue: "NO" })}</div>
            <div>{t("table.columns.site", { defaultValue: "SITE" })}</div>
            <div>{t("table.columns.event", { defaultValue: "EVENT" })}</div>
            <div>{t("table.columns.picture", { defaultValue: "PICTURE" })}</div>
            <div>
              {t("table.columns.cameraName", { defaultValue: "CAMERA NAME" })}
            </div>
            <div>{t("table.columns.status", { defaultValue: "STATUS" })}</div>
            <div>
              {t("table.columns.timestamp", { defaultValue: "TIMESTAMP" })}
            </div>
          </div>
          <hr className="border-gray-200" />

          {/* Rows */}
          {pageRows.map((r) => {
            const isSel = selectedId === r.id;
            const cbId = `cctv-check-${r.id}`;
            const siteLabelId = `cctv-site-${r.id}`;
            return (
              <div
                key={r.id}
                className={[
                  `grid w-full ${GRID_COLS} place-items-center px-4 py-3 text-[14px] text-center`,
                  "border-t border-gray-100",
                  isSel ? "bg-blue-50" : "bg-white",
                ].join(" ")}
              >
                {/* NO + checkbox */}
                <div className="flex items-center justify-center gap-2">
                  <input
                    id={cbId}
                    type="checkbox"
                    checked={isSel}
                    onChange={(e) =>
                      setSelectedId(e.target.checked ? r.id : null)
                    }
                    className="size-5 rounded-md focus:ring-0 checked:border-cyan checked:bg-cyan hover:cursor-pointer"
                    aria-labelledby={siteLabelId}
                  />
                  <label htmlFor={cbId} className="sr-only">
                    {t("table.a11y.selectRow", { defaultValue: "Select row" })}
                  </label>
                </div>

                {/* SITE (ไม่แปลชื่อไซต์) */}
                <div
                  id={siteLabelId}
                  className="text-cyan-600 font-medium underline underline-offset-2"
                >
                  {r.site}
                </div>

                {/* EVENT แปลจาก mapping */}
                <div className="text-gray-800">
                  {t(`table.events.${r.event}`, { defaultValue: r.event })}
                </div>

                {/* PICTURE */}
                <div className="h-[60px] w-[80px] overflow-hidden rounded-md">
                  <img
                    src={r.picture}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* CAMERA NAME (ไม่แปล: ชื่อรุ่น/ยี่ห้อ) */}
                <div className="text-gray-800">{r.camera}</div>

                {/* STATUS แปลจาก mapping */}
                <div
                  className={`font-semibold ${
                    r.status === "UNRESOLVED"
                      ? "text-red-500"
                      : "text-green-600"
                  }`}
                >
                  {t(`table.status.${r.status}`, { defaultValue: r.status })}
                </div>

                {/* TIMESTAMP + relative */}
                <div className="text-gray-700">
                  <div>{new Date(r.timeISO).toLocaleString()}</div>
                  <div className="text-[12px] text-gray-500">
                    {relHours(r.timeISO, t)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pager */}
      <div className="mt-3 flex items-center justify-between px-2 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={[
              "h-[34px] rounded-md border px-3 text-[14px]",
              clampedPage <= 1
                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                : "border-gray-300 cursor-pointer",
            ].join(" ")}
          >
            {t("table.pager.prev", { defaultValue: "Previous" })}
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className={[
              "h-[34px] rounded-md border px-3 text-[14px]",
              clampedPage >= pageCount
                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                : "border-gray-300 cursor-pointer",
            ].join(" ")}
          >
            {t("table.pager.next", { defaultValue: "Next" })}
          </button>
        </div>
        <div className="text-[14px] text-gray-600 select-none">
          {t("table.pager.pageOf", {
            page: clampedPage,
            pageCount,
            defaultValue: "Page {{page}} of {{pageCount}}",
          })}
        </div>
      </div>
    </div>
  );
}
