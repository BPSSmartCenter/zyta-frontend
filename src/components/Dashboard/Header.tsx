import React from "react";
import { useNavigate, useLocation } from "react-router-dom"; // ⬅️ เพิ่ม useLocation
import StatCard, { StatCardGroup } from "../../components/StatCard";
import CameraTile from "../../components/CameraTile";
import { useTranslation } from "react-i18next";
import { useStatSelection, setSelectedStat } from "../../hook/useStatSelection";
import type { Noti } from "../../data/Dashboard/notis";
import { useUserPath } from "../../routes/useUserPath";
import { useNotisFeed } from "../../context/NotisContext";
import { resolveDefaultNotiImage } from "../../utils/notis";
import { isFaceRecNoti } from "../../utils/notis";

/* ---------- types ---------- */
type EventKey = "motion" | "fall" | "fire" | "offline" | "sleep" | "other";

type StatItem = {
  key: string; // อาจเป็นข้อความไทย เช่น "จำนวนกล้องออฟไลน์ / ออนไลน์"
  label: string;
  val: number | string;
  img: string;
  activeImg: string;
};

type CameraItem = {
  ringColor: string;
  imgSrc?: string;
  embedUrl?: string;
  embedTitle?: string;
  isFallback?: boolean;
};

type Props = {
  statItems: StatItem[];
  cameraItems?: CameraItem[];
  events?: Noti[];
  selectedSiteCode?: string;
};

const MAX_HEADER_IMAGES = 5;

/* ---------- TEMP monitor URL (mock) ---------- */
const MONITOR_URL =
  "https://lh3.googleusercontent.com/d/1SyjAavZ0IP_VQU81tAmBmQE-AjFEhn6m=w600-h600-iv1";

/* ---------- toggle: เปิด/ปิดการใช้รูป mock ---------- */
const USE_MOCK_CAMERA = false;

/* ---------- helpers ---------- */
const pickMetaImage = (meta: any): string | undefined => {
  if (!meta || typeof meta !== "object") return undefined;
  const candidates = [
    meta.screenshot,
    meta.screenShot,
    meta.thumbnail,
    meta.img,
    meta.image,
    meta.picture,
    meta.faceCropImg,
    meta.faceFullImg,
    meta.cropImg,
    meta.crop,
    meta.face?.cropImg,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length) {
      return candidate.trim();
    }
  }
  return undefined;
};

const getPic = (n: any): { src?: string; isFallback: boolean } => {
  const metaImg = pickMetaImage(n?.meta);
  const fromScreenshot =
    typeof n?.screenshot === "string" && n.screenshot.trim().length
      ? n.screenshot.trim()
      : undefined;
  const fromImg =
    typeof n?.img === "string" && n.img.trim().length ? n.img.trim() : undefined;
  const src = fromScreenshot ?? fromImg ?? metaImg;

  if (src) {
    return {
      src,
      isFallback: false,
    };
  }

  const fallback = resolveDefaultNotiImage(n);
  return { src: fallback, isFallback: Boolean(fallback) };
};

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
// noti -> คีย์กลาง (รองรับ EN/TH + titleKey พิเศษ)
const normalizeEventKey = (n: any): EventKey => {
  const s = bag(n);

  // 1) fire
  if (/\bfire\b/.test(s) || s.includes("fire detected")) return "fire";

  // 2) offline (ครบ ๆ)
  if (
    /notis\.(camera|device)offline/.test(s) ||
    /(?:camera|device)\s*offline/.test(s) ||
    /\boffline\b/.test(s) ||
    /ออฟ.?ไลน์/.test(s)
  )
    return "offline";

  // 3) fall (ให้มาก่อน motion)
  if (
    /\bfall\b/.test(s) ||
    s.includes("ตรวจพบคนล้ม") ||
    s.includes("ตรวจพบการล้ม") ||
    s.includes("fall detected") ||
    s.includes("notis.falldetected")
  )
    return "fall";

  // 4) sleep
  if (/\bsleep\b/.test(s) || s.includes("ตรวจพบคนหลับนานกว่าปกติ"))
    return "sleep";

  // 5) motion (สุดท้าย)
  if (
    /\bmotion\b/.test(s) ||
    s.includes("motion detected") ||
    s.includes("ตรวจจับการเคลื่อนไหว") ||
    s.includes("ตรวจพบการเคลื่อนไหว")
  )
    return "motion";

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

export default function Header({ statItems, cameraItems, events, selectedSiteCode }: Props) {
  const { t } = useTranslation(["dashboard", "common"]);
  const { selected } = useStatSelection();
  const navigate = useNavigate();
  const location = useLocation(); // ⬅️ ใช้เพื่อตรวจเส้นทางปัจจุบัน
  const { absSite, base } = useUserPath();
  const { items: liveNotis } = useNotisFeed();

  // ⬇️ ล้าง selection เมื่ออยู่ที่ /dashboard (แก้เฉพาะ logicตาม base /u/:uid)
  React.useEffect(() => {
    const pathNoBase = location.pathname.startsWith(base)
      ? location.pathname.slice(base.length) || "/"
      : location.pathname;
    if (pathNoBase === "/dashboard") {
      setSelectedStat(null);
    }
  }, [location.pathname, base]);

  // รวม notis จริง
  // ใช้ events ที่ถูกส่งเข้ามา "แม้จะเป็น []" (เพื่อให้แสดง 0 ได้จริง)
  const source = React.useMemo<Noti[]>(() => {
    if (Array.isArray(events)) return events;
    if (Array.isArray(liveNotis) && liveNotis.length) return liveNotis;
    return [];
  }, [events, liveNotis]);

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

  // ไปหน้า Alert (รักษา site context ถ้ามี)

const isImageUrl = (url?: string) => {
  if (!url) return false;
  const u = url.toLowerCase();
  return (
      u.startsWith("data:image/") ||
      /\.(png|jpe?g|gif|webp|bmp|avif)(\?.*)?$/.test(u) ||
      u.includes("googleusercontent.com") ||
      u.includes("=iv1")
  );
};

  // helper: ถ้าเป็น googleusercontent และยังไม่มีพารามิเตอร์ ให้ต่อ "=w600-h600-iv1"
  // หรือถ้ามีแล้วแต่ไม่มี -iv1 ให้เติม -iv1 เข้าไป
  const normalizeGoogleImg = (u?: string) => {
    if (!u) return u;
    if (!u.includes("googleusercontent.com/d/")) return u;
    if (!u.includes("=")) return `${u}=w600-h600-iv1`;
    return /[-_]iv1\b/.test(u) ? u : `${u}-iv1`;
  };

  // รูปแกลลอรี่ด้านบน
  const computedCamera: CameraItem[] = React.useMemo(() => {
    if (USE_MOCK_CAMERA) {
      // mock-only กดสวิตช์เอง (ปัจจุบัน false)
      const mock: CameraItem = {
        ringColor: "ring-[#AFEAFF]",
        imgSrc: normalizeGoogleImg(MONITOR_URL),
        embedUrl: undefined,
        embedTitle: "Mock Camera",
      };
      return Array.from({ length: MAX_HEADER_IMAGES }, () => mock);
    }

    // โหมดจริง: คัดเฉพาะ noti ที่มีรูป
    const tiles: CameraItem[] = source
      .filter((n) => !isFaceRecNoti(n))
      .sort(
        (a, b) =>
          new Date((b as any).date).getTime() -
          new Date((a as any).date).getTime()
      )
      .slice(0, MAX_HEADER_IMAGES)
      .map<CameraItem>((n) => {
        const pic = getPic(n);
        return {
          imgSrc: pic.src,
          ringColor: ringClass(n),
          isFallback: pic.isFallback,
        };
      })
      .filter((tile) => !!tile.imgSrc);

    // ถ้าไม่เจอรูปจาก notis และไม่มี cameraItems ให้ "ไม่แสดงอะไรเลย"
    if (tiles.length === 0 && !(cameraItems && cameraItems.length)) {
      return [];
    }

    const fallback: CameraItem[] = tiles.length
      ? tiles
      : (cameraItems ?? []).slice(0, MAX_HEADER_IMAGES);

    // **สำคัญ**: ไม่เติม MONITOR_URL โดยอัตโนมัติ
    return fallback.map<CameraItem>((tile) => {
      const candidateImg = normalizeGoogleImg(tile.imgSrc);
      const showAsImg = isImageUrl(candidateImg);
      return {
        ...tile,
        imgSrc: showAsImg ? candidateImg : undefined,
        embedUrl: showAsImg ? undefined : tile.embedUrl, // ใช้เฉพาะที่มีมาจริง
        embedTitle: tile.embedTitle ?? "Camera monitor",
      };
    });
  }, [source, cameraItems]);

  // กดการ์ด -> ไป /alert?event=<keyชัดเจน> (รักษา site context)
  const handleStatChange = (ids: string[]) => {
    const id = (ids[0] ?? "") as EventKey;
    setSelectedStat(id || null);
    if (!id) return;
    const sc = selectedSiteCode && selectedSiteCode !== "all" ? selectedSiteCode : undefined;
    navigate(absSite(`/alert?event=${id}`, sc));
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
        onChange={handleStatChange}
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
                {/* ⬇️ ฝังหน้ากล้องจาก MONITOR_URL แบบชั่วคราวผ่าน iframe */}
                <CameraTile
                  ringColor={c.ringColor}
                  imgSrc={c.imgSrc}
                  embedUrl={c.embedUrl}
                  embedTitle={c.embedTitle}
                  isFallbackImg={c.isFallback}
                  className="w-full"
                />
              </div>
            </div>
          ))}
          {computedCamera.length === 0 && (
            <div className="lg-1024:hidden relative mt-4">
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
      {computedCamera.length > 0 && (
        <div className="hidden lg-1024:flex justify-around flex-5 gap-5 px-6 mt-4">
          {computedCamera.map((c, i) => (
                <CameraTile
                  key={i}
                  ringColor={c.ringColor}
                  imgSrc={c.imgSrc}
                  embedUrl={c.embedUrl}
                  embedTitle={c.embedTitle}
                  isFallbackImg={c.isFallback}
                  className="p-1!"
                />
          ))}
        </div>
      )}
    </div>
  );
}
