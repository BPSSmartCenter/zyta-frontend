// src/components/CCTV/cctvTable.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../../Dropdown";
import DatePicker, { type DateValue } from "../../DateInput";
import SearchInput from "../../SearchInput";
import {
  CCTV_ROWS,
  CCTV_SITE_OPTIONS,
  CCTV_EVENT_OPTIONS,
  type CCTVRow,
} from "../devices.constant";

/* helpers */
const sameYMD = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

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

// รองรับ value “all” และข้อความ “All Sites/ทุกไซต์”, “All Event/ทุกเหตุการณ์”
const isAllSite = (v: string) => ["all", "All Sites", "ทุกไซต์"].includes(v);
const isAllEvent = (v: string) =>
  ["all", "All Event", "ทุกเหตุการณ์"].includes(v);

export default function CCTVTable() {
  const { t } = useTranslation("devices");

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // ⬇️ ตั้งค่าเริ่มต้นเป็นข้อความ “All Sites” และ “All Event”
  const [site, setSite] = React.useState<string>("All Sites");
  const [event, setEvent] = React.useState<string>("All Event");
  const [date, setDate] = React.useState<DateValue | undefined>(undefined);
  const [query, setQuery] = React.useState<string>("");

  const [page, setPage] = React.useState(1);
  const pageSize = 5;

  // กรองด้วยค่า value (normalize “all” ให้เสมอ)
  const rowsFiltered: CCTVRow[] = React.useMemo(() => {
    return CCTV_ROWS.filter((r) => (isAllSite(site) ? true : r.site === site))
      .filter((r) => (isAllEvent(event) ? true : r.event === event))
      .filter((r) => {
        if (!date) return true;
        const d = new Date(r.timeISO);
        const sel = new Date(date.y, date.m - 1, date.d);
        return sameYMD(d, sel);
      })
      .filter((r) => {
        if (!query.trim()) return true;
        // ค้นหาตาม event (คง logic เดิม)
        return r.event.toLowerCase().includes(query.toLowerCase());
      });
  }, [site, event, date, query]);

  React.useEffect(() => setPage(1), [site, event, date, query]);

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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Sites */}
          <Dropdown options={CCTV_SITE_OPTIONS} value={site} onChange={setSite}>
            {({
              open,
              selected,
              getButtonProps,
              getMenuProps,
              getItemProps,
              options,
            }) => {
              // ปุ่ม: ถ้า “ทั้งหมด” → ใช้คำแปล; ถ้าเป็นชื่อไซต์จริง ๆ ไม่ต้องแปล
              const buttonLabel =
                selected?.value && isAllSite(selected.value)
                  ? t("table.filters.site", { defaultValue: "All Sites" })
                  : selected?.label ?? selected?.value ?? "Site";

              return (
                <div className="relative">
                  <button
                    {...getButtonProps({
                      className:
                        "h-[40px] min-w-[180px] rounded-md border border-gray-300 bg-white px-3 text-[14px] text-gray-800 font-semibold flex items-center justify-between gap-2 hover:cursor-pointer",
                    })}
                  >
                    <span className="truncate">{buttonLabel}</span>
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
                      {options.map((opt) => {
                        // เมนู: แปลเฉพาะ “All Sites”; รายชื่อไซต์ปล่อยตาม label เดิม
                        const label = isAllSite(opt.value)
                          ? t("table.filters.site", {
                              defaultValue: "All Sites",
                            })
                          : opt.label ?? opt.value;
                        return (
                          <button
                            key={opt.value}
                            {...getItemProps(opt, {
                              className:
                                "w-full text-left rounded-md px-3 py-2 text-[14px] hover:bg-gray-100 cursor-pointer",
                            })}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }}
          </Dropdown>

          {/* Events */}
          <Dropdown
            options={CCTV_EVENT_OPTIONS}
            value={event}
            onChange={setEvent}
          >
            {({
              open,
              selected,
              getButtonProps,
              getMenuProps,
              getItemProps,
              options,
            }) => {
              // ปุ่ม: “All Event” แปลจาก i18n; อื่น ๆ แปลผ่าน table.events.<value>
              const buttonLabel =
                selected?.value && isAllEvent(selected.value)
                  ? t("table.filters.event", { defaultValue: "All Event" })
                  : t(`table.events.${selected?.value}`, {
                      defaultValue:
                        selected?.label ?? selected?.value ?? "Event",
                    });

              return (
                <div className="relative">
                  <button
                    {...getButtonProps({
                      className:
                        "h-[40px] min-w-[180px] rounded-md border border-gray-300 bg-white px-3 text-[14px] text-gray-800 font-semibold flex items-center justify-between gap-2 hover:cursor-pointer",
                    })}
                  >
                    <span className="truncate">{buttonLabel}</span>
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
                      {options.map((opt) => {
                        // เมนู: ใช้ mapping i18n สำหรับ event ทุกตัว; “ทั้งหมด” ใช้ table.filters.event
                        const label = isAllEvent(opt.value)
                          ? t("table.filters.event", {
                              defaultValue: "All Event",
                            })
                          : t(`table.events.${opt.value}`, {
                              defaultValue: opt.label ?? opt.value,
                            });
                        return (
                          <button
                            key={opt.value}
                            {...getItemProps(opt, {
                              className:
                                "w-full text-left rounded-md px-3 py-2 text-[14px] hover:bg-gray-100 cursor-pointer",
                            })}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }}
          </Dropdown>

          {/* Date */}
          <DatePicker value={date} onChange={setDate} />
        </div>

        {/* Search (คงสไตล์เดิม) */}
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("table.searchPlaceholder", {
            defaultValue: "Search events",
          })}
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
