import StatCard, { StatCardGroup } from "../StatCard";
import { exportImage } from "../../assets";
import { useTranslation } from "react-i18next";
import { useStatSelection, setSelectedStat } from "../../hook/useStatSelection";
import CameraTile from "../CameraTile";

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

export default function Content({ statItems, cameraItems }: Props) {
  const { t: tAlert } = useTranslation("alert");
  const { t } = useTranslation("dashboard");
  const { selected } = useStatSelection();

  const items = statItems ?? [];
  const cams = (cameraItems ?? []).slice(0, 3);

  return (
    <>
      {/* Top bar */}
      <nav className="flex justify-between mt-10">
        <h1 className="text-2xl font-semibold">{tAlert("totalAlertsToday")}</h1>
        <div className="gap-3 flex">
          {/* Import: ไอคอนล้วนเมื่อจอ ≤ sm */}
          <button className="inline-flex h-10 w-10 md:w-[105px] items-center justify-center rounded-md border border-gray-300 px-3 text-sm text-[#414651] font-inter font-bold hover:cursor-pointer focus:bg-gray-50">
            <span className="truncate flex items-center gap-2">
              <img src={exportImage} alt="" />
              <span className="hidden md:inline">{t("navbar.import")}</span>
            </span>
          </button>

          {/* Add: ไอคอนล้วนเมื่อจอ ≤ sm */}
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

        {/* Camera tiles (3 รูป) */}
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
