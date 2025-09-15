// src/pages/Dashboard/Header.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import StatCard, { StatCardGroup } from "../../components/StatCard";
import CameraTile from "../../components/CameraTile";
import { useTranslation } from "react-i18next";
import { useStatSelection, setSelectedStat } from "../../hook/useStatSelection";
import type { Noti } from "../../data/Dashboard/notis";

// ✅ ดึงชุดข้อมูลและ type เดียวกันกับที่ส่วนอื่นใช้
import {
  notis as alertNotis,
  wellBeingNotis,
} from "../../data/Dashboard/notis";

type StatItem = {
  key: string;
  label: string;
  val: number | string;
  img: string;
  activeImg: string;
};

// CameraTile คาดหวังให้ ringColor เป็น "คลาสของ Tailwind" (เช่น ring-red-500 หรือ ring-[#FB3F3F])
type CameraItem = { ringColor: string; imgSrc: string };

type Props = {
  statItems: StatItem[];
  cameraItems?: CameraItem[]; // fallback ถ้าไม่มีรูปจาก events
  events?: Noti[];            // override แหล่งข้อมูล (ถ้าต้องกรอง)
};

const MAX_HEADER_IMAGES = 5;

/** map type -> ring class (เฉพาะ alert/warning ให้กระพริบ) */
function ringClassByType(n: Noti): string {
  const t = (n.type || "").toLowerCase();
  if (t === "alert")
    return "ring-[#FB3F3F] animate-[bps-ring-blink_1s_linear_infinite]";
  if (t === "warning")
    return "ring-[#FE9927] animate-[bps-ring-blink_1s_linear_infinite]";
  // อื่น ๆ (info/offline/wellbeing) = ฟ้า, ไม่กระพริบ
  return "ring-[#AFEAFF]";
}

/** เลือกภาพเหตุการณ์ (screenshot ก่อน ถ้าไม่มีค่อย img) */
function pickImage(e: Noti): string | undefined {
  return (e as any).screenshot ?? (e as any).img;
}

/** สร้างชุด CameraItem จาก Noti[] — ใหม่ -> เก่า -> จำกัด 5 */
function buildFromEvents(events: Noti[], limit = MAX_HEADER_IMAGES): CameraItem[] {
  return events
    .filter((e) => !!pickImage(e))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
    .map((e) => ({
      ringColor: ringClassByType(e),
      imgSrc: pickImage(e)!,
    }));
}

function clamp(n: number, min: number, max: number) {
  return n < min ? min : n > max ? max : n;
}

export default function Header({ statItems, cameraItems, events }: Props) {
  const { t } = useTranslation(["dashboard", "common"]);
  const { selected } = useStatSelection();
  const navigate = useNavigate();

  // ✅ แหล่งข้อมูลหลัก: notis + wellbeingNotis (ถ้า props.events ไม่ได้ส่งมา)
  const sourceEvents = React.useMemo<Noti[]>(() => {
    if (events?.length) return events;
    const a = Array.isArray(alertNotis) ? alertNotis : [];
    const b = Array.isArray(wellBeingNotis) ? wellBeingNotis : [];
    return [...a, ...b];
  }, [events]);

  // ✅ คำนวนรูปสำหรับ Header: เลือก screenshot/img, เรียงใหม่->เก่า, จำกัด 5
  // ถ้าไม่มีแม้แต่รูปเดียว -> fallback ไป cameraItems เดิม (ถ้ามี)
  const computedCamera = React.useMemo<CameraItem[]>(() => {
    const fromEvents = buildFromEvents(sourceEvents, MAX_HEADER_IMAGES);
    if (fromEvents.length) return fromEvents;
    const base = cameraItems ?? [];
    return base.slice(0, MAX_HEADER_IMAGES);
  }, [sourceEvents, cameraItems]);

  // state slider (มือถือ)
  const [index, setIndex] = React.useState(0);
  const maxIndex = Math.max(0, computedCamera.length - 1);
  const canPrev = index > 0;
  const canNext = index < maxIndex;
  const gotoPrev = () => canPrev && setIndex((v) => v - 1);
  const gotoNext = () => canNext && setIndex((v) => v + 1);

  React.useEffect(() => {
    setIndex((v) => clamp(v, 0, Math.max(0, computedCamera.length - 1)));
  }, [computedCamera.length]);

  // ✅ เมื่อเปลี่ยน selection ของ StatCard: setSelectedStat + ถ้าเป็น Motion/Fall ให้พาไป TotalAlert พร้อม query
  const handleStatChange = React.useCallback(
    (ids: string[]) => {
      const next = ids[0] ?? null;
      setSelectedStat(next);

      if (!next) return;
      const k = next.toLowerCase();
      // map key ให้ครอบคลุมชื่อที่คล้ายกัน
      let eventKey: string | null = null;
      if (k.includes("motion")) eventKey = "motion";
      else if (k.includes("fall")) eventKey = "fall";
      else if (k.includes("fire")) eventKey = "fire";

      if (eventKey) {
        navigate(`/alert?event=${encodeURIComponent(eventKey)}`);
      }
    },
    [navigate]
  );

  return (
    <div>
      {/* ✅ keyframes สำหรับกระพริบขอบ (alert/warning) */}
      <style>
        {`
          @keyframes bps-ring-blink {
            0%, 60% { opacity: 1; }
            80% { opacity: .15; }
            100% { opacity: 1; }
          }
        `}
      </style>

      {/* --- StatCards (UI เดิม) --- */}
      <StatCardGroup
        selectionMode="single"
        activeIds={selected ? [selected] : []}
        onChange={handleStatChange}
        className="grid grid-cols-2 gap-2 px-6 lg-1024:flex lg-1024:flex-wrap"
      >
        {statItems.map((it) => (
          <StatCard
            id={it.key}
            key={it.key}
            label={t(`stats.${it.key}`, { defaultValue: it.label })}
            val={it.val}
            img={it.img}
            activeImg={it.activeImg}
            inactiveBg="bg-white"
            activeBg="bg-cyan-500"
            className="w-full lg-1024:flex-1"
          />
        ))}
        <StatCard className="w-full lg-1024:flex-1" />
      </StatCardGroup>

      {/* --- Camera tiles (เดสก์ท็อป) --- */}
      <div className="hidden lg-1024:flex justify-between flex-5 gap-5 px-6 mt-4">
        {computedCamera.length === 0 ? (
          <div className="w-full text-sm text-gray-500 py-4">
            {t("common:noResults", { defaultValue: "No results" })}
          </div>
        ) : (
          computedCamera.map((c, i) => (
            <CameraTile key={i} ringColor={c.ringColor} imgSrc={c.imgSrc} className="p-1!" />
          ))
        )}
      </div>

      {/* --- Camera slider (มือถือ) --- */}
      <div className="lg-1024:hidden px-6 mt-4">
        {computedCamera.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">
            {t("common:noResults", { defaultValue: "No results" })}
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={gotoPrev}
              aria-label={t("common:prev", { defaultValue: "Previous" })}
              className={[
                "absolute left-2 top-1/2 -translate-y-1/2 z-10",
                "size-9 flex items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow",
                canPrev ? "opacity-100" : "opacity-40 pointer-events-none",
              ].join(" ")}
            >
              <i className="material-icons">arrow_back_ios</i>
            </button>

            <button
              type="button"
              onClick={gotoNext}
              aria-label={t("common:next", { defaultValue: "Next" })}
              className={[
                "absolute right-2 top-1/2 -translate-y-1/2 z-10",
                "size-9 flex items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow",
                canNext ? "opacity-100" : "opacity-40 pointer-events-none",
              ].join(" ")}
            >
              <i className="material-icons">arrow_forward_ios</i>
            </button>

            <div className="overflow-hidden rounded-xl">
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${index * 100}%)` }}
              >
                {computedCamera.map((c, i) => (
                  <div key={i} className="flex shrink-0 items-center basis-full">
                    <div className="mx-auto py-2 max-w-[520px]">
                      <CameraTile ringColor={c.ringColor} imgSrc={c.imgSrc} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              {computedCamera.map((_, i) => (
                <span
                  key={i}
                  className={[
                    "inline-block h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-gray-800" : "w-2 bg-gray-300",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
