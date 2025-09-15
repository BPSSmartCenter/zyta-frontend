import React from "react";
import Dropdown from "../Dropdown";
import DatePicker, { type DateValue } from "../DateInput";
import SearchInput from "../SearchInput";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import {
  CAMERA_OPTIONS,
  EVENT_OPTIONS,
  type AlertRow,
} from "./totalAlert.constant";

import type { Noti } from "../../data/Dashboard/notis";
import {
  notis as alertNotis,
  wellBeingNotis,
} from "../../data/Dashboard/notis";

/* ---------------- helpers ---------------- */
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

const extractCameraNumber = (s?: string | null) => {
  if (!s) return null;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};
const useCameraLabelT = () => {
  const { t } = useTranslation("alert");
  return (label?: string | null) => {
    const num = extractCameraNumber(label);
    return num != null
      ? t("camera.numbered", { number: num, defaultValue: `Camera ${num}` })
      : label ?? "";
  };
};

const isAllOption = (
  opt: { value?: string; label?: string } | undefined,
  kind: "camera" | "event"
) => {
  if (!opt) return false;
  const v = String(opt.value ?? "").toLowerCase().trim();
  const l = String(opt.label ?? "").toLowerCase().trim();
  if (v === "all") return true;
  if (kind === "camera")
    return (
      (l.includes("all") && l.includes("camera")) || l.includes("กล้องทั้งหมด")
    );
  return (
    (l.includes("all") && l.includes("event")) || l.includes("เหตุการณ์ทั้งหมด")
  );
};

// แปลง noti → event key ที่ตารางใช้
const eventKeyFromNoti = (n: Noti): string => {
  const raw = String(
    (n as any).event ?? (n as any).titleKey ?? (n as any).title ?? ""
  ).toLowerCase();

  if (raw.includes("motion")) return "motion";
  if (raw.includes("fall")) return "fall";
  if (raw.includes("fire")) return "fire";
  return "other";
};

const pictureFromNoti = (n: Noti): string =>
  ((n as any).screenshot ?? (n as any).img ?? "") as string;

const DEFAULT_CAMERA_LABEL = "Camera 1";
const DEFAULT_CAMERA_NAME = "Camera 1";
const DEFAULT_STATUS: AlertRow["status"] = "UNRESOLVED";

// map notis → แถวตาราง
const mapNotisToRows = (all: Noti[]): AlertRow[] => {
  return all
    .filter((n) => !!(n as any).date)
    .map((n, i) => {
      const ts = new Date((n as any).date);
      const id = String(
        (n as any).id ?? `${eventKeyFromNoti(n)}-${i}-${+ts}`
      );
      return {
        id,
        cameraLabel: DEFAULT_CAMERA_LABEL,
        event: eventKeyFromNoti(n),
        picture: pictureFromNoti(n),
        cameraName: (n as any).site ?? DEFAULT_CAMERA_NAME,
        status: DEFAULT_STATUS,
        timestamp: isNaN(ts.getTime())
          ? new Date().toISOString()
          : ts.toISOString(),
      } as AlertRow;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export default function Table() {
  const { t } = useTranslation("alert");
  const tCamera = useCameraLabelT();
  const [searchParams] = useSearchParams();

  // ✅ รวม notis จริงที่ระดับบนสุดของคอมโพเนนต์ (ไม่ใช้ hook ซ้อนใน hook)
  const allNotis = React.useMemo<Noti[]>(() => {
    const a = Array.isArray(alertNotis) ? alertNotis : [];
    const b = Array.isArray(wellBeingNotis) ? wellBeingNotis : [];
    return [...a, ...b];
  }, []);

  // แปลงเป็น rows
  const rowsAll = React.useMemo<AlertRow[]>(
    () => mapNotisToRows(allNotis),
    [allNotis]
  );

  // default วันที่ = แถวล่าสุด (ถ้ามี)
  const defaultDate: DateValue | undefined = React.useMemo(() => {
    if (!rowsAll.length) return undefined;
    const d = new Date(rowsAll[0].timestamp);
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }, [rowsAll]);

  /* -------- states: ฟิลเตอร์ -------- */
  const [cameraFilter, setCameraFilter] = React.useState("all");
  const [eventFilter, setEventFilter] = React.useState("all");
  const [date, setDate] = React.useState<DateValue | undefined>(defaultDate);
  const [q, setQ] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // อ่าน ?event=... เพื่อ “บังคับกรองชั้นแรก”
  const queryEventParam = (searchParams.get("event") ?? "").toLowerCase();

  // ถ้า EVENT_OPTIONS มีค่าตรงกับ query → sync dropdown
  React.useEffect(() => {
    if (!queryEventParam) return;
    const match = EVENT_OPTIONS.find(
      (o) => String(o.value ?? "").toLowerCase() === queryEventParam
    );
    if (match && typeof match.value === "string") {
      setEventFilter(match.value);
    }
  }, [queryEventParam]);

  // helper แปลชื่อ event (ประกาศไว้บนสุดของ component; ไม่เรียก hook ซ้ำ)
  const translateEvent = React.useCallback(
    (s?: string | null) =>
      t(`events.${(s ?? "").toLowerCase()}`, { defaultValue: s ?? "" }),
    [t]
  );

  /* -------- pagination -------- */
  const [page, setPage] = React.useState(1);
  const pageSize = 5;

  /* -------- filter + search -------- */
  const rowsFiltered: AlertRow[] = React.useMemo(() => {
    return rowsAll
      // ชั้น 1: กรองตาม query
      .filter((r) => (queryEventParam ? r.event === queryEventParam : true))
      // ชั้น 2: dropdown event
      .filter((r) => (eventFilter === "all" ? true : r.event === eventFilter))
      // ชั้น 3: camera
      .filter((r) =>
        cameraFilter === "all" ? true : r.cameraLabel === cameraFilter
      )
      // ชั้น 4: date
      .filter((r) => {
        if (!date) return true;
        const d = new Date(r.timestamp);
        const sel = new Date(date.y, date.m - 1, date.d);
        return sameYMD(d, sel);
      })
      // ชั้น 5: search
      .filter((r) => {
        if (!q.trim()) return true;
        const s = `${r.cameraLabel} ${r.event} ${r.cameraName}`.toLowerCase();
        return s.includes(q.toLowerCase());
      });
  }, [rowsAll, cameraFilter, eventFilter, date, q, queryEventParam]);

  const pageCount = Math.max(1, Math.ceil(rowsFiltered.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = rowsFiltered.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  React.useEffect(() => {
    setPage(1);
  }, [cameraFilter, eventFilter, date, q, queryEventParam]);

  return (
    <div className="p-6">
      {/* Title */}
      <div className="px-1">
        <div className="flex items-start gap-3">
          <h2 className="text-[27px] font-bold">
            {t("sitesAlertsTitle", { defaultValue: "Sites Alerts Table" })}
          </h2>
        </div>
      </div>

      {/* Filters row */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* All CAMERA */}
          <Dropdown
            options={CAMERA_OPTIONS}
            value={cameraFilter}
            onChange={setCameraFilter}
          >
            {({
              open,
              selected,
              getButtonProps,
              getMenuProps,
              getItemProps,
              options,
            }) => {
              const selectedLabel = isAllOption(selected, "camera")
                ? t("filters.cameraAll", { defaultValue: "All CAMERA" })
                : tCamera(selected?.label);

              return (
                <div className="relative">
                  <button
                    {...getButtonProps({
                      className:
                        "h-[40px] min-w-[130px] rounded-md border border-gray-300 bg-white px-3 text-[14px] text-gray-800 font-semibold flex items-center justify-between gap-2 hover:cursor-pointer",
                    })}
                  >
                    <span className="truncate">
                      {selectedLabel ||
                        t("filters.cameraAll", { defaultValue: "All CAMERA" })}
                    </span>
                    <i className="material-icons leading-none">
                      {open ? "arrow_drop_up" : "arrow_drop_down"}
                    </i>
                  </button>

                  {open && (
                    <div
                      {...getMenuProps({
                        className:
                          "absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg ",
                      })}
                    >
                      {options.map((opt) => {
                        const label = isAllOption(opt, "camera")
                          ? t("filters.cameraAll", {
                              defaultValue: "All CAMERA",
                            })
                          : tCamera(opt.label);
                        return (
                          <button
                            key={String(opt.value ?? opt.label)}
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

          {/* All Event */}
          <Dropdown
            options={EVENT_OPTIONS}
            value={eventFilter}
            onChange={setEventFilter}
          >
            {({
              open,
              selected,
              getButtonProps,
              getMenuProps,
              getItemProps,
              options,
            }) => {
              const selectedLabel = isAllOption(selected, "event")
                ? t("filters.eventAll", { defaultValue: "All Event" })
                : translateEvent(selected?.label);

              return (
                <div className="relative">
                  <button
                    {...getButtonProps({
                      className:
                        "h-[40px] min-w-[130px] rounded-md border border-gray-300 bg-white px-3 font-semibold text-[14px] text-gray-800 flex items-center justify-between gap-2 hover:cursor-pointer",
                    })}
                  >
                    <span className="truncate">
                      {selectedLabel ||
                        t("filters.eventAll", { defaultValue: "All Event" })}
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
                      {options.map((opt) => {
                        const label = isAllOption(opt, "event")
                          ? t("filters.eventAll", { defaultValue: "All Event" })
                          : translateEvent(opt.label);
                        return (
                          <button
                            key={String(opt.value ?? opt.label)}
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

        {/* Search */}
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("searchPlaceholder", {
            defaultValue: "Search events",
          })}
          className="w-full md:w-[340px]"
        />
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto md:overflow-hidden rounded-lg bg-white">
        <div className="inline-block w-full min-w=[750px] md:min-w-0 align-middle">
          {/* Header */}
          <div className="grid grid-cols-[48px_1.2fr_1fr_120px_1fr_1fr_1.4fr] place-items-center px-4 py-3 text-[12px] font-medium text-gray-500 text-center bg-gray-100">
            <div>{t("table.headers.no", { defaultValue: "NO" })}</div>
            <div>{t("table.headers.camera", { defaultValue: "Camera" })}</div>
            <div>{t("table.headers.event", { defaultValue: "Event" })}</div>
            <div>{t("table.headers.picture", { defaultValue: "Picture" })}</div>
            <div>
              {t("table.headers.cameraName", { defaultValue: "Camera Name" })}
            </div>
            <div>{t("table.headers.status", { defaultValue: "Status" })}</div>
            <div>
              {t("table.headers.timestamp", { defaultValue: "Timestamp" })}
            </div>
          </div>
          <hr className="border-gray-200" />

          {/* Rows */}
          {pageRows.map((r) => {
            const isSel = selectedId === r.id;
            const checkboxId = `row-check-${r.id}`;
            const cameraCellId = `row-camera-${r.id}`;
            return (
              <div
                key={r.id}
                className={[
                  "grid grid-cols-[48px_1.2fr_1fr_120px_1fr_1fr_1.4fr] place-items-center px-4 py-3 text-[14px] text-center",
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
                    onChange={(e) =>
                      setSelectedId(e.target.checked ? r.id : null)
                    }
                    className="size-5 rounded-md focus:ring-0 checked:border-cyan checked:bg-cyan hover:cursor-pointer"
                    aria-labelledby={cameraCellId}
                  />
                  <label htmlFor={checkboxId} className="sr-only">
                    {t("a11y.selectRow", {
                      camera: r.cameraLabel,
                      defaultValue: "Select {{camera}}",
                    })}
                  </label>
                </div>

                {/* CAMERA */}
                <div
                  id={cameraCellId}
                  className="text-cyan font-inter underline cursor-pointer"
                >
                  {tCamera(r.cameraLabel)}
                </div>

                {/* EVENT */}
                <div className="text-gray-700">
                  {t(`events.${r.event}`, { defaultValue: r.event })}
                </div>

                {/* PICTURE */}
                <div className="h-[80px] w-[100px] overflow-hidden rounded-md">
                  {r.picture ? (
                    <img
                      src={r.picture}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200" />
                  )}
                </div>

                {/* CAMERA NAME */}
                <div className="text-gray-700">{r.cameraName}</div>

                {/* STATUS */}
                <div
                  className={[
                    "font-semibold",
                    r.status === "UNRESOLVED"
                      ? "text-red-600"
                      : "text-green-600",
                  ].join(" ")}
                >
                  {t(`status.${r.status}`, { defaultValue: r.status })}
                </div>

                {/* TIMESTAMP */}
                <div className="text-gray-700">
                  <div>{new Date(r.timestamp).toLocaleString()}</div>
                  <div className="text-[12px] text-gray-500">
                    {relHours(r.timestamp, t)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pager */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={[
                "h-[34px] rounded-md border px-3 text-[14px]",
                page <= 1
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "border-gray-300 cursor-pointer",
              ].join(" ")}
            >
              {t("pager.prev", { defaultValue: "Previous" })}
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className={[
                "h-[34px] rounded-md border px-3 text-[14px]",
                page >= pageCount
                  ? "text-gray-400 border-gray-200 cursor-not-allowed"
                  : "border-gray-300 cursor-pointer",
              ].join(" ")}
            >
              {t("pager.next", { defaultValue: "Next" })}
            </button>
          </div>
          <div className="text-[14px] text-gray-600 select-none">
            {t("pager.pageOf", {
              page: clampedPage,
              pageCount,
              defaultValue: "Page {{page}} of {{pageCount}}",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
