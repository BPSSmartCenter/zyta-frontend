import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../../Dropdown";
import Thermostat from "../../Themorstats";
import ThermostatAir from "../../ThermostatAir";
import waterDrop from "../../../assets/waterDrop.png";
import SearchInput from "../../SearchInput";
import { windSelected } from "../../../assets";
import { cloudyDay1 } from "../../../assets/index";

type Props = {
  timeRange?: { from: string; to: string };
};

type CardValueProps = {
  img?: string;
  imgLabel?: string;
  value: number | string;
  valueLabel: string;
  valueLabel2?: string;
  onClick?: () => void; // ← รับคลิกจาก parent
};

// type SideCardValueProps = {
//   img: string;
//   valueLabel: string;
//   value: number | string;
//   unit: string;
// };

// function formatWithComma(v: number | string) {
//   const n = typeof v === "number" ? v : Number(v);
//   return Number.isFinite(n) ? n.toLocaleString("en-US") : v;
// }

function CardValue({
  img,
  imgLabel,
  value,
  valueLabel,
  valueLabel2,
  onClick,
}: CardValueProps) {
  const showImage = !!img; // true ถ้ามี path รูปที่ไม่ใช่ค่าว่าง

  return (
    <div
      className="bg-cyan rounded-lg w-[180px] h-[190px] p-5 flex flex-col text-white gap-2 cursor-pointer hover:brightness-90 transition"
      onClick={onClick}
    >
      {showImage ? (
        <div className="bg-white w-[50px] rounded-full">
          <img src={img} className="p-3 w-full" alt={imgLabel ?? ""} />
        </div>
      ) : (
        // กรณีไม่มีรูป — แสดงข้อความแทน และล็อกขนาดให้เป็นวงกลม 50x50
        <div className="select-none bg-white w-[50px] h-[50px] rounded-full flex items-center justify-center">
          <span className="text-[15px] font-bold text-[#A9DB4E] text-center px-1">
            {imgLabel ?? ""}
          </span>
        </div>
      )}

      <h1 className="text-[24px] font-bold select-none">{value}</h1>
      <span className="select-none">
        {valueLabel} {valueLabel2 ? <p>{valueLabel2}</p> : null}
      </span>
    </div>
  );
}

// function SideCardValue({ img, value, valueLabel, unit }: SideCardValueProps) {
//   return (
//     <div className="flex flex-1 items-center p-5 bg-white w-full h-[100px] rounded-lg gap-5">
//       <div className="w-[57px] rounded-full bg-[#A9DB4E]">
//         <img src={img} className="p-2" alt="" />
//       </div>
//       <div>
//         <h1 className="text-gray-400 text-[14px]">{valueLabel}</h1>
//         <p className="font-bold text-[21px] whitespace-nowrap">
//           {formatWithComma(value)} <span>{unit}</span>
//         </p>
//       </div>
//     </div>
//   );
// }

// ------- helpers สำหรับ time dropdown -------
const formatTime = (h: number, m: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = (h % 12 || 12).toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${hh}:${mm} ${ampm}`;
};

// ───── Icons ในไฟล์ (ไม่พึ่ง asset อื่น) ─────
function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 22s-7-8.5-7-13a7 7 0 1 1 14 0c0 4.5-7 13-7 13Zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function WeatherEmoji() {
  // ไอคอนอากาศแบบ CSS ให้คล้ายภาพตัวอย่าง
  return (
    <div className="relative w-[200px] h-[160px]">
      <img src={cloudyDay1} className="w-full" alt="" />;
    </div>
  );
}

export default function AirPanel(_: Props) {
  const { t } = useTranslation("devices"); // ใช้คีย์แบบ devices.waterMeter.*

  // options ทุก 30 นาที
  const timeOptions = useMemo(
    () =>
      Array.from({ length: 24 * 2 }, (_, i) => {
        const h = Math.floor(i / 2);
        const m = (i % 2) * 30;
        const label = formatTime(h, m);
        return { label, value: label };
      }),
    []
  );

  // ค่าเริ่มต้นให้เหมือนภาพ
  const [fromTime, setFromTime] = useState<string>("09:30 PM");
  const [toTime, setToTime] = useState<string>("01:30 AM");

  // ✅ state สำหรับควบคุม ThermostatAir ตามการเลือก CardValue
  const [airConfig, setAirConfig] = useState<{
    valueLabel: string;
    initialValue: number;
    maxLabel: string;
  }>({
    valueLabel: "PM 2.5",
    initialValue: 10,
    maxLabel: "µg/m³",
  });

  // ✅ helper ปลอดภัยสำหรับแปลง value เป็น number
  const toNumber = (v: number | string): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ✅ data ของการ์ด KPI (valueCard)
  const kpis = [
    {
      img: "",
      imgLabel: "PM 2.5",
      value: 10,
      valueLabel: "PM 2.5",
      valueLabel2: "µg/m³",
    },
    {
      img: "",
      imgLabel: "PM 10",
      value: 10,
      valueLabel: "PM 10",
      valueLabel2: "µg/m³",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 lg-1355:grid-cols-5 gap-3 mt-6">
        <div className="col-span-5 lg-1355:col-span-4 flex flex-col justify-center items-center bg-white rounded-xl gap-10 p-6">
          {/* ───── Time Range (Dropdown x2) ───── */}
          <div className="flex items-center gap-3">
            {/* From */}
            <Dropdown
              options={timeOptions}
              value={fromTime}
              onChange={(val) => setFromTime(val)}
            >
              {({
                selected,
                open,
                getButtonProps,
                getMenuProps,
                getItemProps,
                options,
              }) => (
                <div className="relative">
                  <button
                    {...getButtonProps({
                      className:
                        "px-3 py-2 rounded-lg bg-[#F6FBFF] text-cyan font-semibold text-sm shadow-sm hover:bg-cyan-300 hover:text-white cursor-pointer transition-all duration-300",
                    })}
                  >
                    {selected?.label ?? t("devices.waterMeter.selectTime")}
                  </button>

                  {open && (
                    <div
                      {...getMenuProps({
                        className:
                          "absolute z-10 mt-2 max-h-64 w-27 overflow-auto rounded-md bg-white ring-1 ring-black/5 shadow-lg p-1",
                      })}
                    >
                      {options.map((opt) => (
                        <button
                          key={opt.value}
                          {...getItemProps(opt, {
                            className:
                              "w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm cursor-pointer",
                          })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Dropdown>

            <span className="text-cyan font-semibold text-sm select-none">
              {t("devices.waterMeter.to")}
            </span>

            {/* To */}
            <Dropdown
              options={timeOptions}
              value={toTime}
              onChange={(val) => setToTime(val)}
            >
              {({
                selected,
                open,
                getButtonProps,
                getMenuProps,
                getItemProps,
                options,
              }) => (
                <div className="relative">
                  <button
                    {...getButtonProps({
                      className:
                        "px-3 py-2 rounded-lg bg-[#F6FBFF] text-cyan font-semibold text-sm shadow-sm hover:bg-cyan-300 hover:text-white cursor-pointer transition-all duration-300",
                    })}
                  >
                    {selected?.label ?? t("devices.waterMeter.selectTime")}
                  </button>

                  {open && (
                    <div
                      {...getMenuProps({
                        className:
                          "absolute z-10 mt-2 max-h-64 w-27 overflow-auto rounded-md bg-white ring-1 ring-black/5 shadow-lg p-1",
                      })}
                    >
                      {options.map((opt) => (
                        <button
                          key={opt.value}
                          {...getItemProps(opt, {
                            className:
                              "w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm cursor-pointer",
                          })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Dropdown>
          </div>
          {/* ──────────────────────────────────── */}

          <div className="flex flex-col md:flex-row w-full justify-around gap-10 lg:gap-0">
            <div className="flex flex-col items-center gap-14">
              {/* ใช้ key เพื่อให้ re-mount เมื่อค่าจาก CardValue เปลี่ยน */}
              <ThermostatAir
                key={`${airConfig.valueLabel}-${airConfig.initialValue}-${airConfig.maxLabel}`}
                unit=""
                initialValue={airConfig.initialValue}
                maxLabel={airConfig.maxLabel}
                valueLabel={airConfig.valueLabel}
                medium={25}
                high={50}
              />
            </div>

            <div className="flex flex-col items-center gap-20">
              <Thermostat
                initialValue={24}
                max={50}
                maxLabel={""}
                valueLabel={`🌢 62%`}
                unit="°c"
              />
            </div>
          </div>

          {/* valueCards */}
          <div className="flex gap-5">
            {kpis.map((kpi, idx) => (
              <CardValue
                key={idx}
                img={kpi.img}
                imgLabel={kpi.imgLabel}
                value={kpi.value}
                valueLabel={kpi.valueLabel}
                valueLabel2={kpi.valueLabel2}
                onClick={() =>
                  setAirConfig({
                    valueLabel: kpi.valueLabel,
                    initialValue: toNumber(kpi.value),
                    maxLabel: kpi.valueLabel2 ?? "",
                  })
                }
              />
            ))}
          </div>
        </div>

        {/* ───────────────────────────────
            ► Sidebar ขวา: Search + การ์ดอากาศ
        ─────────────────────────────── */}
        <div className="col-span-1 flex flex-wrap flex-row lg-1355:flex-col gap-3">
          {/* Search */}
          <SearchInput placeholder="Search" className="w-full" />

          {/* การ์ดใหญ่ */}
          <div className="w-full rounded-xl p-5 text-white bg-gradient-to-b from-[#35C3F3] to-[#29A7E7] relative">
            {/* location pill */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-[#29A7E7]">
                <PinIcon className="w-3 h-3" />
              </span>
              <span className="text-[12px]">Lebak, Bangkok</span>
            </div>

            {/* icon + data */}
            <div className="mt-2 flex flex-col items-center">
              <WeatherEmoji />
              <p className="mt-0 text-white/90 text-sm">
                Today, 14 December 2024
              </p>
              <p className="mt-1 text-[56px] leading-none font-bold">36°</p>
              <p className="mt-1 text-white/90">Sunny</p>

              {/* wind & hum */}
              <div className="mt-6 flex flex-col gap-3 text-white/95">
                <div className="flex items-center gap-2">
                  <img src={windSelected} className="w-5 h-5" alt="" />
                  <span className="text-sm">Wind</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src={waterDrop} className="w-4 h-4" alt="" />
                  <span className="text-sm">Hum</span>
                  <span className="opacity-70">|</span>
                  <span className="text-sm">13%</span>
                </div>
              </div>
            </div>
          </div>

          {/* การ์ดเล็ก #1 (ฟ้า) */}
          <div className="w-full rounded-xl p-4 text-white bg-gradient-to-b from-[#35C3F3] to-[#29A7E7]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <img src={windSelected} className="w-5 h-5" alt="" />
                  <div className="text-sm flex items-center justify-center gap-2">
                    <div className="leading-none">Wind</div>
                    <div>|</div>
                    <div className="text-white/90 text-xs">22km/h</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <img src={waterDrop} className="w-5 h-5" alt="" />
                  <div className="text-sm flex items-center justify-center gap-2">
                    <div className="leading-none">Hum</div>
                    <div>|</div>
                    <div className="text-white/90 text-xs">13%</div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 justify-end text-white/90 text-sm">
                  <PinIcon className="w-4 h-4" />
                  <span>Bangkok</span>
                </div>
                <div className="text-3xl font-bold leading-none mt-1">36°</div>
              </div>
            </div>
          </div>

          {/* การ์ดเล็ก #2 (เหลือง) */}
          <div className="w-full rounded-xl p-4 text-white bg-gradient-to-b from-[#FEC84E] to-[#F59E0B]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <img src={windSelected} className="w-5 h-5" alt="" />
                  <div className="text-sm flex items-center justify-center gap-2">
                    <div className="leading-none">Wind</div>
                    <div>|</div>
                    <div className="text-white/90 text-xs">18km/h</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <img src={waterDrop} className="w-5 h-5" alt="" />
                  <div className="text-sm flex items-center justify-center gap-2">
                    <div className="leading-none">Hum</div>
                    <div>|</div>
                    <div className="text-white/90 text-xs">18%</div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 justify-end text-white/90 text-sm">
                  <PinIcon className="w-4 h-4" />
                  <span>Phuket</span>
                </div>
                <div className="text-3xl font-bold leading-none mt-1">44°</div>
              </div>
            </div>
          </div>
        </div>
        {/* ─────────────────────────────── */}
      </div>
    </>
  );
}
