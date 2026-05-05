import React from "react";
import { useTranslation } from "react-i18next";
import SearchInput from "../SearchInput";
import { FACE_REC_ROWS, type LicensePlateRow } from "./faceRec.constant";
import { useFaceRec } from "../../context/FaceRecContext";
import { useFilters } from "../../context/FiltersContext";
import { matchesSiteInfo, toDateKey } from "../../utils/notis";
import {
  UtilitySectionTitle,
  UtilitySurface,
} from "../UtilityDashboard/UtilityDashboardLayout";

const relHours = (fromISO: string, t: (k: string, o?: any) => string) => {
  const now = Date.now();
  const at = new Date(fromISO).getTime();
  const diffH = Math.max(0, Math.round((now - at) / 36e5));
  if (diffH === 0) return t("relative.justNow", { defaultValue: "just now" });
  return t("relative.hoursAgo", {
    count: diffH,
    defaultValue: "{{count}} hours ago",
  });
};

export default function Table() {
  const faceRec = useFaceRec();
  const { t } = useTranslation("facerec");
  const { date: globalDate, dateTouched, selectedSite } = useFilters();

  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const pageSize = 6;

  const allRows: LicensePlateRow[] =
    faceRec?.plateRows && faceRec.plateRows.length > 0
      ? (faceRec.plateRows as any)
      : (FACE_REC_ROWS as any);
  const rowsBySite = React.useMemo(
    () => allRows.filter((row) => matchesSiteInfo(row ?? {}, selectedSite)),
    [allRows, selectedSite]
  );

  const selectedDateKey = React.useMemo(
    () => (dateTouched ? toDateKey(globalDate) : null),
    [dateTouched, globalDate]
  );

  const rowsFiltered: LicensePlateRow[] = React.useMemo(() => {
    return rowsBySite
      .filter((row) => {
        if (!selectedDateKey) return true;
        return toDateKey(row.timestamp) === selectedDateKey;
      })
      .filter((row) => {
        if (!query.trim()) return true;
        const haystack =
          `${row.plateText} ${row.province} ${row.cameraName} ${row.confidenceHeader.join(" ")}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      });
  }, [query, rowsBySite, selectedDateKey]);

  React.useEffect(() => {
    setPage(1);
  }, [query, selectedDateKey]);

  const pageCount = Math.max(1, Math.ceil(rowsFiltered.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = rowsFiltered.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );
  const gridCols =
    "grid-cols-[64px_110px_140px_minmax(180px,1fr)_160px_220px_180px_220px]";

  return (
    <UtilitySurface>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <UtilitySectionTitle
          title={t("plateTableTitle", { defaultValue: "Recent plate reads" })}
          subtitle={t("plateTableSubtitle", {
            count: rowsFiltered.length,
            defaultValue: "{{count}} matched rows",
          })}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("searchPlates", { defaultValue: "Search plate events..." })}
          className="w-full lg:w-[340px]"
          inputClassName="!h-11 !rounded-[16px] !border-slate-200 !bg-slate-50 !pl-10 !text-sm !text-slate-700"
        />
      </div>

      <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200 bg-white">
        <div className="min-w-[1360px]">
          <div
            className={`grid ${gridCols} gap-3 bg-[#F8FAFC] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400`}
          >
            <div>{t("table.no", { defaultValue: "NO" })}</div>
            <div>{t("table.picture", { defaultValue: "PICTURE" })}</div>
            <div>{t("table.platePicture", { defaultValue: "PLATE IMAGE" })}</div>
            <div>{t("table.plateText", { defaultValue: "PLATE TEXT" })}</div>
            <div>{t("table.site", { defaultValue: "SITE" })}</div>
            <div>{t("table.confidence", { defaultValue: "CONFIDENCE" })}</div>
            <div>{t("table.cameraName", { defaultValue: "CAMERA NAME" })}</div>
            <div>{t("table.timestamp", { defaultValue: "TIMESTAMP" })}</div>
          </div>

          {pageRows.length ? (
            pageRows.map((row, index) => {
              const isSelected = selectedId === row.id;
              const rowNo = (clampedPage - 1) * pageSize + index + 1;
              return (
                <button
                  key={row.id || rowNo}
                  type="button"
                  onClick={() => setSelectedId((current) => (current === row.id ? null : row.id))}
                  className={`grid w-full ${gridCols} gap-3 border-t border-slate-100 px-5 py-4 text-left text-[14px] transition ${
                    isSelected ? "bg-[#F4F1FF]" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="text-base font-semibold text-slate-500">
                    {String(rowNo).padStart(2, "0")}
                  </div>

                  <div className="h-[72px] w-[96px] overflow-hidden rounded-[18px] bg-slate-100">
                    <img src={row.picture} alt={row.plateText} className="h-full w-full object-cover" />
                  </div>

                  <div className="flex h-[72px] w-[124px] items-center justify-center overflow-hidden rounded-[18px] bg-slate-50 px-3">
                    <img
                      src={row.platePicture}
                      alt={row.plateText}
                      className="max-h-[54px] w-full object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[16px] font-semibold text-slate-900">
                      {row.plateText}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">{row.province}</div>
                  </div>

                  <div className="text-sm font-medium text-slate-700">{row.province}</div>

                  <div className="flex flex-wrap gap-1">
                    {row.confidenceHeader.map((char, charIndex) => (
                      <span
                        key={`${row.id}-${charIndex}`}
                        className="grid h-9 min-w-9 place-items-center rounded-[12px] bg-[#F3F0FF] px-2 text-xs font-semibold text-[#6C63FF]"
                      >
                        {char}
                      </span>
                    ))}
                  </div>

                  <div className="text-sm font-medium text-slate-700">{row.cameraName}</div>

                  <div className="text-sm text-slate-600">
                    <div>{new Date(row.timestamp).toLocaleString()}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {relHours(row.timestamp, t)}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-6 py-16 text-center text-sm text-slate-400">
              {t("empty.plateTable", { defaultValue: "No license plate rows for this filter" })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-400">
          {t("pager.pageOf", {
            page: clampedPage,
            pageCount,
            defaultValue: "Page {{page}} of {{pageCount}}",
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className={`rounded-[14px] border px-4 py-2 text-sm font-semibold ${
              clampedPage <= 1
                ? "cursor-not-allowed border-slate-200 text-slate-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t("pager.prev", { defaultValue: "Previous" })}
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            className={`rounded-[14px] border px-4 py-2 text-sm font-semibold ${
              clampedPage >= pageCount
                ? "cursor-not-allowed border-slate-200 text-slate-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t("pager.next", { defaultValue: "Next" })}
          </button>
        </div>
      </div>
    </UtilitySurface>
  );
}
