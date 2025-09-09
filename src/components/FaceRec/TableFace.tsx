import React from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../Dropdown";
import DatePicker, { type DateValue } from "../DateInput";
import SearchInput from "../SearchInput";
import { FACE_SCAN_ROWS, type FaceScanRow } from "./faceRec.constant";

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

export default function TableFaceScan() {
  const { t } = useTranslation("facerec");

  // selection
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Filters
  const [nameQ, setNameQ] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [date, setDate] = React.useState<DateValue | undefined>(undefined);

  // Pager
  const [page, setPage] = React.useState(1);
  const pageSize = 5;

  const STATUS_OPTIONS: Opt[] = [
    { label: t("filters.statusAll", { defaultValue: "All statuses" }), value: "all" },
    { label: "อนุญาต", value: "อนุญาต" },
    { label: "ไม่อนุญาต", value: "ไม่อนุญาต" },
    { label: "เข้าแล้ว", value: "เข้าแล้ว" },
    { label: "ออกแล้ว", value: "ออกแล้ว" },
  ];

  const rowsFiltered: FaceScanRow[] = React.useMemo(() => {
    return FACE_SCAN_ROWS
      .filter((r) => (status === "all" ? true : r.inout === status))
      .filter((r) => {
        if (!date) return true;
        const d = new Date(r.timeInISO);
        const sel = new Date(date.y, date.m - 1, date.d);
        return sameYMD(d, sel);
      })
      .filter((r) => {
        if (!nameQ.trim()) return true;
        return r.fullName.toLowerCase().includes(nameQ.toLowerCase());
      });
  }, [status, date, nameQ]);

  React.useEffect(() => setPage(1), [status, date, nameQ]);

  const pageCount = Math.max(1, Math.ceil(rowsFiltered.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = rowsFiltered.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  // Province column: 180px → 140px
  const GRID_COLS =
    "grid-cols-[48px_100px_150px_180px_140px_minmax(260px,1.6fr)_150px_200px]";

  return (
    <div className="p-6">
      {/* Filters row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* NAME */}
          <input
            type="text"
            placeholder={t("filters.name", { defaultValue: "Name" })}
            aria-label={t("filters.name", { defaultValue: "Name" })}
            title={t("filters.name", { defaultValue: "Name" })}
            className="h-[40px] rounded-md border border-gray-300 px-3 text-[14px]"
            value={nameQ}
            onChange={(e) => setNameQ(e.target.value)}
          />

          {/* Status (Dropdown) */}
          <Dropdown options={STATUS_OPTIONS} value={status} onChange={setStatus}>
            {({ open, selected, getButtonProps, getMenuProps, getItemProps, options }) => (
              <div className="relative">
                <button
                  {...getButtonProps({
                    className:
                      "h-[40px] min-w-[130px] rounded-md border border-gray-300 bg-white px-3 text-[14px] text-gray-800 font-semibold flex items-center justify-between gap-2 hover:cursor-pointer",
                  })}
                >
                  <span className="truncate">
                    {selected?.label ?? t("filters.status", { defaultValue: "Status" })}
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

        {/* Search ทางขวา */}
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
          {/* Header */}
          <div
            className={`grid w-full ${GRID_COLS} place-items-center px-4 py-3 text-[12px] font-medium text-gray-500 text-center bg-gray-100`}
          >
            <div>{t("table.no", { defaultValue: "NO" })}</div>
            <div>{t("table.picture", { defaultValue: "PICTURE" })}</div>
            <div>{t("table.fullName", { defaultValue: "FULL NAME" })}</div>
            <div>{t("table.gender", { defaultValue: "GENDER" })}</div>
            <div>{t("table.province", { defaultValue: "PROVINCE" })}</div>
            <div>{t("table.inout", { defaultValue: "IN/OUT STATUS" })}</div>
            <div>{t("table.timeIn", { defaultValue: "TIME IN" })}</div>
            <div>{t("table.timeOut", { defaultValue: "TIME OUT" })}</div>
          </div>
          <hr className="border-gray-200" />

          {/* Rows */}
          {pageRows.map((r) => {
            const isSel = selectedId === r.id;
            const cbId = `fs-check-${r.id}`;
            const nameCellId = `fs-name-${r.id}`;
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
                    onChange={(e) => setSelectedId(e.target.checked ? r.id : null)}
                    className="size-5 rounded-md focus:ring-0 checked:border-cyan checked:bg-cyan hover:cursor-pointer"
                    aria-labelledby={nameCellId}
                  />
                  <label htmlFor={cbId} className="sr-only">
                    {t("a11y.selectRow", { defaultValue: "Select row" })}
                  </label>
                </div>

                {/* PICTURE */}
                <div className="h-[60px] w-[80px] overflow-hidden rounded-md">
                  <img src={r.picture} alt="" className="h-full w-full object-cover" />
                </div>

                {/* FULL NAME */}
                <div id={nameCellId} className="text-gray-800">
                  {r.fullName}
                </div>

                {/* GENDER */}
                <div className="text-gray-800">{r.gender}</div>

                {/* PROVINCE */}
                <div className="text-gray-800">{r.province}</div>

                {/* IN/OUT STATUS */}
                <div className="text-gray-800">{r.inout}</div>

                {/* TIME IN */}
                <div className="text-gray-700">
                  <div>{new Date(r.timeInISO).toLocaleString()}</div>
                  <div className="text-[12px] text-gray-500">{relHours(r.timeInISO, t)}</div>
                </div>

                {/* TIME OUT */}
                <div className="text-gray-700">
                  <div>{new Date(r.timeOutISO).toLocaleString()}</div>
                  <div className="text-[12px] text-gray-500">{relHours(r.timeOutISO, t)}</div>
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
