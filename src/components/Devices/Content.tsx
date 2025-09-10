import { exportImage } from "../../assets";
import { useTranslation } from "react-i18next";
import StatCard, { StatCardGroup } from "../StatCard";
import { DEVICE_CARDS } from "./devices.constant";

type Props = {};

export default function Content({}: Props) {
  const { t: tDevices } = useTranslation("devices");
  const { t } = useTranslation("dashboard");

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

      {/* กลุ่มการ์ด: เลือกได้ทีละใบ, แต่สวิตช์แต่ละใบอิสระ */}
      <StatCardGroup selectionMode="single" className="mt-6">
        <ul className="flex flex-wrap gap-3">
          {DEVICE_CARDS.map((c) => (
            <li key={c.id}>
              <StatCard
                id={c.id}
                variant="boxWithSwitch"
                img={c.img}
                activeImg={c.activeImg}
                label={c.label}
                switchProps={{ defaultChecked: false }} // ถ้าอยากเริ่มเปิดไว้
              />
            </li>
          ))}
        </ul>
      </StatCardGroup>
    </>
  );
}
