import React from "react";
import Dropdown from "../Dropdown";
import DatePicker, { type DateValue } from "../DateInput";
import SearchInput from "../SearchInput";
import { useTranslation } from "react-i18next";
import { useSearchParams, useParams } from "react-router-dom";
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

/* ---------- utils ---------- */
const sameYMD = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const relHours = (iso: string, t: (k: string, o?: any) => string) => {
  const diffH = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 36e5)
  );
  return diffH === 0
    ? t("relative.justNow", { defaultValue: "just now" })
    : t("relative.hoursAgo", {
        count: diffH,
        defaultValue: "{{count}} hours ago",
      });
};
const extractCameraNumber = (s?: string | null) =>
  s?.match(/(\d+)/)?.[1] ? parseInt(s.match(/(\d+)/)![1], 10) : null;
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
  const v = String(opt.value ?? "")
    .toLowerCase()
    .trim();
  const l = String(opt.label ?? "")
    .toLowerCase()
    .trim();
  if (v === "all") return true;
  if (kind === "camera")
    return (
      (l.includes("all") && l.includes("camera")) || l.includes("กล้องทั้งหมด")
    );
  return (
    (l.includes("all") && l.includes("event")) || l.includes("เหตุการณ์ทั้งหมด")
  );
};
const getPic = (n: any) =>
  n?.screenshot ??
  n?.screenShot ??
  n?.screenshotUrl ??
  n?.thumbnail ??
  n?.img ??
  n?.image ??
  n?.picture ??
  "";

/* ---------- event mapping ---------- */
type EventKey = "motion" | "fall" | "fire" | "offline" | "sleep" | "other";
type PrimaryEvent = Exclude<EventKey, "other">;
const isPrimaryEvent = (ev: EventKey): ev is PrimaryEvent =>
  ["motion", "fall", "fire", "offline", "sleep"].includes(ev as any);

const bag = (n: any) =>
  [n?.event, n?.titleKey, n?.title]
    .filter(Boolean)
    .map((x: any) => String(x).toLowerCase().trim())
    .join(" | ");

const normalizeEventKey = (n: Noti): EventKey => {
  const s = bag(n);
  if (/\bfire\b/.test(s) || s.includes("fire detected")) return "fire";
  if (
    /\bmotion\b/.test(s) ||
    s.includes("motion detected") ||
    s.includes("��Ǩ�Ѻ�������͹���") ||
    s.includes("��Ǩ���������͹���")
  )
    return "motion";
  if (/\bfall\b/.test(s) || s.includes("ตรวจพบคนล้ม")) return "fall";
  if (
    /notis\.(camera|device)offline/.test(s) ||
    /(?:camera|device)\s*offline/.test(s) ||
    /\boffline\b/.test(s) ||
    /ออฟ.?ไลน์/.test(s)
  )
    return "offline";
  if (/\bsleep\b/.test(s) || s.includes("ตรวจพบคนหลับนานกว่าปกติ"))
    return "sleep";
  return "other";
};

const parseForcedEvent = (s?: string | null): PrimaryEvent => {
  const v = String(s ?? "motion").toLowerCase();
  return (["motion", "fall", "fire", "offline", "sleep"] as const).includes(
    v as any
  )
    ? (v as PrimaryEvent)
    : "motion";
};

/* ---------- noti -> row ---------- */
const DEFAULT_CAMERA_LABEL = "Camera 1";
const DEFAULT_CAMERA_NAME = "Camera 1";
const DEFAULT_STATUS: AlertRow["status"] = "UNRESOLVED";

const toRow = (n: Noti, i: number, ev: PrimaryEvent): AlertRow => {
  const ts = new Date((n as any).date);
  return {
    id: String((n as any).id ?? `${ev}-${i}-${+ts}`),
    cameraLabel: DEFAULT_CAMERA_LABEL,
    event: ev,
    picture: getPic(n),
    cameraName: (n as any).site ?? DEFAULT_CAMERA_NAME,
    status: DEFAULT_STATUS,
    timestamp: isNaN(ts.getTime())
      ? new Date().toISOString()
      : ts.toISOString(),
  };
};

export default function Table() {
  const { t } = useTranslation("alert");
  const tCamera = useCameraLabelT();
  const [searchParams] = useSearchParams();
  const params = useParams();

  const allNotis = React.useMemo<Noti[]>(() => {
    const a = Array.isArray(alertNotis) ? alertNotis : [];
    const b = Array.isArray(wellBeingNotis) ? wellBeingNotis : [];
    let list: Noti[] = [...a, ...b];
    const siteCode = params.siteCode ? String(params.siteCode) : null;
    if (siteCode) {
      const nameOrCode = (n: any): string[] => {
        const raw = [
          n?.siteId,
          n?.site_id,
          n?.siteCode,
          n?.site_code,
          n?.siteName,
          n?.site_name,
          n?.site,
          n?.site?.id,
          n?.site?.code,
          n?.site?.name,
        ]
          .filter(Boolean)
          .map((x: any) => String(x));
        return Array.from(new Set(raw));
      };
      list = list.filter((n) => nameOrCode(n).includes(siteCode));
    }
    return list;
  }, [params.siteCode]);

  const forcedEvent = parseForcedEvent(searchParams.get("event"));

  const notisForTable = React.useMemo(() => {
    const allowed: ReadonlyArray<PrimaryEvent> = [forcedEvent];
    return allNotis
      .filter((n) => {
        const ev = normalizeEventKey(n);
        return isPrimaryEvent(ev) && allowed.includes(ev);
      })
      .sort(
        (a, b) =>
          new Date((b as any).date).getTime() -
          new Date((a as any).date).getTime()
      );
  }, [forcedEvent, allNotis]);

  const rowsAll = React.useMemo<AlertRow[]>(
    () => notisForTable.map((n, i) => toRow(n, i, forcedEvent)),
    [notisForTable, forcedEvent]
  );

  // default date = ล่าสุดในชุดนั้น
  const defaultDate: DateValue | undefined = React.useMemo(() => {
    if (!rowsAll.length) return undefined;
    const d = new Date(rowsAll[0].timestamp);
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsAll]);

  /* -------- filters -------- */
  const [cameraFilter, setCameraFilter] = React.useState("all");
  const [eventFilter, setEventFilter] = React.useState("all");
  const [date, setDate] = React.useState<DateValue | undefined>(defaultDate);
  const [q, setQ] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // sync dropdown + reset date เมื่อเปลี่ยนหมวด
  React.useEffect(() => {
    const match = EVENT_OPTIONS.find(
      (o) => String(o.value ?? "").toLowerCase() === forcedEvent
    );
    if (match && typeof match.value === "string") setEventFilter(match.value);
    setDate(defaultDate);
  }, [forcedEvent, defaultDate]);

  /* -------- pagination & data -------- */
  const [page, setPage] = React.useState(1);
  const pageSize = 5;

  const rowsFiltered: AlertRow[] = React.useMemo(() => {
    return rowsAll
      .filter((r) => (eventFilter === "all" ? true : r.event === eventFilter))
      .filter((r) =>
        cameraFilter === "all" ? true : r.cameraLabel === cameraFilter
      )
      .filter((r) => {
        if (!date) return true;
        const d = new Date(r.timestamp);
        const sel = new Date(date.y, date.m - 1, date.d);
        return sameYMD(d, sel);
      })
      .filter((r) =>
        q.trim()
          ? `${r.cameraLabel} ${r.event} ${r.cameraName}`
              .toLowerCase()
              .includes(q.toLowerCase())
          : true
      );
  }, [rowsAll, cameraFilter, eventFilter, date, q]);

  const pageCount = Math.max(1, Math.ceil(rowsFiltered.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = rowsFiltered.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  React.useEffect(() => {
    setPage(1);
  }, [cameraFilter, eventFilter, date, q, forcedEvent]);

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

      {/* Filters */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Camera */}
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
                        "h-[40px] min-w-[130px] rounded-md border border-gray-300 bg-white px-3 text-[14px] text-gray-800 font-semibold flex items-center justify-between gap-2",
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

          {/* Event */}
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
              const { t } = useTranslation("alert");
              const selectedLabel = isAllOption(selected, "event")
                ? t("filters.eventAll", { defaultValue: "All Event" })
                : t(`events.${String(selected?.label ?? "").toLowerCase()}`, {
                    defaultValue: String(selected?.label ?? ""),
                  });
              return (
                <div className="relative">
                  <button
                    {...getButtonProps({
                      className:
                        "h-[40px] min-w-[130px] rounded-md border border-gray-300 bg-white px-3 font-semibold text-[14px] text-gray-800 flex items-center justify-between gap-2",
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
                          : t(
                              `events.${String(opt.label ?? "").toLowerCase()}`,
                              { defaultValue: String(opt.label ?? "") }
                            );
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
                <div
                  id={cameraCellId}
                  className="text-cyan font-inter underline cursor-pointer"
                >
                  {tCamera(r.cameraLabel)}
                </div>
                <div className="text-gray-700">
                  {t(`events.${r.event}`, { defaultValue: r.event })}
                </div>
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
                <div className="text-gray-700">{r.cameraName}</div>
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
