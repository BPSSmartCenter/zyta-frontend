import React from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../Dropdown";
import DatePicker, { type DateValue } from "../DateInput";
import SearchInput from "../SearchInput";
import { FACE_REC_ROWS, type FaceRecRow } from "./faceRec.constant";

/* helpers */
const sameYMD = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

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

type Opt = { label: string; value: string };

export default function Table() {
  const { t } = useTranslation("facerec");

  /* -------- Filters state -------- */
  const [date, setDate] = React.useState<DateValue | undefined>(undefined);
  const [q, setQ] = React.useState("");
  const [province, setProvince] = React.useState<string>("all");

  /* -------- Selection & Pager -------- */
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const pageSize = 5;
  const [page, setPage] = React.useState(1);

  /* -------- Province options (unique from data) -------- */
  const PROVINCE_OPTIONS: Opt[] = React.useMemo(() => {
    const uniq = Array.from(new Set(FACE_REC_ROWS.map((r) => r.province))).sort();
    return [
      { label: t("filters.provinceAll", { defaultValue: "All provinces" }), value: "all" },
      ...uniq.map((p) => ({ label: p, value: p })),
    ];
  }, [t]);

  /* -------- Filtered rows -------- */
  const rowsFiltered: FaceRecRow[] = React.useMemo(() => {
    return FACE_REC_ROWS.filter((r) => {
      if (!date) return true;
      const d = new Date(r.timestamp);
      const sel = new Date(date.y, date.m - 1, date.d);
      return sameYMD(d, sel);
    })
      .filter((r) => (province === "all" ? true : r.province === province))
      .filter((r) => {
        if (!q.trim()) return true;
        const s = `${r.plateText} ${r.province} ${r.cameraName}`.toLowerCase();
        return s.includes(q.toLowerCase());
      });
  }, [date, q, province]);

  React.useEffect(() => setPage(1), [date, q, province]);

  const pageCount = Math.max(1, Math.ceil(rowsFiltered.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = rowsFiltered.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  // ────────────────────────────────────────────────────────────────────────────────
  // NOTE: ย่อคอลัมน์ "จังหวัด" จาก 180px → 140px ทั้งหัวตารางและแถว
  const GRID_COLS =
    "grid-cols-[48px_100px_150px_180px_140px_minmax(260px,1.6fr)_150px_200px]";
  // ────────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Filters row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* License plates text */}
          <input
            type="text"
            placeholder={t("filters.plateText", { defaultValue: "License plates text" })}
            aria-label={t("filters.plateText", { defaultValue: "License plates text" })}
            title={t("filters.plateText", { defaultValue: "License plates text" })}
            className="h-[40px] rounded-md border border-gray-300 px-3 text-[14px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {/* Province (Dropdown) */}
          <Dropdown
            options={PROVINCE_OPTIONS}
            value={province}
            onChange={(val) => setProvince(val)}
          >
            {({ open, selected, getButtonProps, getMenuProps, getItemProps, options }) => (
              <div className="relative">
                <button
                  {...getButtonProps({
                    className:
                      "h-[40px] min-w-[180px] rounded-md border border-gray-300 bg-white px-3 text-[14px] text-gray-800 font-semibold flex items-center justify-between gap-2 hover:cursor-pointer",
                  })}
                >
                  <span className="truncate">
                    {selected?.label ?? t("filters.province", { defaultValue: "Province" })}
                  </span>
                  <i className="material-icons leading-none">
                    {open ? "arrow_drop_up" : "arrow_drop_down"}
                  </i>
                </button>

                {open && (
                  <div
                    {...getMenuProps({
                      className:
                        "absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg",
                    })}
                  >
                    {options.map((opt) => (
                      <button
                        key={opt.value}
                        {...getItemProps(opt, {
                          className:
                            "w-full text-left rounded-md px-3 py-2 text-[14px] hover:bg-gray-100 cursor-pointer",
                        })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Dropdown>

          {/* Date */}
          <DatePicker value={date} onChange={setDate} />
        </div>

        {/* Search (ช่องขวา) */}
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("searchPlaceholder", { defaultValue: "Search" })}
          className="w-full md:w-[340px]"
        />
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg bg-white">
        <div className="inline-block w-full min-w-[950px] align-middle">
          {/* Header */}
          <div
            className={`grid ${GRID_COLS} place-items-center px-4 py-3 text-[12px] font-medium text-gray-500 text-center bg-gray-100`}
          >
            <div>{t("table.no", { defaultValue: "NO" })}</div>
            <div>{t("table.picture", { defaultValue: "PICTURE" })}</div>
            <div>{t("table.platePicture", { defaultValue: "LICENSE PLATES PICTURE" })}</div>
            <div>{t("table.plateText", { defaultValue: "LICENSE PLATES TEXT" })}</div>
            <div>{t("table.province", { defaultValue: "PROVINCE" })}</div>
            <div>{t("table.confidence", { defaultValue: "CONFIDENCE" })}</div>
            <div>{t("table.cameraName", { defaultValue: "CAMERA NAME" })}</div>
            <div>{t("table.timestamp", { defaultValue: "TIMESTAMP" })}</div>
          </div>
          <hr className="border-gray-200" />

          {/* Rows */}
          {pageRows.map((r) => {
            const isSel = selectedId === r.id;
            const checkboxId = `row-check-${r.id}`;
            const plateCellId = `row-plate-${r.id}`;
            return (
              <div
                key={r.id}
                className={[
                  `grid ${GRID_COLS} place-items-center px-4 py-3 text-[14px] text-center`,
                  "border-t border-gray-100",
                  isSel ? "bg-blue-50" : "bg-white",
                ].join(" ")}
              >
                {/* NO + checkbox */}
                <div className="flex items-center justify-center gap-2">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={isSel}
                    onChange={(e) => setSelectedId(e.target.checked ? r.id : null)}
                    className="size-5 rounded-md focus:ring-0 checked:border-cyan checked:bg-cyan hover:cursor-pointer"
                    aria-labelledby={plateCellId}
                  />
                  <label htmlFor={checkboxId} className="sr-only">
                    {t("a11y.selectRow", { defaultValue: "Select row" })}
                  </label>
                </div>

                {/* PICTURE */}
                <div className="h-[60px] w-[80px] overflow-hidden rounded-md">
                  <img src={r.picture} alt="" className="h-full w-full object-cover" />
                </div>

                {/* LICENSE PLATES PICTURE */}
                <div className="h-[50px] w-[120px] overflow-hidden rounded-md">
                  <img src={r.platePicture} alt="" className="h-full w-full object-contain" />
                </div>

                {/* LICENSE PLATES TEXT */}
                <div id={plateCellId} className="text-gray-800">
                  {r.plateText}
                </div>

                {/* PROVINCE */}
                <div className="text-gray-800">{r.province}</div>

                {/* CONFIDENCE — ตารางติดกัน */}
                <div className="w-full flex items-center justify-center">
                  <table className="border border-gray-300 text-center text-[13px] border-collapse">
                    <thead>
                      <tr>
                        {r.confidenceHeader.map((ch, i) => (
                          <th key={i} className="border px-2 py-1 font-bold">
                            {ch}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {r.confidenceValues.map((val, i) => (
                          <td key={i} className="border border-black px-2 py-1 font-semibold text-green-600">
                            {val}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* CAMERA NAME */}
                <div className="text-gray-800">{r.cameraName}</div>

                {/* TIMESTAMP */}
                <div className="text-gray-700">
                  <div>{new Date(r.timestamp).toLocaleString()}</div>
                  <div className="text-[12px] text-gray-500">{relHours(r.timestamp, t)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pager (5 rows/page) — ย้ายออกมาอยู่ "ใต้" ตาราง */}
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
