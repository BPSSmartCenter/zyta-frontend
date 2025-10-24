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
import { useNavigate } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";

type DeviceCounts = {
  cameras: number;
  intercom: number;
  waterMeter: number;
  electricMeter: number;
  airSensor: number;
  zyta: number;
};

type Props = {
  siteCode?: string;
  counts?: Partial<DeviceCounts>;
  offlinePercent?: number; // if provided, overrides computed
  offlineCount?: number;
  onlineCount?: number;
};

export default function DeviceCount({
  siteCode,
  counts,
  offlinePercent,
  offlineCount,
  onlineCount,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const langKey = i18n.language || "en";
  const navigate = useNavigate();

  const { abs, absSite } = useUserPath();
  const titleDevices = t("devices.title", { defaultValue: "DEVICES" });
  const labelOffline = t("devices.offline", { defaultValue: "Offline" });
  const labelOnline = t("devices.online", { defaultValue: "Online" });
  const titleCameras = t("devices.cameras", { defaultValue: "Cameras" });
  const titleTotal = t("devices.total", { defaultValue: "Total" });

  const labelCameraCount = t("devices.camerasShort", {
    defaultValue: "Cameras",
  });
  const labelIntercom = t("devices.intercom", { defaultValue: "Intercom" });
  const labelWater = t("devices.waterMeter", { defaultValue: "Water meter" });
  const labelElectric = t("devices.electricMeter", {
    defaultValue: "Electric meter",
  });
  const labelAir = t("devices.air", { defaultValue: "Air" });
  const labelAlert = t("devices.zyta", { defaultValue: "Red Box" });

  const goDevices = (type: string) => {
    if (siteCode) return navigate(absSite(`/devices?type=${type}`, siteCode));
    return navigate(abs(`/devices?type=${type}`));
  };

  // Defaults (mock): only 1 electric meter, others 0; offline 100%
  const mergedCounts: DeviceCounts = {
    cameras: 0,
    intercom: 0,
    waterMeter: 0,
    electricMeter: 1,
    airSensor: 0,
    zyta: 0,
    ...(counts || {}),
  } as DeviceCounts;

  const offlineOnline = (() => {
    const oc = typeof offlineCount === "number" ? offlineCount : 1;
    const on = typeof onlineCount === "number" ? onlineCount : 0;
    const pct =
      typeof offlinePercent === "number"
        ? offlinePercent
        : (oc / Math.max(oc + on, 1)) * 100;
    return { oc, on, pct };
  })();

  return (
    <form className="flex flex-col gap-3 hover:cursor-default">
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        {titleDevices}
      </h1>

      <div className="flex">
        <RadialBar
          key={`radial-offline-${langKey}`} // ← บังคับ remount เมื่อภาษาเปลี่ยน
          value={offlineOnline.pct}
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
              <h1 className="text-[18px] font-semibold">{offlineOnline.oc}</h1>
            </div>

            <div className="flex flex-col w-[70px] h-[60px] bg-[#F8FBFE] text-[#39B8EE] rounded-[10px] justify-center items-center gap-1">
              <DonutLegend
                items={[{ label: labelOnline, color: "#A9DB4E" }]}
                labelClassName="text-[#39B8EE] text-[13px]"
              />
              <h1 className="text-[18px] font-semibold">{offlineOnline.on}</h1>
            </div>
          </div>

          <h1 className="mt-2 lg:text-[24px] md:text-[18px] whitespace-nowrap font-semibold text-[#1E1E1E]">
            {titleTotal} <span>{offlineOnline.oc + offlineOnline.on}</span>
          </h1>
        </div>
      </div>

      <ul className="flex flex-col gap-7 font-inter text-[16px]  text-cyan-500">
        <li className="flex gap-4 justify-around">
          {/* Cameras → /devices?type=cctv */}
          <div
            className="flex items-center gap-4 hover:cursor-pointer"
            onClick={() => goDevices("cctv")}
          >
            <img src={cctvImage} alt="" width={36} />
            <span>
              {labelCameraCount}{" "}
              <span className="text-red-500 font-semibold">
                {mergedCounts.cameras}
              </span>
            </span>
          </div>

          {/* Intercom → /devices?type=intercom */}
          <div
            className="flex items-center gap-4 hover:cursor-pointer"
            onClick={() => goDevices("intercom")}
          >
            <img src={intercomeImage} alt="" width={36} />
            <span>
              {labelIntercom}{" "}
              <span className="text-red-500 font-semibold">
                {mergedCounts.intercom}
              </span>
            </span>
          </div>
        </li>

        <li className="flex gap-4 justify-around">
          {/* Water Meter → /devices?type=watermeter */}
          <div
            className="flex items-center gap-4 hover:cursor-pointer"
            onClick={() => goDevices("watermeter")}
          >
            <img src={waterTapImage} alt="" width={36} />
            <span>
              {labelWater}{" "}
              <span className="text-red-500 font-semibold">
                {mergedCounts.waterMeter}
              </span>
            </span>
          </div>

          {/* Electric Meter → /devices?type=electricmeter */}
          <div
            className="flex items-center gap-4 hover:cursor-pointer"
            onClick={() => goDevices("electricmeter")}
          >
            <img src={solarImage} alt="" width={36} />
            <span>
              {labelElectric}{" "}
              <span className="text-red-500 font-semibold">
                {mergedCounts.electricMeter}
              </span>
            </span>
          </div>
        </li>

        <li className="flex gap-4 justify-around">
          {/* Air Sensor → /devices?type=airsensor */}
          <div
            className="flex items-center gap-4 hover:cursor-pointer"
            onClick={() => goDevices("airsensor")}
          >
            <img src={windImage} alt="" width={36} />
            <span>
              {labelAir}{" "}
              <span className="text-red-500 font-semibold">
                {mergedCounts.airSensor}
              </span>
            </span>
          </div>

          {/* ZYTA → no action */}
          <div className="flex items-center gap-4">
            <img src={alertCyan} alt="" width={36} />
            <span>
              {labelAlert}{" "}
              <span className="text-red-500 font-semibold">
                {mergedCounts.zyta}
              </span>
            </span>
          </div>
        </li>
      </ul>
    </form>
  );
}
