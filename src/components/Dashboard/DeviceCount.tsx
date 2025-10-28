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
  // const titleCameras = t("devices.cameras", { defaultValue: "Cameras" });
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

  // Defaults: all 0 (real values can override via props.counts)
  const mergedCounts: DeviceCounts = {
    cameras: 0,
    intercom: 0,
    waterMeter: 0,
    electricMeter: 0,
    airSensor: 0,
    zyta: 0,
    ...(counts || {}),
  } as DeviceCounts;

  // Per-type status placeholders (keep style; values can be wired later)
  const statusByType = {
    cameras: { on: 0, off: 0 },
    intercom: { on: 0, off: 0 },
    waterMeter: { on: 0, off: 0 },
    electricMeter: { on: 0, off: 0 },
    airSensor: { on: 0, off: 0 },
    zyta: { on: 0, off: 0 },
  } as const;

  // คำนวณเปอร์เซ็นต์ออนไลน์จริงจากค่า on/off รวมทั้งหมด
  const donut = (() => {
    // รวมสถานะจาก props ถ้ามี ไม่งั้น fallback เป็น 0
    const fallbackOn = 0;
    const fallbackOff = 0;
    const on = typeof onlineCount === "number" ? onlineCount : fallbackOn;
    const oc = typeof offlineCount === "number" ? offlineCount : fallbackOff;
    const sumRaw = Math.max(0, on + oc);
    // ถ้าให้ offlinePercent มา ให้คิด online = 100 - offlinePercent
    const pctOnline =
      typeof offlinePercent === "number"
        ? Math.max(0, Math.min(100, 100 - offlinePercent))
        : sumRaw === 0
        ? 0
        : (on / sumRaw) * 100;
    return { on, oc, pct: pctOnline, sum: sumRaw };
  })();

  return (
    <form className="flex flex-col gap-3 hover:cursor-default">
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        {titleDevices}
      </h1>

      <div className="flex">
        <RadialBar
          key={`radial-offline-${langKey}`} // ← บังคับ remount เมื่อภาษาเปลี่ยน
          value={donut.pct}
          label={labelOnline}
          mainColor="#A9DB4E"
          primaryColor="#FB3F3F"
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
          <h1 className="text-[24px] font-semibold">{/* {titleCameras} */}</h1>

          <div className="flex gap-2 flex-wrap">
            <div className="flex flex-col w-[70px] h-[60px] bg-[#F8FBFE] text-[#39B8EE] rounded-[10px] justify-center items-center gap-1">
              <DonutLegend
                items={[{ label: labelOffline, color: "#FB3F3F" }]}
                labelClassName="text-[#39B8EE] text-[13px]"
              />
              <h1 className="text-[18px] font-semibold">{donut.oc}</h1>
            </div>

            <div className="flex flex-col w-[70px] h-[60px] bg-[#F8FBFE] text-[#39B8EE] rounded-[10px] justify-center items-center gap-1">
              <DonutLegend
                items={[{ label: labelOnline, color: "#A9DB4E" }]}
                labelClassName="text-[#39B8EE] text-[13px]"
              />
              <h1 className="text-[18px] font-semibold">{donut.on}</h1>
            </div>
          </div>

          <h1 className="mt-2 lg:text-[24px] md:text-[18px] whitespace-nowrap font-semibold text-[#1E1E1E]">
            {titleTotal} <span>{donut.sum}</span>
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
            <span className="flex flex-col leading-tight">
              <span>
                {labelCameraCount}{" "}
                <span className="text-black font-semibold">
                  {mergedCounts.cameras}
                </span>
              </span>
              <span>
                <span className="text-gray-500">(</span>
                <span className="text-green-600 font-semibold">{statusByType.cameras.on}</span>
                <span className="text-gray-500">/</span>
                <span className="text-red-500 font-semibold">{statusByType.cameras.off}</span>
                <span className="text-gray-500">)</span>
              </span>
            </span>
          </div>

          {/* Intercom → /devices?type=intercom */}
          <div
            className="flex items-center gap-4 hover:cursor-pointer"
            onClick={() => goDevices("intercom")}
          >
            <img src={intercomeImage} alt="" width={36} />
            <span className="flex flex-col leading-tight">
              <span>
                {labelIntercom}{" "}
                <span className="text-black font-semibold">
                  {mergedCounts.intercom}
                </span>
              </span>
              <span>
                <span className="text-gray-500">(</span>
                <span className="text-green-600 font-semibold">{statusByType.intercom.on}</span>
                <span className="text-gray-500">/</span>
                <span className="text-red-500 font-semibold">{statusByType.intercom.off}</span>
                <span className="text-gray-500">)</span>
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
            <span className="flex flex-col leading-tight">
              <span>
                {labelWater}{" "}
                <span className="text-black font-semibold">
                  {mergedCounts.waterMeter}
                </span>
              </span>
              <span>
                <span className="text-gray-500">(</span>
                <span className="text-green-600 font-semibold">{statusByType.waterMeter.on}</span>
                <span className="text-gray-500">/</span>
                <span className="text-red-500 font-semibold">{statusByType.waterMeter.off}</span>
                <span className="text-gray-500">)</span>
              </span>
            </span>
          </div>

          {/* Electric Meter → /devices?type=electricmeter */}
          <div
            className="flex items-center gap-4 hover:cursor-pointer"
            onClick={() => goDevices("electricmeter")}
          >
            <img src={solarImage} alt="" width={36} />
            <span className="flex flex-col leading-tight">
              <span>
                {labelElectric}{" "}
                <span className="text-black font-semibold">
                  {mergedCounts.electricMeter}
                </span>
              </span>
              <span>
                <span className="text-gray-500">(</span>
                <span className="text-green-600 font-semibold">{mergedCounts.electricMeter}</span>
                <span className="text-gray-500">/</span>
                <span className="text-red-500 font-semibold">{statusByType.electricMeter.off}</span>
                <span className="text-gray-500">)</span>
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
            <span className="flex flex-col leading-tight">
              <span>
                {labelAir}{" "}
                <span className="text-black font-semibold">
                  {mergedCounts.airSensor}
                </span>
              </span>
              <span>
                <span className="text-gray-500">(</span>
                <span className="text-green-600 font-semibold">{statusByType.airSensor.on}</span>
                <span className="text-gray-500">/</span>
                <span className="text-red-500 font-semibold">{statusByType.airSensor.off}</span>
                <span className="text-gray-500">)</span>
              </span>
            </span>
          </div>

          {/* ZYTA → no action */}
          <div className="flex items-center gap-4">
            <img src={alertCyan} alt="" width={36} />
            <span className="flex flex-col leading-tight">
              <span>
                {labelAlert}{" "}
                <span className="text-black font-semibold">
                  {mergedCounts.zyta}
                </span>
              </span>
              <span>
                <span className="text-gray-500">(</span>
                <span className="text-green-600 font-semibold">{statusByType.zyta.on}</span>
                <span className="text-gray-500">/</span>
                <span className="text-red-500 font-semibold">{statusByType.zyta.off}</span>
                <span className="text-gray-500">)</span>
              </span>
            </span>
          </div>
        </li>
      </ul>
    </form>
  );
}
