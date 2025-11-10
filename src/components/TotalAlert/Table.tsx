import React from "react";
import SearchInput from "../SearchInput";
import { useTranslation } from "react-i18next";
import { useSearchParams, useParams } from "react-router-dom";
import { type AlertRow } from "./totalAlert.constant";
import type { Noti } from "../../data/Dashboard/notis";
import { useNotisFeed } from "../../context/NotisContext";
import { matchesSite, toDateKey, resolveAlertEventKey } from "../../utils/notis";
import { useFilters } from "../../context/FiltersContext";

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
const useSiteLabel = () => {
  return (label?: string | null) => {
    if (!label) return "";
    return label.toString().trim();
  };
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
type EventKey =
  | "motion"
  | "fall"
  | "fire"
  | "offline"
  | "sleep"
  | "face"
  | "other";
type PrimaryEvent = Exclude<EventKey, "other">;
const isPrimaryEvent = (ev: EventKey): ev is PrimaryEvent =>
  ["motion", "fall", "fire", "offline", "sleep", "face"].includes(ev as any);

const parseForcedEvent = (s?: string | null): PrimaryEvent => {
  const v = String(s ?? "motion").toLowerCase();
  const normalized = v === "plate" ? "face" : v;
  return (
    (["motion", "fall", "fire", "offline", "sleep", "face"] as const).includes(
      normalized as any
    )
      ? (normalized as PrimaryEvent)
      : "motion"
  );
};

/* ---------- noti -> row ---------- */
const DEFAULT_SITE_LABEL = "-";
const DEFAULT_CAMERA_NAME = "Camera 1";
const DEFAULT_STATUS: AlertRow["status"] = "UNRESOLVED";

const toRow = (n: Noti, i: number, ev: PrimaryEvent): AlertRow => {
  const ts = new Date((n as any).date);
  const siteLabel =
    String(
      (n as any).siteName ??
        (n as any).site_name ??
        n.site ??
        n.siteCode ??
        n.siteId ??
        (n as any)?.site?.name ??
        (n as any)?.site?.code ??
        ""
    ).trim() || DEFAULT_SITE_LABEL;
  const deviceName =
    String(
      (n as any).deviceName ??
        (n as any).device_name ??
        (n as any).deviceLabel ??
        (n as any).device_label ??
        n.deviceModel ??
        n.deviceId ??
        ""
    ).trim() || DEFAULT_CAMERA_NAME;
  return {
    id: String((n as any).id ?? `${ev}-${i}-${+ts}`),
    cameraLabel: siteLabel,
    event: ev,
    picture: getPic(n),
    cameraName: deviceName,
    status: DEFAULT_STATUS,
    timestamp: isNaN(ts.getTime())
      ? new Date().toISOString()
      : ts.toISOString(),
  };
};

export default function Table() {
  const { t } = useTranslation("alert");
  const formatSiteLabel = useSiteLabel();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const { items: liveNotis } = useNotisFeed();
  const { date: globalDate, selectedSite } = useFilters();
  const selectedDateKey = React.useMemo(() => toDateKey(globalDate), [globalDate]);
  const routeSite = params.siteCode ? String(params.siteCode) : null;
  const contextSite =
    selectedSite && selectedSite !== "all" ? selectedSite : null;
  const effectiveSite = routeSite ?? contextSite;

  const allNotis = React.useMemo<Noti[]>(() => {
    let list: Noti[] = Array.isArray(liveNotis) ? liveNotis : [];
    if (effectiveSite) {
      list = list.filter((n) => matchesSite(n, effectiveSite));
    }
    if (selectedDateKey) {
      list = list.filter((n) => toDateKey(n.date) === selectedDateKey);
    }
    return list;
  }, [effectiveSite, selectedDateKey, liveNotis]);

  const forcedEvent = parseForcedEvent(searchParams.get("event"));

  const notisForTable = React.useMemo(
    () =>
      allNotis
        .map((noti) => {
          const ev = resolveAlertEventKey(noti);
          return {
            noti,
            event: ev && isPrimaryEvent(ev as EventKey) ? (ev as PrimaryEvent) : null,
          };
        })
        .filter((item) => item.event && item.event === forcedEvent)
        .map((item) => item as { noti: Noti; event: PrimaryEvent })
        .sort(
          (a, b) =>
            new Date((b.noti as any).date).getTime() -
            new Date((a.noti as any).date).getTime()
        ),
    [allNotis, forcedEvent]
  );

  const rowsAll = React.useMemo<AlertRow[]>(
    () => notisForTable.map((entry, i) => toRow(entry.noti, i, entry.event)),
    [notisForTable]
  );

  /* -------- filters -------- */
  const [q, setQ] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  /* -------- pagination & data -------- */
  const [page, setPage] = React.useState(1);
  const pageSize = 5;

  const rowsFiltered: AlertRow[] = React.useMemo(() => {
    return rowsAll
      .filter((r) => {
        if (!globalDate) return true;
        const d = new Date(r.timestamp);
        const sel = new Date(globalDate.y, globalDate.m - 1, globalDate.d);
        return sameYMD(d, sel);
      })
      .filter((r) =>
        q.trim()
          ? `${r.cameraLabel} ${r.event} ${r.cameraName}`
              .toLowerCase()
              .includes(q.toLowerCase())
          : true
      );
  }, [rowsAll, globalDate, q]);

  const pageCount = Math.max(1, Math.ceil(rowsFiltered.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = rowsFiltered.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  React.useEffect(() => {
    setPage(1);
  }, [globalDate, q, forcedEvent]);

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
        <div className="flex flex-wrap items-center gap-3" />
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
            <div>{t("table.headers.site", { defaultValue: "Site" })}</div>
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
                  {formatSiteLabel(r.cameraLabel)}
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
