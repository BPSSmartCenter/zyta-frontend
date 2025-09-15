import StatCard, { StatCardGroup } from "../StatCard";
import { exportImage } from "../../assets";
import { useTranslation } from "react-i18next";
import { useStatSelection, setSelectedStat } from "../../hook/useStatSelection";
import CameraTile from "../CameraTile";
import { useSearchParams } from "react-router-dom";
import * as React from "react";

// ใช้ข้อมูลจริงจาก notis.ts
import type { Noti } from "../../data/Dashboard/notis";
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

type CameraItem = {
  ringColor: string;
  imgSrc: string;
  alt?: string;
};

type Props = {
  statItems?: StatItem[];
  cameraItems?: CameraItem[];
};

/* ---------- helpers: notis -> camera tiles ---------- */
function ringClassByType(n: Noti): string {
  const t = (n.type || "").toLowerCase();
  if (t === "alert")
    return "ring-[#FB3F3F] animate-[bps-ring-blink_1s_linear_infinite]";
  if (t === "warning")
    return "ring-[#FE9927] animate-[bps-ring-blink_1s_linear_infinite]";
  return "ring-[#AFEAFF]";
}
const pickImage = (e: Noti) => (e as any).screenshot ?? (e as any).img;

const hasKeyword = (s: string, kw: string) =>
  s.toLowerCase().includes(kw.toLowerCase());

const eventMatches = (n: Noti, ev: string) => {
  const e = ev.toLowerCase();
  const title = String((n as any).title ?? "");
  const titleKey = String((n as any).titleKey ?? "");
  const eventField = String((n as any).event ?? "");
  return (
    eventField.toLowerCase() === e ||
    hasKeyword(titleKey, e) ||
    hasKeyword(title, e)
  );
};

const buildCamerasFrom = (events: Noti[], limit = 3): CameraItem[] =>
  events
    .filter((e) => !!pickImage(e))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
    .map((e, i) => ({
      ringColor: ringClassByType(e),
      imgSrc: pickImage(e)!,
      alt: `event-${i + 1}`,
    }));

export default function Content({ statItems, cameraItems }: Props) {
  const { t: tAlert } = useTranslation("alert");
  const { t } = useTranslation("dashboard");
  const { selected } = useStatSelection();
  const [searchParams] = useSearchParams();
  const items = statItems ?? [];

  // ?event=motion | fall | fire | ...
  const eventParam = (searchParams.get("event") ?? "").toLowerCase();

  // รวม notis จริงทั้งหมด
  const allEvents: Noti[] = React.useMemo(() => {
    const a = Array.isArray(alertNotis) ? alertNotis : [];
    const b = Array.isArray(wellBeingNotis) ? wellBeingNotis : [];
    return [...a, ...b];
  }, []);

  // กรองตาม event (ถ้าส่งมา)
  const filtered = React.useMemo(() => {
    if (!eventParam) return allEvents;
    return allEvents.filter((n) => eventMatches(n, eventParam));
  }, [allEvents, eventParam]);

  // รูปด้านบน: เอาจาก notis (screenshot ก่อน), ถ้าไม่พอค่อยใช้ props.cameraItems
  const autoCams = React.useMemo(() => buildCamerasFrom(filtered, 3), [filtered]);
  const cams = (cameraItems && cameraItems.length > 0 ? cameraItems : autoCams).slice(0, 3);

  // ไฮไลต์การ์ดตาม eventParam (รองรับทั้ง motion/fall/fire)
  React.useEffect(() => {
    if (eventParam) setSelectedStat(eventParam);
  }, [eventParam]);

  return (
    <>
      {/* keyframes กระพริบ (ใช้ร่วมกับ Table ได้) */}
      <style>
        {`
          @keyframes bps-ring-blink {
            0%, 60% { opacity: 1; }
            80% { opacity: .15; }
            100% { opacity: 1; }
          }
        `}
      </style>

      {/* Top bar */}
      <nav className="flex justify-between mt-10">
        <h1 className="text-2xl font-semibold">{tAlert("totalAlertsToday")}</h1>
        <div className="gap-3 flex">
          <button className="inline-flex h-10 w-10 md:w-[105px] items-center justify-center rounded-md border border-gray-300 px-3 text-sm text-[#414651] font-inter font-bold hover:cursor-pointer focus:bg-gray-50">
            <span className="truncate flex items-center gap-2">
              <img src={exportImage} alt="" />
              <span className="hidden md:inline">{t("navbar.import")}</span>
            </span>
          </button>

          <button className="inline-flex h-10 w-10 md:w-[88px] items-center justify-center rounded-md px-3 bg-cyan text-white text-sm text-[#414651] font-inter font-bold hover:cursor-pointer">
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
          activeIds={selected ? [selected] : []}
          onChange={(ids) => setSelectedStat(ids[0] ?? null)}
          className="grid grid-cols-2 gap-2 px-6 lg-1024:flex lg-1024:flex-wrap"
        >
          {(items ?? []).map((it) => (
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
        </StatCardGroup>

        {/* Camera tiles (3 รูปจาก notis จริง) */}
        {cams.length > 0 && (
          <div className="flex flex-3 justify-around flex-col items-center mt-6 md:flex-row gap-14 px-6">
            {cams.map((c, i) => (
              <CameraTile
                key={i}
                ringColor={c.ringColor}
                imgSrc={c.imgSrc}
                alt={c.alt ?? `camera-${i + 1}`}
                className="flex-1"
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
