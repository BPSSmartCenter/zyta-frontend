// src/pages/Dashboard/Header.tsx
import React from "react";
import StatCard, { StatCardGroup } from "../../components/StatCard";
import CameraTile from "../../components/CameraTile";
import { useTranslation } from "react-i18next";
import { useStatSelection, setSelectedStat } from "../../hook/useStatSelection";

type StatItem = {
  key: string;
  label: string;
  val: number | string;
  img: string;
  activeImg: string;
};

type CameraItem = { ringColor: string; imgSrc: string };

type Props = {
  statItems: StatItem[];
  cameraItems: CameraItem[];
};

export default function Header({ statItems, cameraItems }: Props) {
  const { t } = useTranslation(["dashboard"]);
  const { selected } = useStatSelection();

  // state สไลด์ของ Camera (คงเดิม)
  const [index, setIndex] = React.useState(0);
  const maxIndex = Math.max(0, cameraItems.length - 1);
  const canPrev = index > 0;
  const canNext = index < maxIndex;
  const gotoPrev = () => canPrev && setIndex((v) => v - 1);
  const gotoNext = () => canNext && setIndex((v) => v + 1);

  return (
    <div>
      {/* --- StatCards --- */}
      <StatCardGroup
        selectionMode="single"
        activeIds={selected ? [selected] : []}
        onChange={(ids) => setSelectedStat(ids[0] ?? null)}
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

      {/* --- Camera tiles (เดิมทั้งหมด) --- */}
      <div className="hidden lg-1024:flex justify-between flex-5 gap-5 px-6 mt-4">
        {cameraItems.map((c, i) => (
          <CameraTile key={i} ringColor={c.ringColor} imgSrc={c.imgSrc} />
        ))}
      </div>

      <div className="lg-1024:hidden px-6 mt-4">
        <div className="relative">
          <button
            type="button"
            onClick={gotoPrev}
            aria-label={t("common.prev")}
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
            aria-label={t("common.next")}
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
              {cameraItems.map((c, i) => (
                <div key={i} className="flex shrink-0 items-center basis-full">
                  <div className="mx-auto max-w-[520px]">
                    <CameraTile ringColor={c.ringColor} imgSrc={c.imgSrc} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            {cameraItems.map((_, i) => (
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
      </div>
    </div>
  );
}
