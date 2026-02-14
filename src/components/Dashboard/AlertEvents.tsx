import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Noti } from "../../data/Dashboard/notis";
import React from "react";
import { useUserPath } from "../../routes/useUserPath";
import { useFilters } from "../../context/FiltersContext";
import {
  resolveAlertEventKey,
  type AlertEventKey,
  buildNotiKeywordBag,
  isFaceRecNoti,
  resolveElectricDeviceSn,
} from "../../utils/notis";

type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: Noti[];
};

export default function AlertEvents({ search, setSearch, items }: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const navigate = useNavigate();
  const { setSelectedSite, setSelectedGroupSite } = useFilters();

  const { abs, absSite } = useUserPath();
  const formatDateForUI = (s: string) => {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    const isTH = (i18n.language || "").startsWith("th");
    const locale = isTH ? "th-TH-u-nu-latn" : "en-GB";
    return d.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

  // เรียงใหม่→เก่า (คงพฤติกรรมเดิม)
  const list = React.useMemo(() => {
    const q = (search || "").toLowerCase().trim();

    // เรียงใหม่→เก่าเหมือนเดิม
    const sorted = [...items].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (!q) return sorted;

    // ใช้ bag() + site + date ให้ค้นหาทั้ง alert + wellbeing ได้
    return sorted.filter((n: any) => {
      const hay = [buildNotiKeywordBag(n), n?.site, n?.title, n?.type, n?.date]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [items, search, i18n.language]);

  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-3">
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        {t("alerts.allTimeTitle")}
      </h1>

      <SearchInput
        value={search}
        placeholder={t("search.placeholder")}
        onChange={setSearch}
        className="font-poppins"
        disableMenu
      />

      <div className="h-[350px] lg:h-[558px] overflow-y-auto px-2">
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="rounded-md px-3 py-2 text-sm text-gray-500">
              {t("common.noResults")}
            </div>
          ) : (
            list.map((n, i) => {
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
                : n.titleKey
                ? t(n.titleKey, { defaultValue: n.title })
                : n.title;
              const site = t(`sites.${n.site}`, { defaultValue: n.site });
              const dateText = formatDateForUI(n.date);
              const isNavigable = Boolean(eventKey);

              const handleClick = (n: any, eventKey: AlertEventKey | null) => {
                if (isFaceRecNoti(n)) {
                  // default เปิดแท็บตาม kind ได้ถ้าอยาก (faceScan/licensePlates)
                  navigate(abs("/facerec"), { state: { noti: n } });
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
                      navigateToEvent(eventKey, n);
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
                img={n.img as any}
                meta={(n as any)?.meta ?? undefined}
                forceDefaultImage={eventKey !== "face" && eventKey !== "plate"}
              />
                </div>
              );
            })
          )}
        </div>
      </div>
    </form>
  );
}
