// src/components/Dashboard/DeviceCount.tsx
import RadialBar from "../RadialBar";
import DonutLegend from "../DonutLegend";
import {
  cctvImage,
  intercomeImage,
  solarImage,
  windImage,
  waterTapImage,
  alertCyan,
} from "../../assets/index";
import { useTranslation } from "react-i18next";

export default function DeviceCount() {
  const { t, i18n } = useTranslation(["dashboard"]);
  const langKey = i18n.language || "en";

  const titleDevices = t("devices.title", { defaultValue: "DEVICES" });
  const labelOffline = t("devices.offline", { defaultValue: "Offline" });
  const labelOnline = t("devices.online", { defaultValue: "Online" });
  const titleCameras = t("devices.cameras", { defaultValue: "Cameras" });
  const titleTotal = t("devices.total", { defaultValue: "Total" });

  const labelCameraCount = t("devices.camerasShort", { defaultValue: "Cameras" });
  const labelIntercom = t("devices.intercom", { defaultValue: "Intercom" });
  const labelWater = t("devices.waterMeter", { defaultValue: "Water meter" });
  const labelElectric = t("devices.electricMeter", { defaultValue: "Electric meter" });
  const labelAir = t("devices.air", { defaultValue: "Air" });
  const labelAlert = t("devices.zyta", { defaultValue: "ZYTA Alert" });

  return (
    <form className="flex flex-col gap-3 hover:cursor-default">
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        {titleDevices}
      </h1>

      <div className="flex">
        <RadialBar
          key={`radial-offline-${langKey}`}       // ← บังคับ remount เมื่อภาษาเปลี่ยน
          value={(45 / (45 + 89)) * 100}
          label={labelOffline}
          mainColor="#FB3F3F"
          primaryColor="#A9DB4E"
          bg="#FFFFFF"
          height={170}
          width={170}
          hollowSize="65%"
          rounded
          offsets={{ labelOffsetY: -6, valueOffsetY: 8 }}
          valueStyle={{ fontSize: 22, fontWeight: 600, color: "#111827" }}
          prefix="%"
        />

        <div className="flex flex-col gap-3">
          <h1 className="text-[24px] font-semibold">{titleCameras}</h1>

          <div className="flex gap-2 flex-wrap">
            <div className="flex flex-col w-[70px] h-[60px] bg-[#F8FBFE] text-[#39B8EE] rounded-[10px] justify-center items-center gap-1">
              <DonutLegend
                items={[{ label: labelOffline, color: "#FB3F3F" }]}
                labelClassName="text-[#39B8EE] text-[13px]"
              />
              <h1 className="text-[18px] font-semibold">45</h1>
            </div>

            <div className="flex flex-col w-[70px] h-[60px] bg-[#F8FBFE] text-[#39B8EE] rounded-[10px] justify-center items-center gap-1">
              <DonutLegend
                items={[{ label: labelOnline, color: "#A9DB4E" }]}
                labelClassName="text-[#39B8EE] text-[13px]"
              />
              <h1 className="text-[18px] font-semibold">89</h1>
            </div>
          </div>

          <h1 className="mt-2 lg:text-[24px] md:text-[18px] whitespace-nowrap font-semibold text-[#1E1E1E]">
            {titleTotal} <span>134</span>
          </h1>
        </div>
      </div>

      <ul className="flex flex-col gap-7 font-inter text-[16px]  text-cyan-500">
        <li className="flex gap-4 justify-around">
          <div className="flex items-center gap-4">
            <img src={cctvImage} alt="" width={36} />
            <span>
              {labelCameraCount}{" "}
              <span className="text-red-500 font-semibold">24</span>
            </span>
          </div>

          <div className="flex items-center gap-4 ">
            <img src={intercomeImage} alt="" width={36} />
            <span>
              {labelIntercom}{" "}
              <span className="text-red-500 font-semibold">45</span>
            </span>
          </div>
        </li>

        <li className="flex gap-4 justify-around">
          <div className="flex items-center gap-4">
            <img src={waterTapImage} alt="" width={36} />
            <span>
              {labelWater}{" "}
              <span className="text-red-500 font-semibold">45</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <img src={solarImage} alt="" width={36} />
            <span>
              {labelElectric}{" "}
              <span className="text-red-500 font-semibold">34</span>
            </span>
          </div>
        </li>

         <li className="flex gap-4 justify-around">
          <div className="flex items-center gap-4">
            <img src={windImage} alt="" width={36} />
            <span>
              {labelAir}{" "}
              <span className="text-red-500 font-semibold">87</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <img src={alertCyan} alt="" width={36} />
            <span>
              {labelAlert}{" "}
              <span className="text-red-500 font-semibold">15</span>
            </span>
          </div>
        </li>
      </ul>
    </form>
  );
}
