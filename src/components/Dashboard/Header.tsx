import React from "react";
import { useNavigate, useLocation } from "react-router-dom"; // ⬅️ เพิ่ม useLocation
import StatCard, { StatCardGroup } from "../../components/StatCard";
import CameraTile from "../../components/CameraTile";
import { useTranslation } from "react-i18next";
import { useStatSelection, setSelectedStat } from "../../hook/useStatSelection";
import type { Noti } from "../../data/Dashboard/notis";
import { useUserPath } from "../../routes/useUserPath";
import { useNotisFeed } from "../../context/NotisContext";
import {
  resolveDefaultNotiImage,
  resolveAlertEventKey,
  resolveElectricDeviceSn,
  type AlertEventKey,
} from "../../utils/notis";
import {
  FACE_RECOGNIZE_PATH,
  resolveFaceRecPath,
} from "../../utils/faceRecRoutes";

/* ---------- types ---------- */
type EventKey =
  | "motion"
  | "fall"
  | "fire"
  | "offline"
  | "sleep"
  | "face"
  | "plate"
  | "other";

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
  eventKey?: AlertEventKey | null;
  noti?: Noti;
};

type Props = {
  statItems: StatItem[];
  cameraItems?: CameraItem[];
  events?: Noti[];
  selectedSiteCode?: string;
};

const MAX_HEADER_IMAGES = 5;

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
  if (t === "success") return "ring-[#22C55E]";
  return "ring-[#AFEAFF]";
};

const normalizeEventKey = (n: any): EventKey => {
  const key = resolveAlertEventKey(n);
  if (!key) return "other";
  return key as EventKey;
};
// คีย์บนการ์ด (ภาษาไทย/อังกฤษ) -> คีย์กลาง
const normalizeStatKey = (k: string): EventKey => {
  const raw = (k || "").toLowerCase();
  const collapsed = raw.replace(/[\s/_()\-|]+/g, "");
  if (raw.includes("motion")) return "motion";
  if (raw.includes("face")) return "face";
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
      face: 0,
      plate: 0,
      other: 0,
    };
    for (const n of source) {
      const key = normalizeEventKey(n);
      if (key === "plate") {
        c.face++;
        continue;
      }
      c[key] = (c[key] ?? 0) + 1;
    }
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
    const tiles: CameraItem[] = source
      .slice(0, MAX_HEADER_IMAGES)
      .map((n) => {
        const pic = getPic(n);
        const eventKey = resolveAlertEventKey(n);
        return {
          imgSrc: pic.src,
          ringColor: ringClass(n),
          isFallback: pic.isFallback,
          eventKey: eventKey ?? undefined,
          noti: n,
        };
      })
      .filter((tile) => Boolean(tile.imgSrc));

    // ถ้าไม่เจอรูปจาก notis และไม่มี cameraItems ให้ "ไม่แสดงอะไรเลย"
    if (tiles.length === 0 && !(cameraItems && cameraItems.length)) {
      return [];
    }

    const fallback: CameraItem[] = tiles.length
      ? tiles
      : (cameraItems ?? []).slice(0, MAX_HEADER_IMAGES);

    return fallback.map<CameraItem>((tile) => {
      const candidateImg = normalizeGoogleImg(tile.imgSrc);
      const hasImage =
        typeof candidateImg === "string" && candidateImg.trim().length > 0;
      return {
        ...tile,
        imgSrc: hasImage ? candidateImg : undefined,
        embedUrl: hasImage ? undefined : tile.embedUrl,
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
  if (id === "face") {
    navigate(absSite(FACE_RECOGNIZE_PATH, sc));
    return;
  }
  navigate(absSite(`/alert?event=${id}`, sc));
};

const handleCameraTileClick = (
  eventKey?: AlertEventKey | null,
  noti?: Noti | null
) => {
  if (!eventKey) return;
  const sc =
    selectedSiteCode && selectedSiteCode !== "all" ? selectedSiteCode : undefined;
  if (eventKey === "face" || eventKey === "plate") {
    navigate(absSite(resolveFaceRecPath(noti ?? undefined), sc), {
      state: { noti },
    });
    return;
  }

  if (eventKey === "electric_offline" || eventKey === "electric_low_power") {
    const params = new URLSearchParams();
    params.set("type", "electricmeter");
    const sn = resolveElectricDeviceSn(noti ?? {});
    if (sn) params.set("inverterSN", sn);
    const notiSiteCode =
      typeof (noti as any)?.siteCode === "string" && (noti as any).siteCode.trim().length
        ? String((noti as any).siteCode).trim()
        : null;
    const targetSite = notiSiteCode && notiSiteCode !== "all" ? notiSiteCode : sc;
    navigate(absSite(`/devices?${params.toString()}`, targetSite));
    return;
  }

  navigate(absSite(`/alert?event=${eventKey}`, sc));
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
      </StatCardGroup>

      {/* ===== Mobile carousel (<= 1024px) — จำกัดความกว้างรูปไม่เกิน 500px ตามเดิม ===== */}
      {computedCamera.length > 0 && (
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
                <div className="w-full max-w-[500px] mx-auto relative">
                  <CameraTile
                    ringColor={c.ringColor}
                    imgSrc={c.imgSrc}
                    embedUrl={c.embedUrl}
                    embedTitle={c.embedTitle}
                    isFallbackImg={c.isFallback}
                    className="w-full"
                  />
                  {c.eventKey && (
                    <button
                      type="button"
                      onClick={() => handleCameraTileClick(c.eventKey, c.noti)}
                      className="absolute inset-0 z-10 h-full w-full border-none bg-transparent p-0 cursor-pointer"
                      aria-label={t("alerts.goToEvent", {
                        event: c.eventKey,
                        defaultValue: `View ${c.eventKey} alerts`,
                      })}
                    />
                  )}
                </div>
              </div>
            ))}
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
      )}

      {/* camera tiles (Desktop layout เดิม) */}
      {computedCamera.length > 0 && (
        <div className="hidden lg-1024:flex justify-around flex-5 gap-5 px-6 mt-4">
          {computedCamera.map((c, i) => (
            <div key={i} className="relative">
              <CameraTile
                ringColor={c.ringColor}
                imgSrc={c.imgSrc}
                embedUrl={c.embedUrl}
                embedTitle={c.embedTitle}
                isFallbackImg={c.isFallback}
                className="p-1!"
              />
              {c.eventKey && (
                <button
                  type="button"
                  onClick={() => handleCameraTileClick(c.eventKey, c.noti)}
                  className="absolute inset-0 z-10 h-full w-full border-none bg-transparent p-0 cursor-pointer"
                  aria-label={t("alerts.goToEvent", {
                    event: c.eventKey,
                    defaultValue: `View ${c.eventKey} alerts`,
                  })}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
