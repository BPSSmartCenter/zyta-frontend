// src/components/Devices/Content.tsx
import { useMemo } from "react";
import { exportImage } from "../../assets";
import { useTranslation } from "react-i18next";
import StatCard, { StatCardGroup } from "../StatCard";
import { DEVICE_CARDS } from "./devices.constant";
import CCTVPanel from "./CCTV/cctvPanel";
import CCTVTable from "./CCTV/cctvTable";
import WaterMeterPanel from "./Water Meter/waterMeterPanel";
import ElectricMeterPanel from "./Electric Meter/electricMeterPanel";
import AirPanel from "./Air Sensor/AirPanel";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";
import MiniFiltersBar from "../Shared/MiniFiltersBar";

type Props = {};

const TYPE_TO_ID: Record<string, string> = {
  cctv: "cctv-1",
  watermeter: "water-1",
  electricmeter: "electric-1",
  airsensor: "air-1",
};

const ID_TO_TYPE: Record<string, string> = Object.entries(TYPE_TO_ID).reduce(
  (acc, [type, id]) => {
    acc[id] = type;
    return acc;
  },
  {} as Record<string, string>
);

export default function Content({}: Props) {
  const { t: tDevices } = useTranslation("devices");
  const { t } = useTranslation("dashboard");
  const location = useLocation();
  const navigate = useNavigate();

  const { abs, absSite } = useUserPath();
  const { siteCode } = useParams();
  // ===== URL → type (derive only; no local state) =====
  const urlType = useMemo(() => {
    const q = new URLSearchParams(location.search).get("type")?.toLowerCase();
    return q && TYPE_TO_ID[q] ? q : "cctv"; // default: cctv
  }, [location.search]);

  const selectedId = useMemo(() => TYPE_TO_ID[urlType], [urlType]);

  // เปลี่ยนการ์ด → อัปเดต URL (เปลี่ยนเฉพาะ search เพื่อลดการกระพริบ)
  const handleChange = (ids: string[]) => {
    const nextId = ids[0];
    const nextType = nextId ? ID_TO_TYPE[nextId] : undefined;
    if (!nextType || nextType === urlType) return;

    // ใช้ search แทนการประกอบสตริงเอง เผื่ออนาคตมีพารามอื่น
    const params = new URLSearchParams(location.search);
    params.set("type", nextType);
    if (siteCode) {
      navigate(
        { pathname: absSite("/devices", siteCode), search: `?${params.toString()}` },
        { replace: false }
      );
    } else {
      navigate(
        { pathname: abs("/devices"), search: `?${params.toString()}` },
        { replace: false }
      );
    }
  };

  return (
    <>
      <nav className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6">
        <div className="flex flex-col gap-1 select-none">
          <h1 className="text-2xl font-semibold">{tDevices("nav.title")}</h1>
        </div>

        <div className="gap-2 flex flex-wrap items-center">
          <MiniFiltersBar page="devices" />
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 px-3 text-sm text-[#414651] font-inter font-bold hover:cursor-pointer focus:bg-gray-50">
            <span className="truncate flex items-center gap-2">
              <img src={exportImage} alt="" />
              <span className="hidden sm:inline">{t("navbar.import")}</span>
            </span>
          </button>
          <button className="inline-flex h-10 items-center justify-center rounded-md px-3 bg-cyan text-white text-sm text-[#414651] font-inter font-bold hover:cursor-pointer">
            <span className="flex w-full justify-center items-center gap-2">
              <i className="material-icons w-[24px]">add_2</i>
              <p className="hidden sm:block">{t("navbar.add")}</p>
            </span>
          </button>
        </div>
      </nav>

      {/* กลุ่มการ์ด: single select */}
      <StatCardGroup
        selectionMode="single"
        activeIds={[selectedId]}
        onChange={handleChange}
        className="mt-5"
      >
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {DEVICE_CARDS.map((c) => (
            <li key={c.id}>
              <StatCard
                id={c.id}
                variant="boxWithSwitch"
                img={c.img}
                activeImg={c.activeImg}
                label={tDevices(c.label)}
                switchProps={{ defaultChecked: true }}
              />
            </li>
          ))}
        </ul>
      </StatCardGroup>

      {/* Panel/Table ตาม selectedId (คอมโพเนนต์คงตัว ไม่รี-mount จาก key/state) */}
      {selectedId === "cctv-1" ? (
        <div className="flex flex-col gap-3">
          <CCTVPanel />
          <CCTVTable />
        </div>
      ) : selectedId === "intercom-1" ? (
        <div className="flex flex-col gap-3">
          <CCTVPanel />
          <CCTVTable />
        </div>
      ) : selectedId === "water-1" ? (
        <div className="flex flex-col gap-3">
          <WaterMeterPanel />
          <CCTVTable />
        </div>
      ) : selectedId === "electric-1" ? (
        <div className="mt-6">
          <ElectricMeterPanel siteCode={siteCode} />
          <CCTVTable />
        </div>
      ) : selectedId === "air-1" ? (
        <div className="mt-6">
          <AirPanel />
          <CCTVTable />
        </div>
      ) : (
        <div className="mt-6" />
      )}
    </>
  );
}
