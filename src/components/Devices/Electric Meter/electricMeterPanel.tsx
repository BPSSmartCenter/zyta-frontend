import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../../Dropdown";
import Thermostat from "../../Themorstats";
import boltWhiteIcon from "../../../assets/bolt.png";
import voltageIcon from "../../../assets/Voltage.png";
import IletterIcon from "../../../assets/i.png";
import plugIcon from "../../../assets/plug-cable.png";
import waterSupplieIcon from "../../../assets/water-supply.png";
import wavesineIcon from "../../../assets/wave-sine.png";
import transformIcon from "../../../assets/transformer-bolt.png";
import plugWhiteIcon from "../../../assets/plug.png";
import { ElectricRadialBasic } from "../../RadialBar";
import { ElectricLineBasicChart } from "../../Chart";
import {
  ELECTRIC_DAYS,
  ELECTRIC_CONVERSIONS_LIST,
  ELECTRIC_DAY_SERIES,
  type ElectricDay,
} from "../devices.constant";

type Props = {
  timeRange?: { from: string; to: string };
};

type CardValueProps = {
  img: string;
  value: number | string;
  valueLabel: string;
  valueLabel2: string;
  onClick?: () => void; // ← เพิ่มสำหรับคลิก
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
      className="bg-cyan rounded-lg w-[139px] md:w-[145px] h-[190px] p-5 flex flex-col text-white gap-2 select-none cursor-pointer hover:brightness-90 transition"
      onClick={onClick}
    >
      <div className="bg-white w-[48px] rounded-full ">
        <img src={img} className="p-3 w-full" alt="" />
      </div>
      <h1 className="text-[24px] font-bold">{value}</h1>
      <span>
        {valueLabel} <p>{valueLabel2}</p>
      </span>
    </div>
  );
}

function SideCardValue({ img, value, valueLabel, unit }: SideCardValueProps) {
  return (
    <div className="font-poppins flex flex-col flex-1 text-center items-center justify-center p-5 bg-white w-full min-h-[100px] rounded-lg gap-5 select-none">
      <div>
        <h1 className="text-gray-600 text-[20px]">{valueLabel}</h1>
        <p className="text-gray-600 font-bold text-[30px] whitespace-nowrap">
          {formatWithComma(value)} <span>{unit}</span>
        </p>
      </div>
      <div className="rounded-full bg-[#A9DB4E]">
        <img src={img} className="p-5 w-[90px]" alt="" />
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

export default function ElectricMeterPanel(_: Props) {
  const { t } = useTranslation("devices");

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

  // ค่าเริ่มต้นให้เหมือนเดิม
  const [fromTime, setFromTime] = useState<string>("09:30 PM");
  const [toTime, setToTime] = useState<string>("01:30 AM");
  const [selected, setSelected] = useState<ElectricDay>("Sun");

  // ✅ state เฉพาะ Thermostat ตัวแรก (ซ้าย)
  const [thermoOne, setThermoOne] = useState<{
    initialValue: number;
    valueLabel: string;
    maxLabel: string;
  }>({
    initialValue: 0.5,
    valueLabel: "kWh",
    maxLabel: "",
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
                    {selected?.label ?? t("devices.electric.selectTime")}
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
              {t("devices.electric.to")}
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
                    {selected?.label ?? t("devices.electric.selectTime")}
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
            <div className="flex flex-col items-center gap-20">
              {/* ✅ รี-mount เมื่อค่าเปลี่ยน */}
              <Thermostat
                key={`${thermoOne.initialValue}-${thermoOne.valueLabel}-${thermoOne.maxLabel}`}
                initialValue={thermoOne.initialValue}
                max={220}
                maxLabel={thermoOne.maxLabel}
                valueLabel={thermoOne.valueLabel}
              />
            </div>

            <div className="flex flex-col items-center gap-20">
              <Thermostat
                initialValue={24}
                max={50}
                maxLabel={""}
                valueLabel={`🌢 26%`}
                unit="°c"
              />
            </div>
          </div>

          {/* value cards */}
          <div className="flex flex-wrap gap-4">
            {[
              {
                img: voltageIcon,
                value: 220,
                valueLabel: t("devices.electric.cards.voltage"),
                valueLabel2: t("devices.electric.units.volt"),
              },
              {
                img: plugIcon,
                value: 0.5,
                valueLabel: t("devices.electric.cards.consumption"),
                valueLabel2: t("devices.electric.units.kwh"),
              },
              {
                img: transformIcon,
                value: 0.6,
                valueLabel: t("devices.electric.cards.accumulated"),
                valueLabel2: t("devices.electric.units.kwh"),
              },
              {
                img: IletterIcon,
                value: 220,
                valueLabel: t("devices.electric.cards.current"),
                valueLabel2: t("devices.electric.units.amp"),
              },
              {
                img: wavesineIcon,
                value: 10,
                valueLabel: t("devices.electric.cards.frequency"),
                valueLabel2: t("devices.electric.units.hz"),
              },
              {
                img: waterSupplieIcon,
                value: 7.1,
                valueLabel: t("devices.electric.cards.humidity"),
                valueLabel2: t("devices.electric.units.gm3"),
              },
            ].map((kpi, idx) => (
              <CardValue
                key={idx}
                img={kpi.img}
                value={kpi.value}
                valueLabel={kpi.valueLabel}
                valueLabel2={kpi.valueLabel2}
                onClick={() =>
                  setThermoOne({
                    initialValue: toNumber(kpi.value),
                    valueLabel: kpi.valueLabel,
                    maxLabel: kpi.valueLabel2,
                  })
                }
              />
            ))}
          </div>
        </div>

        <div className="col-span-1 flex flex-wrap flex-row lg-1355:flex-col gap-3 ">
          {[
            {
              img: plugWhiteIcon,
              value: 0.45,
              valueLabel: t("devices.electric.side.today"),
              unit: t("devices.electric.side.unitKwh"),
            },
            {
              img: boltWhiteIcon,
              value: 930773,
              valueLabel: t("devices.electric.side.month"),
              unit: t("devices.electric.side.unitKwh"),
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

      <div className="bg-white rounded-xl p-6">
        {/* แถบรายวัน + วง Radial */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {ELECTRIC_CONVERSIONS_LIST.map((v, i) => {
            const day = ELECTRIC_DAYS[i];
            const isActive = selected === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                className={[
                  "flex flex-col hover: text-left border-b transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50 cursor-pointer ",
                  isActive
                    ? "border-b-2 border-cyan"
                    : "border-b border-transparent",
                ].join(" ")}
              >
                <span className="text-xl font-semibold mb-1">{day}</span>
                <div className="flex items-center gap-4 pb-2">
                  <div className="flex flex-col text-center">
                    <h1 className="text-sm text-gray-400">Conversion</h1>
                    <p className="text-2xl font-bold">{v}%</p>
                  </div>
                  <ElectricRadialBasic value={v} />
                </div>
              </button>
            );
          })}
        </div>

        {/* กราฟเส้นเปลี่ยนตามวัน */}
        <ElectricLineBasicChart
          key={selected}
          series={ELECTRIC_DAY_SERIES[selected]}
        />
      </div>
    </>
  );
}
