import React from "react";
import { useNavigate } from "react-router-dom";
import StatCard, { StatCardGroup } from "../../components/StatCard";
import CameraTile from "../../components/CameraTile";
import { useTranslation } from "react-i18next";
import { useStatSelection, setSelectedStat } from "../../hook/useStatSelection";
import type { Noti } from "../../data/Dashboard/notis";
import {
  notis as alertNotis,
  wellBeingNotis,
} from "../../data/Dashboard/notis";

/* ---------- types ---------- */
type EventKey = "motion" | "fall" | "fire" | "offline" | "sleep" | "other";

type StatItem = {
  key: string; // อาจเป็นข้อความไทย เช่น "จำนวนกล้องออฟไลน์ / ออนไลน์"
  label: string;
  val: number | string;
  img: string;
  activeImg: string;
};

type CameraItem = { ringColor: string; imgSrc: string };

type Props = {
  statItems: StatItem[];
  cameraItems?: CameraItem[];
  events?: Noti[];
};

const MAX_HEADER_IMAGES = 5;

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

// รวมข้อความจาก noti ไว้ใช้ตรวจประเภท
const bag = (n: any) =>
  [n?.event, n?.titleKey, n?.title]
    .filter(Boolean)
    .map((x: any) => String(x).toLowerCase().trim())
    .join(" | ");

// noti -> คีย์กลาง (รองรับ EN/TH + titleKey พิเศษ)
const normalizeEventKey = (n: any): EventKey => {
  const s = bag(n);
  if (/\bfire\b/.test(s) || s.includes("fire detected")) return "fire";
  if (/\bmotion\b/.test(s) || s.includes("motion detected")) return "motion";
  if (/\bfall\b/.test(s) || s.includes("ตรวจพบคนล้ม")) return "fall";
  // ✅ OFFLINE (ครบทุกสำนวน)
  if (
    /notis\.(camera|device)offline/.test(s) || // notis.cameraOffline / notis.deviceOffline
    /(?:camera|device)\s*offline/.test(s) || // "camera offline" / "device offline"
    /\boffline\b/.test(s) || // offline เฉย ๆ
    /ออฟ.?ไลน์/.test(s) // ไทย: ออฟไลน์
  )
    return "offline";
  if (/\bsleep\b/.test(s) || s.includes("ตรวจพบคนหลับนานกว่าปกติ"))
    return "sleep";
  return "other";
};

// คีย์บนการ์ด (ภาษาไทย/อังกฤษ) -> คีย์กลาง
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

export default function Header({ statItems, cameraItems, events }: Props) {
  const { t } = useTranslation(["dashboard", "common"]);
  const { selected } = useStatSelection();
  const navigate = useNavigate();

  // รวม notis จริง
  const source = React.useMemo<Noti[]>(() => {
    if (events?.length) return events;
    const a = Array.isArray(alertNotis) ? alertNotis : [];
    const b = Array.isArray(wellBeingNotis) ? wellBeingNotis : [];
    return [...a, ...b];
  }, [events]);

  // นับยอดตามคีย์กลาง
  const counts = React.useMemo<Record<EventKey, number>>(() => {
    const c: Record<EventKey, number> = {
      motion: 0,
      fall: 0,
      fire: 0,
      offline: 0,
      sleep: 0,
      other: 0,
    };
    for (const n of source) c[normalizeEventKey(n)]++;
    return c;
  }, [source]);

  // อัปเดตค่า val ของการ์ดด้วยยอดจริง
  const synced = React.useMemo(
    () =>
      (statItems ?? []).map((it) => {
        const key = normalizeStatKey(it.key || it.label);
        return { ...it, val: counts[key] ?? 0, __id: key };
      }),
    [statItems, counts]
  );

  // รูปแกลลอรี่ด้านบน
  const computedCamera = React.useMemo<CameraItem[]>(() => {
    const tiles = source
      .filter((n) => !!getPic(n))
      .sort(
        (a, b) =>
          new Date((b as any).date).getTime() -
          new Date((a as any).date).getTime()
      )
      .slice(0, MAX_HEADER_IMAGES)
      .map((n) => ({ imgSrc: getPic(n)!, ringColor: ringClass(n) }));
    return tiles.length
      ? tiles
      : (cameraItems ?? []).slice(0, MAX_HEADER_IMAGES);
  }, [source, cameraItems]);

  // กดการ์ด -> ไป /alert?event=<keyชัดเจน>
  const onChange = (ids: string[]) => {
    const id = (ids[0] ?? "") as EventKey;
    setSelectedStat(id || null);
    if (!id) return;
    navigate(`/alert?event=${id}`);
  };

  return (
    <div>
      <style>{`@keyframes bps-ring-blink{0%,60%{opacity:1;}80%{opacity:.15;}100%{opacity:1;}}`}</style>

      <StatCardGroup
        selectionMode="single"
        activeIds={selected ? [selected] : []}
        onChange={onChange}
        className="grid grid-cols-2 gap-2 px-6 lg-1024:flex lg-1024:flex-wrap"
      >
        {synced.map((it) => {
          const idNorm = (it as any).__id as string;
          return (
            <StatCard
              key={idNorm}
              id={idNorm}
              label={t(`stats.${idNorm}`, { defaultValue: it.label })}
              val={it.val}
              img={it.img}
              activeImg={it.activeImg}
              inactiveBg="bg-white"
              activeBg="bg-cyan-500"
              className="w-full lg-1024:flex-1"
            />
          );
        })}
        {/* placeholder card */}
        <StatCard className="w-full lg-1024:flex-1" />
      </StatCardGroup>

      {/* camera tiles */}
      <div className="hidden lg-1024:flex justify-between flex-5 gap-5 px-6 mt-4">
        {computedCamera.map((c, i) => (
          <CameraTile
            key={i}
            ringColor={c.ringColor}
            imgSrc={c.imgSrc}
            className="p-1!"
          />
        ))}
      </div>
    </div>
  );
}
