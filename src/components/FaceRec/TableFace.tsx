import React from "react";
import { useTranslation } from "react-i18next";
import { useFilters } from "../../context/FiltersContext";
import SearchInput from "../SearchInput";
import { FACE_SCAN_ROWS, type FaceScanRow } from "./faceRec.constant";
import { useFaceRec } from "../../context/FaceRecContext";
import { toDateKey, matchesSiteInfo } from "../../utils/notis";

const relHours = (fromISO: string, t: (k: string, o?: any) => string) => {
  const now = Date.now();
  const at = new Date(fromISO).getTime();
  const diffH = Math.max(0, Math.round((now - at) / 36e5));
  if (diffH === 0) return t("relative.justNow", { defaultValue: "just now" });
  return t("relative.hoursAgo", { count: diffH, defaultValue: "{{count}} hours ago" });
};

export default function TableFaceScan() {
  const faceRec = useFaceRec();
  const { t } = useTranslation("facerec");
  const { date: globalDate, dateTouched, selectedSite } = useFilters();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [nameQ, setNameQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 5;

  const allRows: FaceScanRow[] =
    faceRec?.faceRows && faceRec.faceRows.length > 0
      ? (faceRec.faceRows as any)
      : (FACE_SCAN_ROWS as any);
  const rowsBySite = React.useMemo(
    () => allRows.filter((r) => matchesSiteInfo(r ?? {}, selectedSite)),
    [allRows, selectedSite]
  );

  const selectedDateKey = React.useMemo(
    () => (dateTouched ? toDateKey(globalDate) : null),
    [dateTouched, globalDate]
  );

  const rowsFiltered: FaceScanRow[] = React.useMemo(() => {
    return rowsBySite
      .filter((r) => {
        if (!selectedDateKey) return true;
        return toDateKey(r.timeInISO) === selectedDateKey;
      })
      .filter((r) => {
        if (!nameQ.trim()) return true;
        return r.fullName.toLowerCase().includes(nameQ.toLowerCase());
      });
  }, [rowsBySite, selectedDateKey, nameQ]);

  React.useEffect(() => setPage(1), [nameQ, selectedDateKey]);

  const pageCount = Math.max(1, Math.ceil(rowsFiltered.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = rowsFiltered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const GRID_COLS =
    "grid-cols-[48px_100px_150px_180px_140px_minmax(260px,1.6fr)_200px]";

  return (
    <div className="p-6">
      {/* Filters row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder={t("filters.name", { defaultValue: "Name" })}
            aria-label={t("filters.name", { defaultValue: "Name" })}
            title={t("filters.name", { defaultValue: "Name" })}
            className="h-[40px] rounded-md border border-gray-300 px-3 text-[14px]"
            value={nameQ}
            onChange={(e) => setNameQ(e.target.value)}
          />
        </div>

        <SearchInput
          value={nameQ}
          onChange={setNameQ}
          placeholder={t("searchPlaceholder", { defaultValue: "Search" })}
          className="w-full md:w-[340px]"
        />
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg bg-white">
        <div className="inline-block w-full min-w-[950px] align-middle">
          <div
            className={`grid w-full ${GRID_COLS} place-items-center px-4 py-3 text-[12px] font-medium text-gray-500 text-center bg-gray-100`}
          >
            <div>{t("table.no", { defaultValue: "NO" })}</div>
            <div>{t("table.picture", { defaultValue: "PICTURE" })}</div>
            <div>{t("table.fullName", { defaultValue: "FULL NAME" })}</div>
            <div>{t("table.gender", { defaultValue: "GENDER" })}</div>
            <div>{t("table.site", { defaultValue: "SITE" })}</div>
            <div>{t("table.inout", { defaultValue: "IN/OUT STATUS" })}</div>
            <div>{t("table.timestamp", { defaultValue: "Timestamp" })}</div>
          </div>
          <hr className="border-gray-200" />

          {pageRows.map((r, idx) => {
            const isSel = selectedId === r.id;
            const checkboxId = `fs-check-${r.id || idx}`;
            const nameCellId = `fs-name-${r.id || idx}`;
            return (
              <div
                key={r.id || idx}
                className={[
                  `grid w-full ${GRID_COLS} place-items-center px-4 py-3 text-[14px] text-center`,
                  "border-t border-gray-100",
                  isSel ? "bg-blue-50" : "bg-white",
                ].join(" ")}
              >
                <div className="flex items-center justify-center gap-2">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={isSel}
                    onChange={(e) => setSelectedId(e.target.checked ? (r.id || null) : null)}
                    className="size-5 rounded-md focus:ring-0 checked:border-cyan checked:bg-cyan hover:cursor-pointer"
                    aria-labelledby={nameCellId}
                  />
                  <label htmlFor={checkboxId} className="sr-only">
                    {t("a11y.selectRow", { defaultValue: "Select row" })}
                  </label>
                </div>

                <div className="h-[60px] w-[80px] overflow-hidden rounded-md">
                  <img src={r.picture} alt="" className="h-full w-full object-cover" />
                </div>

                <div id={nameCellId} className="text-gray-800">
                  {r.fullName}
                </div>

                <div className="text-gray-800">{r.gender}</div>

                <div className="text-gray-800">{r.province}</div>

                <div className="text-gray-800">{r.inout}</div>

                <div className="text-gray-700">
                  <div>{new Date(r.timeInISO).toLocaleString()}</div>
                  <div className="text-[12px] text-gray-500">
                    {relHours(r.timeInISO, t)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between px-2 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={[
              "h-[34px] rounded-md border px-3 text-[14px]",
              clampedPage <= 1 ? "text-gray-400 border-gray-200 cursor-not-allowed" : "border-gray-300 cursor-pointer",
            ].join(" ")}
          >
            {t("pager.prev", { defaultValue: "Previous" })}
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className={[
              "h-[34px] rounded-md border px-3 text-[14px]",
              clampedPage >= pageCount ? "text-gray-400 border-gray-200 cursor-not-allowed" : "border-gray-300 cursor-pointer",
            ].join(" ")}
          >
            {t("pager.next", { defaultValue: "Next" })}
          </button>
        </div>
        <div className="text-[14px] text-gray-600 select-none">
          {t("pager.pageOf", { page: clampedPage, pageCount, defaultValue: "Page {{page}} of {{pageCount}}" })}
        </div>
      </div>
    </div>
  );
}
