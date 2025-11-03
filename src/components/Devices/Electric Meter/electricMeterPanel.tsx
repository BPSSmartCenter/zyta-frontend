import React, { useMemo, useState } from "react";
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
import { useFilters } from "../../../context/FiltersContext";
import {
  ELECTRIC_DAYS,
  ELECTRIC_CONVERSIONS_LIST,
  ELECTRIC_DAY_SERIES,
  type ElectricDay,
} from "../devices.constant";

type Props = {
  siteCode?: string;
  timeRange?: { from: string; to: string };
};

type CardValueProps = {
  img: string;
  value: number | string;
  valueLabel: string;
  valueLabel2: string;
  onClick?: () => void; // โ เน€เธเธดเนเธกเธชเธณเธซเธฃเธฑเธเธเธฅเธดเธ
};

type SideCardValueProps = {
  img: string;
  valueLabel: string;
  value: number | string;
  unit: string;
};

function formatWithComma(v: number | string) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : v;
}

function CardValue({
  img,
  value,
  valueLabel,
  valueLabel2,
  onClick,
}: CardValueProps) {
  const toNum = (x: number | string) =>
    Number.isFinite(Number(x)) ? Number(x) : 0;
  const shown = formatWithComma(Math.round(toNum(value)));
  return (
    <div
      className="bg-cyan rounded-lg w-[139px] md:w-[145px] h-[190px] p-5 flex flex-col text-white gap-2 select-none cursor-pointer hover:brightness-90 transition"
      onClick={onClick}
    >
      <div className="bg-white w-[48px] rounded-full ">
        <img src={img} className="p-3 w-full" alt="" />
      </div>
      <h1 className="text-[24px] font-bold">{shown}</h1>
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

// ------- helpers เธชเธณเธซเธฃเธฑเธ time dropdown -------
const formatTime = (h: number, m: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = (h % 12 || 12).toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${hh}:${mm} ${ampm}`;
};

import { getInverterTelemetry } from "../../../api/solaredge";

export default function ElectricMeterPanel({ siteCode }: Props) {
  const { selectedSite, date: filtersDate } = useFilters();
  const { t } = useTranslation("devices");

  // options เธ—เธธเธ 30 เธเธฒเธ—เธต
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

  // เธเนเธฒเน€เธฃเธดเนเธกเธ•เนเธเนเธซเนเน€เธซเธกเธทเธญเธเน€เธ”เธดเธก
  const [fromTime, setFromTime] = useState<string>("09:30 PM");
  const [toTime, setToTime] = useState<string>("01:30 AM");
  const [selected, setSelected] = useState<ElectricDay>("Sun");
  // Compute ISO date range from selected day/time (use selected date)
  const computeRange = React.useCallback(() => {
    const base = (typeof filtersDate === "object" && filtersDate) ? new Date(filtersDate.y, (filtersDate.m||1)-1, filtersDate.d||1) : new Date();
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    const to24 = (s: string) => {
      const m = /^(\d{2}):(\d{2})\s*(AM|PM)$/i.exec(s.trim());
      if (!m) return "00:00";
      let h = parseInt(m[1], 10);
      const min = m[2];
      const ap = m[3].toUpperCase();
      if (ap === "PM" && h !== 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${min}`;
    };
    const from = `${yyyy}-${mm}-${dd} ${to24(fromTime)}:00`;
    let to = `${yyyy}-${mm}-${dd} ${to24(toTime)}:00`;
    // handle overnight (to past midnight): if to <= from, add 1 day to to-date
    const fromObj = new Date(`${yyyy}-${mm}-${dd}T${to24(fromTime)}:00`);
    const toObj = new Date(`${yyyy}-${mm}-${dd}T${to24(toTime)}:00`);
    if (toObj.getTime() <= fromObj.getTime()) {
      const d = new Date(base); d.setDate(d.getDate() + 1);
      const yy = d.getFullYear(); const mm2 = String(d.getMonth()+1).padStart(2,"0"); const dd2 = String(d.getDate()).padStart(2,"0");
      to = `${yy}-${mm2}-${dd2} ${to24(toTime)}:00`;
    }
    return { from, to };
  }, [fromTime, toTime]);

  // fetched data

  // โ… state เน€เธเธเธฒเธฐ Thermostat เธ•เธฑเธงเนเธฃเธ (เธเนเธฒเธข)
  const [thermoOne, setThermoOne] = useState<{
    initialValue: number;
    valueLabel: string;
    maxLabel: string;
  }>({
    initialValue: 0,
    valueLabel: t("devices.electric.side.unitKwh"),
    maxLabel: "",
  });

  const toNumber = (v: number | string) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  // SolarEdge telemetry + computed metrics
  const [telemetries, setTelemetries] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    voltage: 0,
    current: 0,
    frequency: 0,
    consumptionKwh: 0,
    lifetimeKwh: 0,
    monthKwh: 0,
  });
  const seKey = (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('seKey') || new URLSearchParams(window.location.search).get('api_key') : null) || (import.meta as any).env?.VITE_SOLAREDGE_API_KEY;
  const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlStartTime = qs?.get('startTime') || undefined;
  // const urlEndTime = qs?.get('endTime') || undefined; // unused
  // const urlSiteId = qs?.get('siteId') || undefined; // unused
  const urlInverterSN = qs?.get('inverterSN') || undefined;
  const seSiteId = (selectedSite && selectedSite !== 'all' ? String(selectedSite) : (siteCode && /^\d+$/.test(String(siteCode)) ? String(siteCode) : (import.meta as any).env?.VITE_SOLAREDGE_SITE_ID)) || '3078000';
  const seInverterSN = (import.meta as any).env?.VITE_SOLAREDGE_INVERTER_SN || '7B0C44D5-A0';

  React.useEffect(() => {
    (async () => {
      try {
        if (!seKey) return;
        const range = computeRange();
        const list = await getInverterTelemetry({
          siteId: seSiteId,
          inverterSN: (urlInverterSN ?? seInverterSN),
          startTime: range.from,
          endTime: range.to,
          apiKey: seKey,
        });
        setTelemetries(list);
        if (Array.isArray(list) && list.length > 0) {
          const first: any = list[0];
          const last: any = list[list.length - 1];
          const phaseVs = [last?.L1Data?.acVoltage, last?.L2Data?.acVoltage, last?.L3Data?.acVoltage].filter((v) => Number.isFinite(Number(v))) as number[];
          const voltage = phaseVs.length ? phaseVs.reduce((a, b) => a + Number(b), 0) / phaseVs.length : (Number.isFinite(Number(last?.vL1To2)) ? Number(last?.vL1To2) / Math.sqrt(3) : 0);
          const currents = [last?.L1Data?.acCurrent, last?.L2Data?.acCurrent, last?.L3Data?.acCurrent].filter((v) => Number.isFinite(Number(v))) as number[];
          const current = currents.length ? currents.reduce((a, b) => a + Number(b), 0) / currents.length : 0;
          const freqs = [last?.L1Data?.acFrequency, last?.L2Data?.acFrequency, last?.L3Data?.acFrequency].filter((v) => Number.isFinite(Number(v))) as number[];
          const frequency = freqs.length ? freqs.reduce((a, b) => a + Number(b), 0) / freqs.length : 0;
          const eFirst = Number(first?.totalEnergy || 0);
          const eLast = Number(last?.totalEnergy || 0);
          const consumptionKwh = eLast > eFirst ? (eLast - eFirst) / 1000 : 0;
          const lifetimeKwh = eLast / 1000;
          setMetrics((m) => ({ ...m, voltage, current, frequency, consumptionKwh, lifetimeKwh }));
        } else {
          setMetrics((m) => ({ ...m, voltage: 0, current: 0, frequency: 0, consumptionKwh: 0 }));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [siteCode, computeRange, seKey]);

  React.useEffect(() => {
    (async () => {
      try {
        if (!seKey) return;
        const now = (typeof filtersDate === "object" && filtersDate) ? new Date(filtersDate.y, (filtersDate.m||1)-1, filtersDate.d||1) : (urlStartTime ? new Date(urlStartTime.replace(' ', 'T')) : new Date());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        const pad = (n: number) => String(n).padStart(2, '0');
        const start = startOfMonth.getFullYear() + "-" + pad(startOfMonth.getMonth() + 1) + "-" + pad(startOfMonth.getDate()) + " 00:00:00";
        const range = computeRange();
        const list = await getInverterTelemetry({
          siteId: seSiteId,
          inverterSN: (urlInverterSN ?? seInverterSN),
          startTime: start,
          endTime: range.to,
          apiKey: seKey,
        });
        if (Array.isArray(list) && list.length > 0) {
          const eFirst = Number(list[0]?.totalEnergy || 0);
          const eLast = Number(list[list.length - 1]?.totalEnergy || 0);
          const monthKwh = eLast > eFirst ? (eLast - eFirst) / 1000 : 0;
          setMetrics((m) => ({ ...m, monthKwh }));
        } else {
          setMetrics((m) => ({ ...m, monthKwh: 0 }));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [siteCode, computeRange, seKey]);

  // telemetry-driven chart data
  const chartCats = React.useMemo(() => telemetries.map((t: any) => String(t?.date ?? '').slice(11, 16)), [telemetries]);
  const chartSeries = React.useMemo(() => [{ name: 'Active Power', data: telemetries.map((t: any) => Number(t?.totalActivePower || 0)) }], [telemetries]);

  // Update left gauge from telemetry-based today consumption (kWh)
  React.useEffect(() => {
    const today = Number(metrics.consumptionKwh || 0);
    setThermoOne((prev) => ({
      ...prev,
      initialValue: Math.round(toNumber(today)),
    }));
  }, [metrics.consumptionKwh]);

  return (
    <>
      <div className="grid grid-cols-1 lg-1355:grid-cols-5 gap-3 mt-6">
        <div className="col-span-5 lg-1355:col-span-4 flex flex-col justify-center items-center bg-white rounded-xl gap-10 p-6">
          {/* Time Range (Dropdown x2) */}
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
          {/* โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€ */}

          <div className="flex flex-col md:flex-row w-full justify-around gap-10 lg:gap-0">
            <div className="flex flex-col items-center gap-20">
              {/* โ… เธฃเธต-mount เน€เธกเธทเนเธญเธเนเธฒเน€เธเธฅเธตเนเธขเธ */}
              <Thermostat
                key={`${thermoOne.initialValue}-${thermoOne.valueLabel}-${thermoOne.maxLabel}`}
                initialValue={thermoOne.initialValue}
                max={200000}
                maxLabel={thermoOne.maxLabel}
                valueLabel={thermoOne.valueLabel}
              />
            </div>

            <div className="flex flex-col items-center gap-20">
              <Thermostat
                initialValue={0}
                max={50}
                maxLabel={""}
                valueLabel={``}
                unit=""
              />
            </div>
          </div>

          {/* value cards */}
          <div className="flex flex-wrap gap-4">
            {[
              {
                img: voltageIcon,
                value: metrics.voltage,
                valueLabel: t("devices.electric.cards.voltage"),
                valueLabel2: t("devices.electric.units.volt"),
              },
              {
                img: plugIcon,
                value: metrics.consumptionKwh,
                valueLabel: t("devices.electric.cards.consumption"),
                valueLabel2: t("devices.electric.units.kwh"),
              },
              {
                img: transformIcon,
                value: metrics.lifetimeKwh,
                valueLabel: t("devices.electric.cards.accumulated"),
                valueLabel2: t("devices.electric.units.kwh"),
              },
              {
                img: IletterIcon,
                value: metrics.current,
                valueLabel: t("devices.electric.cards.current"),
                valueLabel2: t("devices.electric.units.amp"),
              },
              {
                img: wavesineIcon,
                value: metrics.frequency,
                valueLabel: t("devices.electric.cards.frequency"),
                valueLabel2: t("devices.electric.units.hz"),
              },
              {
                img: waterSupplieIcon,
                value: 0,
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
              value: metrics.consumptionKwh,
              valueLabel: t("devices.electric.side.today"),
              unit: t("devices.electric.side.unitKwh"),
            },
            {
              img: boltWhiteIcon,
              value: metrics.monthKwh,
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
        {/* เนเธ–เธเธฃเธฒเธขเธงเธฑเธ + เธงเธ Radial */}
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

        {/* เธเธฃเธฒเธเน€เธชเนเธเน€เธเธฅเธตเนเธขเธเธ•เธฒเธกเธงเธฑเธ */}
        <ElectricLineBasicChart
          key={selected}
          categories={chartCats?.length ? chartCats : undefined}
          series={chartSeries?.[0]?.data?.length ? chartSeries : ELECTRIC_DAY_SERIES[selected]}
        />
      </div>
    </>
  );
}






















