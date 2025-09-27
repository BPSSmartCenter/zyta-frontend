// src/components/Devices/Water/waterMeterPanel.tsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../../Dropdown";
import Thermostat from "../../Themorstats";
import phWaterDrop from "../../../assets/phWaterDrop.png";
import waterIcon from "../../../assets/Water.png";
import TDSIcon from "../../../assets/TDS.png";
import waterDrop from "../../../assets/waterDrop.png";
import waterECIcon from "../../../assets/waterECDrop.png";
import { WaterStackedChart, WaterAreaStackedChart } from "../../Chart";
import { WaterMultiRadial } from "../../RadialBar";

type Props = {
  timeRange?: { from: string; to: string };
};

type CardValueProps = {
  img: string;
  value: number | string;
  valueLabel: string;
  valueLabel2?: string;
  onClick?: () => void; // ← เพิ่มเพื่อคลิกแล้วอัปเดต Thermostat
};

type SideCardValueProps = {
  img: string;
  valueLabel: string;
  value: number | string;
  unit: string;
};

function formatWithComma(v: number | string) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : v;
}

function CardValue({
  img,
  value,
  valueLabel,
  valueLabel2,
  onClick,
}: CardValueProps) {
  return (
    <div
      className="bg-cyan rounded-lg w-[180px] h-[190px] p-5 flex flex-col text-white gap-2 cursor-pointer hover:brightness-90 transition"
      onClick={onClick}
    >
      <div className="bg-white w-[50px] rounded-full ">
        <img src={img} className="p-3 w-full" alt="" />
      </div>
      <h1 className="text-[24px] font-bold">{value}</h1>
      <span>
        {valueLabel} {valueLabel2 ? <p>{valueLabel2}</p> : null}
      </span>
    </div>
  );
}

function SideCardValue({ img, value, valueLabel, unit }: SideCardValueProps) {
  return (
    <div className="flex flex-1 items-center p-5 bg-white w-full h-[100px] rounded-lg gap-5">
      <div className="w-[57px] rounded-full bg-[#A9DB4E]">
        <img src={img} className="p-2" alt="" />
      </div>
      <div>
        <h1 className="text-gray-400 text-[14px]">{valueLabel}</h1>
        <p className="font-bold text-[21px] whitespace-nowrap">
          {formatWithComma(value)} <span>{unit}</span>
        </p>
      </div>
    </div>
  );
}

// ------- helpers สำหรับ time dropdown -------
const formatTime = (h: number, m: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = (h % 12 || 12).toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${hh}:${mm} ${ampm}`;
};

export default function WaterMeterPanel(_: Props) {
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

  // ✅ state สำหรับ Thermostat ซ้าย/ขวา (อันละชุด)
  const [thermoLeft, setThermoLeft] = useState<{
    initialValue: number;
    valueLabel: string;
    maxLabel: string;
  }>({
    initialValue: 2000,
    valueLabel: t("devices.waterMeter.domesticWater"),
    maxLabel: t("devices.waterMeter.ofMl", { max: 3000 }) as string,
  });

  const [thermoRight, setThermoRight] = useState<{
    initialValue: number;
    valueLabel: string;
    maxLabel: string;
  }>({
    initialValue: 2000,
    valueLabel: t("devices.waterMeter.drinkingWater"),
    maxLabel: t("devices.waterMeter.ofMl", { max: 3000 }) as string,
  });

  const toNumber = (v: number | string) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

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
            {/* ซ้าย */}
            <div className="flex flex-col items-center gap-20">
              <Thermostat
                key={`${thermoLeft.initialValue}-${thermoLeft.valueLabel}-${thermoLeft.maxLabel}`}
                initialValue={thermoLeft.initialValue}
                max={3000}
                maxLabel={thermoLeft.maxLabel}
                valueLabel={thermoLeft.valueLabel}
              />

              <div className="flex gap-5">
                {[
                  {
                    img: phWaterDrop,
                    value: 10,
                    valueLabel: t("devices.waterMeter.ph"),
                  },
                  {
                    img: waterIcon,
                    value: 200,
                    valueLabel: t("devices.waterMeter.flowRate"),
                    valueLabel2: t("devices.waterMeter.flowRateUnit"),
                  },
                ].map((kpi, idx) => (
                  <CardValue
                    key={idx}
                    img={kpi.img}
                    value={kpi.value}
                    valueLabel={kpi.valueLabel}
                    valueLabel2={kpi.valueLabel2}
                    onClick={() =>
                      setThermoLeft({
                        initialValue: toNumber(kpi.value),
                        valueLabel: kpi.valueLabel,
                        maxLabel: kpi.valueLabel2 ?? "",
                      })
                    }
                  />
                ))}
              </div>
            </div>

            {/* ขวา */}
            <div className="flex flex-col items-center gap-20">
              <Thermostat
                key={`${thermoRight.initialValue}-${thermoRight.valueLabel}-${thermoRight.maxLabel}`}
                initialValue={thermoRight.initialValue}
                max={3000}
                maxLabel={thermoRight.maxLabel}
                valueLabel={thermoRight.valueLabel}
              />

              <div className="flex gap-5">
                {[
                  {
                    img: phWaterDrop,
                    value: 10,
                    valueLabel: t("devices.waterMeter.ph"),
                  },
                  {
                    img: TDSIcon,
                    value: 80,
                    valueLabel: t("devices.waterMeter.tds"),
                    valueLabel2: t("devices.waterMeter.tdsUnit"),
                  },
                ].map((kpi, idx) => (
                  <CardValue
                    key={idx}
                    img={kpi.img}
                    value={kpi.value}
                    valueLabel={kpi.valueLabel}
                    valueLabel2={kpi.valueLabel2}
                    onClick={() =>
                      setThermoRight({
                        initialValue: toNumber(kpi.value),
                        valueLabel: kpi.valueLabel,
                        maxLabel: kpi.valueLabel2 ?? "",
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 flex flex-wrap flex-row lg-1355:flex-col gap-3 ">
          {[
            {
              img: waterDrop,
              value: 1500,
              valueLabel: t("devices.waterMeter.waterToday"),
              unit: t("devices.waterMeter.literUnit"),
            },
            {
              img: waterDrop,
              value: 1500,
              valueLabel: t("devices.waterMeter.waterToday"),
              unit: t("devices.waterMeter.literUnit"),
            },
            {
              img: waterECIcon,
              value: 150000,
              valueLabel: t("devices.waterMeter.monthUsage"),
              unit: t("devices.waterMeter.literUnit"),
            },
            {
              img: waterDrop,
              value: 1500,
              valueLabel: t("devices.waterMeter.waterToday"),
              unit: t("devices.waterMeter.literUnit"),
            },
            {
              img: waterDrop,
              value: 1500,
              valueLabel: t("devices.waterMeter.waterToday"),
              unit: t("devices.waterMeter.literUnit"),
            },
            {
              img: waterDrop,
              value: 1500,
              valueLabel: t("devices.waterMeter.waterToday"),
              unit: t("devices.waterMeter.literUnit"),
            },
          ].map((kpi, idx) => (
            <SideCardValue
              key={idx}
              img={kpi.img}
              valueLabel={kpi.valueLabel}
              value={kpi.value}
              unit={kpi.unit}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-6">
        <div className="col-span-6 sm-560:col-span-4">
          <WaterStackedChart
            height={460}
            title={t("devices.waterMeter.chart.title")}
          />
        </div>
        <div className="flex col-span-6 sm-560:col-span-2 justify-center items-center">
          <WaterMultiRadial
            height={240}
            total={1000}
            values={[88, 62, 38]}
            labels={["series1", "series2", "series3"]}
            className="p-0 m-0"
          />
        </div>
      </div>

      <div className="mt-6">
        <WaterAreaStackedChart
          yTitle={t("devices.waterMeter.chart.yTitle")}
          height={340}
        />
      </div>
    </>
  );
}
