import React from "react";
import { useNavigate, useLocation } from "react-router-dom"; // ⬅️ เพิ่ม useLocation
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

/* ---------- TEMP monitor URL ---------- */
const MONITOR_URL = "http://203.114.71.19";

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
  const location = useLocation(); // ⬅️ ใช้เพื่อตรวจเส้นทางปัจจุบัน

  // ⬇️ ล้าง selection เมื่ออยู่ที่ /dashboard (แก้เฉพาะ logic ตามที่ขอ)
  React.useEffect(() => {
    if (location.pathname === "/dashboard") {
      setSelectedStat(null);
    }
  }, [location.pathname]);

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

  // ===== Mobile carousel helpers =====
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [slide, setSlide] = React.useState(0);
  const slideCount = computedCamera.length;

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth; // ความกว้างของ viewport
    el.scrollTo({ left: idx * w, behavior: "smooth" });
  };
  const go = (dir: 1 | -1) => {
    if (slideCount === 0) return;
    const next = (slide + dir + slideCount) % slideCount;
    setSlide(next);
    scrollTo(next);
  };
  // sync เมื่อสไลด์เปลี่ยนจากการลากนิ้ว
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== slide) setSlide(idx);
  };
  React.useEffect(() => {
    if (slide >= slideCount) setSlide(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideCount]);

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

      {/* ===== Mobile carousel (<= 1024px) — จำกัดความกว้างรูปไม่เกิน 500px ตามเดิม ===== */}
      <div className="lg-1024:hidden relative mt-4">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth p-3"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {computedCamera.map((c, i) => (
            <div
              key={i}
              className="flex-none w-full snap-center px-6"
              style={{ scrollSnapAlign: "center" }}
            >
              <div className="w-full max-w-[500px] mx-auto">
                {/* ⬇️ ทำให้คลิกแล้วเปิดแท็บใหม่ไปยัง MONITOR_URL */}
                <a
                  href={MONITOR_URL}
                  rel="noopener noreferrer"
                  aria-label="Open monitor"
                >
                  <CameraTile
                    ringColor={c.ringColor}
                    imgSrc={c.imgSrc}
                    className="w-full"
                  />
                </a>
              </div>
            </div>
          ))}
          {computedCamera.length === 0 && (
            <div className="w-full px-6">
              <div className="h-[180px] w-full rounded-xl bg-gray-100" />
            </div>
          )}
        </div>

        {computedCamera.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow p-2"
              aria-label="Previous"
            >
              <i className="material-icons">chevron_left</i>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow p-2"
              aria-label="Next"
            >
              <i className="material-icons">chevron_right</i>
            </button>
          </>
        )}

        {computedCamera.length > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            {computedCamera.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setSlide(i);
                  scrollTo(i);
                }}
                className={`h-2 w-2 rounded-full ${
                  i === slide ? "bg-cyan-500" : "bg-gray-300"
                }`}
                aria-label={`Go to slide ${i + 1}`}
                type="button"
              />
            ))}
          </div>
        )}
      </div>

      {/* camera tiles (Desktop layout เดิม) */}
      <div className="hidden lg-1024:flex justify-around flex-5 gap-5 px-6 mt-4">
        {computedCamera.map((c, i) => (
          <a
            key={i}
            href={MONITOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open monitor"
          >
            <CameraTile
              ringColor={c.ringColor}
              imgSrc={c.imgSrc}
              className="p-1!"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
