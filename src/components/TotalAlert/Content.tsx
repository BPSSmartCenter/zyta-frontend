import StatCard, { StatCardGroup } from "../StatCard";
import { exportImage } from "../../assets";
import { useTranslation } from "react-i18next";
import { useStatSelection, setSelectedStat } from "../../hook/useStatSelection";
import CameraTile from "../CameraTile";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import * as React from "react";
import type { Noti } from "../../data/Dashboard/notis";
import { useUserPath } from "../../routes/useUserPath";
import MiniFiltersBar from "../Shared/MiniFiltersBar";
import { useNotisFeed } from "../../context/NotisContext";
import { matchesSite, toDateKey } from "../../utils/notis";
import { useFilters } from "../../context/FiltersContext";

/* ---------- types ---------- */
type EventKey = "motion" | "fall" | "fire" | "offline" | "sleep" | "other";
type StatItem = {
  key: string;
  label: string;
  val: number | string;
  img: string;
  activeImg: string;
};
type CameraItem = { ringColor: string; imgSrc: string; alt?: string };
type Props = { statItems?: StatItem[]; cameraItems?: CameraItem[] };

/* ---------- helpers ---------- */
const getPic = (n: any) =>
  n?.screenshot ??
  n?.screenShot ??
  n?.screenshotUrl ??
  n?.thumbnail ??
  n?.img ??
  n?.image ??
  n?.picture ??
  undefined;

const ringClass = (n: Noti) => {
  const t = (n.type || "").toLowerCase();
  if (t === "alert")
    return "ring-[#FB3F3F] animate-[bps-ring-blink_1s_linear_infinite]";
  if (t === "warning")
    return "ring-[#FE9927] animate-[bps-ring-blink_1s_linear_infinite]";
  return "ring-[#AFEAFF]";
};

const bag = (n: any) =>
  [n?.event, n?.titleKey, n?.title]
    .filter(Boolean)
    .map((x: any) => String(x).toLowerCase().trim())
    .join(" | ");

const normalizeEventKey = (n: any): EventKey => {
  const s = bag(n);
  if (/\bfire\b/.test(s) || s.includes("fire detected")) return "fire";
  if (/\bmotion\b/.test(s) || s.includes("motion detected") || s.includes("ตรวจจับการเคลื่อนไหว") || s.includes("ตรวจพบการเคลื่อนไหว")) return "motion";
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

const normalizeStatKey = (k: string): EventKey => {
  const raw = (k || "").toLowerCase();
  const collapsed = raw.replace(/[\s/_()\-|]+/g, "");
  if (raw.includes("motion")) return "motion";
  if (raw.includes("fall")) return "fall";
  if (raw.includes("fire")) return "fire";
  if (
    raw.includes("offline") ||
    /ออฟ.?ไลน์/.test(raw) ||
    collapsed.includes("จำนวนกล้องออฟไลน์ออนไลน์") ||
    collapsed.includes("กล้องออฟไลน์")
  )
    return "offline";
  if (raw.includes("sleep") || raw.includes("หลับ")) return "sleep";
  return "other";
};

const parseEventFromUrl = (s?: string | null): EventKey => {
  const v = String(s ?? "motion").toLowerCase();
  return (["motion", "fall", "fire", "offline", "sleep"] as const).includes(
    v as any
  )
    ? (v as EventKey)
    : "motion";
};

export default function Content({ statItems }: Props) {
  const { t: tAlert } = useTranslation("alert");
  const { t } = useTranslation("dashboard");
  const { selected } = useStatSelection();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams();
  const { absSite } = useUserPath();
  const { items: liveNotis } = useNotisFeed();
  const { date: globalDate, selectedSite: selectedSiteFilter } = useFilters();
  const selectedDateKey = React.useMemo(() => toDateKey(globalDate), [globalDate]);
  const routeSite = params.siteCode ? String(params.siteCode) : null;
  const contextSite =
    selectedSiteFilter && selectedSiteFilter !== "all"
      ? selectedSiteFilter
      : null;
  const effectiveSite = routeSite ?? contextSite;
  // รวม notis จริง
  const allEvents = React.useMemo<Noti[]>(() => {
    let list: Noti[] = Array.isArray(liveNotis) ? liveNotis : [];
    if (effectiveSite) {
      list = list.filter((n) => matchesSite(n, effectiveSite));
    }
    if (selectedDateKey) {
      list = list.filter((n) => toDateKey(n.date) === selectedDateKey);
    }
    return list;
  }, [effectiveSite, selectedDateKey, liveNotis]);

  // นับยอดการ์ดจาก notis จริง (คีย์กลาง)
  const counts = React.useMemo<Record<EventKey, number>>(() => {
    const c: Record<EventKey, number> = {
      motion: 0,
      fall: 0,
      fire: 0,
      offline: 0,
      sleep: 0,
      other: 0,
    };
    for (const n of allEvents) c[normalizeEventKey(n)]++;
    return c;
  }, [allEvents]);

  // ใช้คีย์กลางเป็น id การ์ด
  const items = React.useMemo(
    () =>
      (statItems ?? []).map((it) => {
        const idNorm = normalizeStatKey(it.key || it.label);
        return { ...it, val: counts[idNorm] ?? 0, key: idNorm };
      }),
    [statItems, counts]
  );

  // event ปัจจุบันจาก URL + ให้ URL เป็น fallback สำหรับ activeIds
  const eventKey = parseEventFromUrl(searchParams.get("event"));
  const activeId = React.useMemo(
    () => selected ?? eventKey,
    [selected, eventKey]
  );

  // sync global selection กับ URL
  React.useEffect(() => {
    setSelectedStat(eventKey);
  }, [eventKey]);

  // notis ของหมวดที่เลือก (เรียงใหม่->เก่า)
  const listForEvent = React.useMemo(() => {
    return allEvents
      .filter((n) => normalizeEventKey(n) === eventKey)
      .sort(
        (a, b) =>
          new Date((b as any).date).getTime() -
          new Date((a as any).date).getTime()
      );
  }, [allEvents, eventKey]);

  // 3 รูปล่าสุด (ถ้ามี)
  const tiles = React.useMemo<CameraItem[]>(() => {
    return listForEvent
      .map((n) => {
        const pic = getPic(n);
        return pic ? { ringColor: ringClass(n), imgSrc: pic } : null;
      })
      .filter(Boolean)
      .slice(0, 3) as CameraItem[];
  }, [listForEvent]);

  // เปลี่ยนหมวด / ยกเลิกเลือก
  const onStatChange = (ids: string[]) => {
    const next = (ids[0] ?? "") as EventKey;
    if (!next) {
      setSelectedStat(null);
      navigate(absSite("/dashboard"));
      return;
    }
    setSelectedStat(next);
    navigate(absSite(`/alert?event=${next}`));
  };

  return (
    <>
      <style>{`@keyframes bps-ring-blink{0%,60%{opacity:1;}80%{opacity:.15;}100%{opacity:1;}}`}</style>

      {/* Top bar */}
      <nav className="flex justify-between mt-10">
        <h1 className="text-2xl font-semibold">{tAlert("totalAlertsToday")}</h1>
        <div className="gap-3 flex items-center">
          <MiniFiltersBar page="alert" />
          <button className="inline-flex h-10 w-10 md:w-[105px] items-center justify-center rounded-md border border-gray-300 px-3 text-sm font-inter font-bold">
            <span className="truncate flex items-center gap-2">
              <img src={exportImage} alt="" />
              <span className="hidden md:inline">{t("navbar.import")}</span>
            </span>
          </button>
          <button className="inline-flex h-10 w-10 md:w-[88px] items-center justify-center rounded-md px-3 bg-cyan text-white text-sm font-inter font-bold">
            <span className="flex w-full justify-center items-center gap-2">
              <i className="material-icons w-[24px]">add_2</i>
              <p className="hidden md:block">{t("navbar.add")}</p>
            </span>
          </button>
        </div>
      </nav>

      {/* Stat cards */}
      <div className="mt-6">
        <StatCardGroup
          selectionMode="single"
          activeIds={[activeId]} // <<< ใช้ URL เป็น fallback ป้องกันหลุด selection
          onChange={onStatChange}
          className="grid grid-cols-2 gap-2 px-6 lg-1024:flex lg-1024:flex-wrap"
        >
          {items.map((it) => (
            <StatCard
              key={it.key}
              id={it.key} // id เป็นคีย์กลาง (motion/fall/fire/offline/sleep)
              label={t(`stats.${it.key}`, { defaultValue: it.label })}
              val={it.val}
              img={it.img}
              activeImg={it.activeImg}
              inactiveBg="bg-white"
              activeBg="bg-cyan-500"
              className="w-full lg-1024:flex-1"
            />
          ))}
        </StatCardGroup>

        {/* Camera tiles */}
        {tiles.length > 0 && (
          <div className="flex flex-3 justify-around flex-col items-center mt-6 md:flex-row gap-14 px-6">
            {tiles.map((c, i) => (
              <CameraTile
                key={i}
                ringColor={c.ringColor}
                imgSrc={c.imgSrc}
                alt={`event-${i + 1}`}
                className="flex-1 max-w-[346px]"
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}


