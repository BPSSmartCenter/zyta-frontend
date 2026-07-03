import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import EventPanelState from "./EventPanelState";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Noti } from "../../data/Dashboard/notis";
import { useUserPath } from "../../routes/useUserPath";
import { useFilters } from "../../context/FiltersContext";
import {
  resolveAlertEventKey,
  type AlertEventKey,
  isFaceRecNoti,
  resolveElectricDeviceSn,
} from "../../utils/notis";
import { resolveFaceRecPath } from "../../utils/faceRecRoutes";

type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: Noti[];
  loading?: boolean;
  fillAvailableHeight?: boolean;
};

export default function AlertEvents({
  search,
  setSearch,
  items,
  loading = false,
  fillAvailableHeight = false,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const navigate = useNavigate();
  const { setSelectedSite, setSelectedGroupSite } = useFilters();

  const { abs, absSite } = useUserPath();
  const parseAsUtcDate = (value: string): Date => {
    const raw = String(value || "").trim();
    if (!raw) return new Date(NaN);

    // If timestamp already includes timezone (Z or ±HH:mm), trust it.
    if (/(z|[+\-]\d{2}:\d{2})$/i.test(raw)) {
      return new Date(raw);
    }

    // DB often returns "YYYY-MM-DD HH:mm:ss.SSS" without timezone.
    // Treat it as UTC explicitly to avoid browser/local timezone drift.
    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    return new Date(`${normalized}Z`);
  };
  const toBangkokDate = (value: string): Date =>
    new Date(parseAsUtcDate(value).getTime() + 7 * 60 * 60 * 1000);
  const formatTimeForUI = (s: string) => {
    const d = toBangkokDate(s);
    if (isNaN(d.getTime())) return s;
    const hour = String(d.getUTCHours()).padStart(2, "0");
    const minute = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hour}:${minute}`;
  };
  const formatDateForUI = (s: string) => {
    const d = toBangkokDate(s);
    if (isNaN(d.getTime())) return s;
    const isTH = (i18n.language || "").startsWith("th");
    const locale = isTH ? "th-TH-u-nu-latn" : "en-GB";
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  };

  const navigateToEvent = (ev: AlertEventKey | null, noti?: any) => {
    if (!ev) return;

    if (ev === "electric_offline" || ev === "electric_low_power") {
      const sn = resolveElectricDeviceSn(noti ?? {});
      const params = new URLSearchParams();
      params.set("type", "electricmeter");
      if (sn) params.set("inverterSN", sn);

      const siteCode =
        typeof noti?.siteCode === "string" && noti.siteCode.trim().length
          ? noti.siteCode.trim()
          : null;
      if (siteCode && siteCode !== "all") {
        // Ensure navbar/site dropdown switches to the correct site.
        setSelectedGroupSite(null);
        setSelectedSite(siteCode);
        navigate(absSite(`/devices?${params.toString()}`, siteCode));
      } else {
        navigate(abs(`/devices?${params.toString()}`));
      }
      return;
    }

    navigate(abs(`/alert?event=${ev}`));
  };

  const list = items;

  return (
    <form
      className={[
        "flex flex-col gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        fillAvailableHeight ? "h-full min-h-0" : "justify-center",
      ].join(" ")}
    >

      <SearchInput
        value={search}
        placeholder={t("search.placeholder")}
        onChange={setSearch}
        className="shrink-0 font-poppins"
        disableMenu
      />

      <div
        className={[
          "overflow-y-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          fillAvailableHeight ? "min-h-0 flex-1" : "h-[350px] lg:h-[558px]",
        ].join(" ")}
      >
        {list.length === 0 ? (
          <EventPanelState
            loading={loading}
            emptyText={t("common.noResults")}
            loadingText={t("common.loadingEvents", {
              defaultValue: "Loading events...",
            })}
          />
        ) : (
          <div className="space-y-2">
            {list.map((n, i) => {
              const key = String(n.titleKey || "").toLowerCase();
              const isZyta = key.startsWith("zytanotis.");
              const eventKey = resolveAlertEventKey(n);
              const isElectric =
                eventKey === "electric_offline" ||
                eventKey === "electric_low_power";
              const meta: any = (n as any)?.meta ?? {};
              const deviceName =
                (typeof meta?.deviceName === "string" && meta.deviceName.trim()) ||
                (typeof meta?.device?.name === "string" && meta.device.name.trim()) ||
                undefined;

              const title = isZyta
                ? n.title
                : isElectric && eventKey === "electric_offline" && deviceName
                ? `${deviceName} Offline`
                : isElectric && eventKey === "electric_low_power" && deviceName
                ? `${deviceName} Low power`
                : eventKey === "motion"
                ? "Motion Detection"
                : n.titleKey
                ? t(n.titleKey, { defaultValue: n.title })
                : n.title;
              const site = t(`sites.${n.site}`, { defaultValue: n.site });
              const dateText = formatDateForUI(n.date);
              const timeText = formatTimeForUI(n.date);
              const locationLabel =
                (typeof meta?.locationLabel === "string" && meta.locationLabel.trim()) ||
                (typeof meta?.location === "string" && meta.location.trim()) ||
                site;
              const subLocationLabel =
                (typeof meta?.subLocationLabel === "string" && meta.subLocationLabel.trim()) ||
                (typeof meta?.sub_location_label === "string" && meta.sub_location_label.trim()) ||
                (typeof meta?.subLocation === "string" && meta.subLocation.trim()) ||
                "";
              const motionDetail =
                eventKey === "motion"
                  ? `${timeText}${locationLabel ? ` - ${locationLabel}` : ""}${subLocationLabel ? ` (${subLocationLabel})` : ""}`
                  : undefined;
              const isNavigable = Boolean(eventKey);

              const handleClick = (n: any, eventKey: AlertEventKey | null) => {
                if (isFaceRecNoti(n)) {
                  navigate(abs(resolveFaceRecPath(n)), { state: { noti: n } });
                  return;
                }
                if (eventKey) navigateToEvent(eventKey, n);
              };

              return (
                <div
                  key={i}
                  role={isNavigable ? "button" : "presentation"}
                  tabIndex={isNavigable ? 0 : -1}
                  onClick={() => handleClick(n, eventKey)}
                  onKeyDown={(e) => {
                    if (!isNavigable) return;
                    if (e.key === "Enter" || e.key === " ") {
                      handleClick(n, eventKey);
                    }
                  }}
                  className={`${
                    isNavigable ? "cursor-pointer" : "cursor-default"
                  } outline-none select-none`}
                >
              <NotiCard
                type={n.type as any}
                titleKey={n.titleKey as string | undefined}
                title={title}
                site={site}
                date={dateText}
                detail={motionDetail}
                img={n.img as any}
                meta={(n as any)?.meta ?? undefined}
                forceDefaultImage={eventKey !== "face" && eventKey !== "plate"}
              />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </form>
  );
}
