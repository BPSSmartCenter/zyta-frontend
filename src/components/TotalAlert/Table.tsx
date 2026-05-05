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

  const activeEventLabel = t(`events.${forcedEvent}`, {
    defaultValue: forcedEvent,
  });

  return (
    <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_22px_48px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[34px] font-semibold tracking-[-0.03em] text-slate-950">
            {t("sitesAlertsTitle", { defaultValue: "Sites Alerts Table" })}
          </h2>
          <p className="mt-1 text-sm text-[#8AA0C5]">
            {t("table.summary", {
              count: rowsFiltered.length,
              event: activeEventLabel,
              defaultValue: `Showing ${rowsFiltered.length} ${activeEventLabel} events`,
            })}
          </p>
        </div>

        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("searchPlaceholder", {
            defaultValue: "Search events...",
          })}
          className="w-full lg:w-[280px]"
          inputClassName="!h-11 !rounded-[16px] !border-[#E5ECF5] !bg-[#F8FBFE] !pl-10 !text-sm !text-slate-700 placeholder:!text-[#94A3B8] focus:!ring-[#39B8EE]/15"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-[22px] border border-[#E7EEF8] bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[56px_72px_1.6fr_1fr_140px_1.1fr_160px_180px] items-center gap-4 bg-[#F8FBFE] px-5 py-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
              <div />
              <div>{t("table.headers.no", { defaultValue: "NO" })}</div>
              <div>{t("table.headers.site", { defaultValue: "Site" })}</div>
              <div>{t("table.headers.event", { defaultValue: "Event" })}</div>
              <div>{t("table.headers.picture", { defaultValue: "Picture" })}</div>
              <div>
                {t("table.headers.cameraName", { defaultValue: "Camera" })}
              </div>
              <div>{t("table.headers.status", { defaultValue: "Status" })}</div>
              <div>
                {t("table.headers.timestamp", { defaultValue: "Timestamp" })}
              </div>
            </div>

            {pageRows.map((r, idx) => {
              const isSel = selectedId === r.id;
              const checkboxId = `row-check-${r.id}`;
              const cameraCellId = `row-camera-${r.id}`;
              const rowNumber = (clampedPage - 1) * pageSize + idx + 1;

              return (
                <div
                  key={r.id}
                  className={[
                    "grid grid-cols-[56px_72px_1.6fr_1fr_140px_1.1fr_160px_180px] items-center gap-4 border-t border-[#EDF2F8] px-5 py-3 text-sm",
                    isSel ? "bg-[#F7FCFF]" : "bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-center">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={isSel}
                      onChange={(event) =>
                        setSelectedId(event.target.checked ? r.id : null)
                      }
                      className="size-4 rounded border-[#CBD5E1] text-[#39B8EE] focus:ring-[#39B8EE]/20"
                      aria-labelledby={cameraCellId}
                    />
                    <label htmlFor={checkboxId} className="sr-only">
                      {t("a11y.selectRow", {
                        camera: r.cameraLabel,
                        defaultValue: "Select {{camera}}",
                      })}
                    </label>
                  </div>

                  <div className="text-sm font-medium text-[#64748B]">
                    {String(rowNumber).padStart(2, "0")}
                  </div>

                  <div
                    id={cameraCellId}
                    className="font-medium text-[#FF285B]"
                  >
                    {formatSiteLabel(r.cameraLabel)}
                  </div>

                  <div className="text-slate-700">
                    {t(`events.${r.event}`, { defaultValue: r.event })}
                  </div>

                  <div className="h-14 w-14 overflow-hidden rounded-2xl bg-[#F1F5F9]">
                    {r.picture ? (
                      <img
                        src={r.picture}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-[#E2E8F0]" />
                    )}
                  </div>

                  <div className="text-slate-700">{r.cameraName}</div>

                  <div>
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        r.status === "UNRESOLVED"
                          ? "bg-[#FFF1F4] text-[#FF285B]"
                          : "bg-[#ECFDF3] text-[#027A48]",
                      ].join(" ")}
                    >
                      {t(`status.${r.status}`, { defaultValue: r.status })}
                    </span>
                  </div>

                  <div className="text-slate-700">
                    <div>{new Date(r.timestamp).toLocaleString()}</div>
                    <div className="mt-1 text-xs text-[#8AA0C5]">
                      {relHours(r.timestamp, t)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((pageNumber) => Math.max(1, pageNumber - 1))}
            className={[
              "inline-flex h-10 items-center rounded-[14px] border px-4 text-sm font-medium transition",
              page <= 1
                ? "cursor-not-allowed border-[#E5ECF5] text-[#B7C2D1]"
                : "border-[#E5ECF5] text-slate-700 hover:border-[#CDEFFF] hover:bg-[#F8FBFE]",
            ].join(" ")}
          >
            {t("pager.prev", { defaultValue: "Previous" })}
          </button>
          <button
            type="button"
            onClick={() =>
              setPage((pageNumber) => Math.min(pageCount, pageNumber + 1))
            }
            className={[
              "inline-flex h-10 items-center rounded-[14px] border px-4 text-sm font-medium transition",
              page >= pageCount
                ? "cursor-not-allowed border-[#E5ECF5] text-[#B7C2D1]"
                : "border-[#E5ECF5] text-slate-700 hover:border-[#CDEFFF] hover:bg-[#F8FBFE]",
            ].join(" ")}
          >
            {t("pager.next", { defaultValue: "Next" })}
          </button>
        </div>

        <div className="text-sm text-[#8AA0C5]">
          {t("pager.pageOf", {
            page: clampedPage,
            pageCount,
            defaultValue: "Page {{page}} of {{pageCount}}",
          })}
        </div>
      </div>
    </section>
  );
}
