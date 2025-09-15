// src/components/Devices/Content.tsx
import { useState } from "react";
import { exportImage } from "../../assets";
import { useTranslation } from "react-i18next";
import StatCard, { StatCardGroup } from "../StatCard";
import { DEVICE_CARDS } from "./devices.constant";
import CCTVPanel from "./CCTV/cctvPanel";
import CCTVTable from "./CCTV/cctvTable";
import WaterMeterPanel from "./Water Meter/waterMeterPanel";
import ElectricMeterPanel from "./Electric Meter/electricMeterPanel";

type Props = {};

export default function Content({}: Props) {
  const { t: tDevices } = useTranslation("devices");
  const { t } = useTranslation("dashboard");

  // ค่าเริ่มต้น = cctv-1 (ต้องมีการ์ดถูกเลือกเสมอ)
  const [selectedId, setSelectedId] = useState<string>("cctv-1");

  return (
    <>
      <nav className="flex justify-between mt-10">
        <div className="flex flex-col gap-1 select-none">
          <h1 className="text-2xl font-semibold">{tDevices("nav.title")}</h1>
          <h1 className="text-gray-400">{tDevices("nav.subTitle")}</h1>
        </div>

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

      {/* กลุ่มการ์ด: เลือกได้ทีละใบ (single) */}
      <StatCardGroup
        selectionMode="single"
        activeIds={[selectedId]}
        onChange={(ids) => {
          // ห้ามปิดหมด ต้องเหลือการ์ด 1 ใบเสมอ
          if (ids.length === 0) return;
          setSelectedId(ids[0]);
        }}
        className="mt-5"
      >
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
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

      {/* เมื่อเลือก cctv-1 ให้แสดงทั้ง Panel + Table พร้อมกัน */}
      {selectedId === "cctv-1" || selectedId === "intercom-1" ? (
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
          <ElectricMeterPanel />
          <CCTVTable />
        </div>
      ) : (
        <div className="mt-6"></div>
      )}
    </>
  );
}
