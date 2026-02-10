// src/pages/ElectricMeter.tsx
import React from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { AxisSeries } from "../types/apexSeries";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Dashboard/Navbar";
import { useFilters } from "../context/FiltersContext";
import { useDeviceInventory, getCountForType } from "../context/DeviceInventoryContext";
import { useDeviceInventoryLoader } from "../hooks/useDeviceInventoryLoader";
import RingRunner from "../components/RingRunner";
import MeterDetail from "../components/ElectricMeterDashboard/MeterDetail";
import BillingHistoryTable from "../components/ElectricMeterDashboard/BillingHistoryTable";
import Modal from "../components/Modal";
import { useUserPath } from "../routes/useUserPath";
import type { MeterOption } from "../types/meter";
import { getElectricDevices } from "../api/electric";
import { getMeterDashboard, type MeterDashboard } from "../api/meter";
import { downloadBillPdf } from "../api/billing";
import { saveBlobAsFile } from "../utils/download";

const C = {
  cardBg: "#05172c",
  cardBorder: "#093054",
  num: "#01faf8",
  headFactory: "#0bb1f4",
  thisMonth: "#18d1ad",
  lastMonth: "#51707f",
  energyCost: "#eec824",
};

const ENERGY_USAGE_CATEGORIES = Array.from({ length: 24 }, (_, idx) =>
  String(idx + 1)
);
const DEFAULT_ENERGY_DATA = [
  420, 460, 510, 430, 480, 520, 610, 720, 640, 590, 980, 1180, 760, 600, 540,
  580, 620, 560, 610, 640, 670, 690, 620, 580,
];
export const ElectricMeter: React.FC = () => {
  const {
    searchSite,
    setSearchSite,
    siteOptions,
    selectedSite,
    setSelectedSite,
    date,
    setDate,
  } = useFilters();
  const location = useLocation();
  const searchParams = React.useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const meterIdParam = searchParams.get("meterId");
  const [meterOptions, setMeterOptions] = React.useState<MeterOption[]>([]);
  const [selectedMeter, setSelectedMeter] = React.useState<MeterOption | null>(null);
  const [dashboard, setDashboard] = React.useState<MeterDashboard | null>(null);
  const [loadingMeter, setLoadingMeter] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { counts: inventoryCounts, loading: inventoryLoading } = useDeviceInventory();
  const [guardType, setGuardType] = React.useState<"none" | "select" | "blocked">("none");
  const [downloadingHistoryId, setDownloadingHistoryId] = React.useState<string | null>(null);
  const [rangeLabel, setRangeLabel] = React.useState(() => computeFixedRange().label);
  const navigate = useNavigate();
  const { abs } = useUserPath();
  React.useEffect(() => {
    if (!meterOptions.length) {
      setSelectedMeter(null);
      setDashboard(null);
      return;
    }
    const found =
      meterIdParam && meterIdParam.trim().length > 0
        ? meterOptions.find((opt) => opt.id === meterIdParam)
        : meterOptions[0];
    setSelectedMeter(found ?? meterOptions[0] ?? null);
  }, [meterOptions, meterIdParam]);

  const normalizedSite = (selectedSite ?? "").trim();
  const requiresSiteSelection =
    !normalizedSite || normalizedSite === "all";
  useDeviceInventoryLoader({
    selectedSiteCode: !requiresSiteSelection ? normalizedSite : undefined,
    enabled: !requiresSiteSelection,
  });
  const electricDeviceCount = getCountForType(inventoryCounts as any, "electricmeter" as any);
  const noElectricAccess =
    !requiresSiteSelection &&
    normalizedSite !== "all" &&
    !inventoryLoading &&
    electricDeviceCount <= 0;

  React.useEffect(() => {
    if (requiresSiteSelection) setGuardType("select");
    else if (noElectricAccess) setGuardType("blocked");
    else setGuardType("none");
  }, [requiresSiteSelection, noElectricAccess]);
  const siteGuardOpen = guardType !== "none";

  const loadMeterDashboard = React.useCallback(
    async (deviceId: string, params?: { startDate?: string; endDate?: string }) => {
    setLoadingMeter(true);
    try {
      setError(null);
      const data = await getMeterDashboard(deviceId, params);
      setDashboard(data);
    } catch (err) {
      console.error("[ElectricMeter] dashboard failed", err);
      setDashboard(null);
      setError("ไม่สามารถโหลดข้อมูลมิเตอร์ได้");
    } finally {
      setLoadingMeter(false);
    }
    },
    []
  );

  const handleDownloadHistoryPdf = React.useCallback(async (billId: string) => {
    setDownloadingHistoryId(billId);
    try {
      const blob = await downloadBillPdf(billId);
      saveBlobAsFile(blob, `bill-${billId}.pdf`);
    } catch (err) {
      console.error("[ElectricMeter] download bill history failed", err);
      alert("ไม่สามารถดาวน์โหลดไฟล์ PDF สำหรับบิลนี้ได้");
    } finally {
      setDownloadingHistoryId(null);
    }
  }, []);

  const loadMeterOptions = React.useCallback(async () => {
    if (!normalizedSite || normalizedSite === "all") return;
    try {
      setError(null);
      const resp = await getElectricDevices(normalizedSite);
      const items =
        ((resp as any)?.items as any[]) ??
        ((resp as any)?.data?.items as any[]) ??
        ((resp as any)?.data as any[]) ??
        [];
      const siteLabel =
        siteOptions.find((opt) => opt.value === normalizedSite)?.label ??
        "Site";
      const mapped = items
        .filter((item: any) => isMeterDevice(item))
        .map((item: any) =>
        mapDeviceToMeterOption(item, siteLabel)
      );
      setMeterOptions(mapped);
    } catch (err) {
      console.error("[ElectricMeter] load meters failed", err);
      setError("ไม่สามารถโหลดรายการมิเตอร์ได้");
      setMeterOptions([]);
    }
  }, [normalizedSite, siteOptions]);

  React.useEffect(() => {
    if (requiresSiteSelection) return;
    loadMeterOptions();
  }, [requiresSiteSelection, loadMeterOptions]);

  React.useEffect(() => {
    if (!selectedMeter) {
      setDashboard(null);
      return;
    }
    const fixedRange = computeFixedRange();
    setRangeLabel(fixedRange.label);
    loadMeterDashboard(selectedMeter.id, {
      startDate: fixedRange.startIso,
      endDate: fixedRange.endIso,
    });
  }, [selectedMeter, loadMeterDashboard]);

  const handleSiteGuardClose = React.useCallback(() => {
    setGuardType("none");
    navigate(abs("/dashboard"), { replace: true });
  }, [navigate, abs]);
  const siteGuardConfig =
    guardType === "blocked"
      ? {
          title: "ไม่สามารถใช้งาน Electric Dashboard ได้",
          message: "Site นี้ยังไม่มีอุปกรณ์ไฟฟ้าที่รองรับ กรุณาเลือก Site อื่น",
          closeLabel: "ย้อนกลับ",
        }
      : {
          title: "กรุณาเลือก Site ก่อนใช้งาน",
          message: "โปรดเลือก Site จากเมนูด้านบน (Navbar) เพื่อใช้งานฟีเจอร์ไฟฟ้า",
          closeLabel: "โอเค",
        };

  const rangeOnPeakValue = dashboard?.totals.onPeakKwh ?? 0;
  const rangeOffPeakValue = dashboard?.totals.offPeakKwh ?? 0;
  const heroUsageValue =
    dashboard?.totals.energyUsageKwh ??
    rangeOnPeakValue +
      rangeOffPeakValue;
  const previousMonthKwh = dashboard?.totals.previousMonthKwh ?? 0;
  const todayBaseKwh =
    dashboard?.realtime?.totalKwh ?? dashboard?.totals.todayKwh ?? 0;
  const realtimeOnPeakValue =
    dashboard?.realtime?.onPeakKwh ??
    dashboard?.totals.todayOnPeakKwh ??
    0;
  const realtimeOffPeakValue =
    dashboard?.realtime?.offPeakKwh ??
    dashboard?.totals.todayOffPeakKwh ??
    Math.max(0, todayBaseKwh - realtimeOnPeakValue);
  const realtimeTotalValue =
    dashboard?.realtime?.totalKwh ??
    realtimeOnPeakValue + realtimeOffPeakValue;
  const realtimeVoltageValue =
    dashboard?.realtime?.voltage ??
    dashboard?.lastReading?.voltage ??
    null;
  const realtimeTimestamp =
    dashboard?.realtime?.timestamp ??
    dashboard?.lastReading?.timestamp ??
    null;
  const voltageDisplay =
    typeof realtimeVoltageValue === "number" && Number.isFinite(realtimeVoltageValue)
      ? `${realtimeVoltageValue.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })} V`
      : "-";

  const meterDetailData = React.useMemo(() => {
    if (!selectedMeter) return null;
    if (!dashboard) return selectedMeter;
    const lastReadingValue = dashboard.lastReading
      ? dashboard.lastReading.value ??
        (dashboard.lastReading.onPeakKwh ?? 0) +
          (dashboard.lastReading.offPeakKwh ?? 0)
      : undefined;
    const lastReadingText =
      typeof lastReadingValue === "number"
        ? `${lastReadingValue.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })} kWh`
        : selectedMeter.lastReading ?? "-";
    const lastSyncText = dashboard.lastReading
      ? formatDateTime(dashboard.lastReading.timestamp)
      : selectedMeter.lastSync ?? "-";
    const todayRealtimeValue = dashboard.realtime ? realtimeTotalValue : undefined;
    return {
      ...selectedMeter,
      todayKwh:
        todayRealtimeValue ??
        dashboard.totals.todayKwh ??
        heroUsageValue,
      lastReading: lastReadingText,
      lastSync: lastSyncText,
      billingStatus: dashboard.device.billingStatus ?? selectedMeter.billingStatus,
    };
  }, [selectedMeter, dashboard, realtimeTotalValue, heroUsageValue]);

  const heroTitle = meterDetailData
    ? `${meterDetailData.siteName} - ${meterDetailData.name}`
    : "กรุณาเลือกมิเตอร์";
  const trendDirection = dashboard
    ? heroUsageValue >= previousMonthKwh
      ? "up"
      : "down"
    : "up";
  const totalCostValue = dashboard?.cost.totalCost ?? 0;
  const onPeakValue = realtimeOnPeakValue;
  const offPeakValue = realtimeOffPeakValue;
  const isTrendUp = trendDirection === "up";
  const trendColor = isTrendUp ? "#EC0357" : C.thisMonth;

  const trendArrowIcon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={trendColor}
      strokeWidth="2"
    >
      {isTrendUp ? (
        <>
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </>
      ) : (
        <>
          <path d="M12 5v14" />
          <path d="M5 12l7 7 7-7" />
        </>
      )}
    </svg>
  );

  const energyCategories =
    dashboard?.chart.categories ?? ENERGY_USAGE_CATEGORIES;
  const currentEnergyData = React.useMemo<number[]>(
    () => [...(dashboard?.chart.current ?? DEFAULT_ENERGY_DATA)],
    [dashboard]
  );
  const lastMonthEnergyData = React.useMemo<number[]>(
    () =>
      dashboard?.chart.previous
        ? [...dashboard.chart.previous]
        : currentEnergyData.map((value, idx) => {
            const variance = (idx % 4) * 8;
            return Math.max(200, Math.round(value * 0.88 + variance));
          }),
    [dashboard, currentEnergyData]
  );

  const energySeries = React.useMemo<AxisSeries>(
    () => [
      {
        name: "เดือนนี้",
        data: currentEnergyData,
      },
      {
        name: "เดือนที่แล้ว",
        data: lastMonthEnergyData,
      },
    ],
    [currentEnergyData, lastMonthEnergyData]
  );

  const energyChartOptions = React.useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "line",
        toolbar: { show: false },
        background: "transparent",
        animations: { enabled: true, easing: "easeinout", speed: 600 },
        fontFamily: "Inter, ui-sans-serif, system-ui",
      },
      colors: ["#158bb6", "#0b3b56"],
      stroke: { width: 3, curve: "smooth" },
      markers: { size: 0 },
      dataLabels: { enabled: false },
      fill: {
        type: "solid",
        opacity: [1, 1],
      },
      grid: {
        borderColor: "rgba(255,255,255,0.08)",
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
        padding: { left: 20, right: 20, top: 10, bottom: 0 },
      },
      xaxis: {
        categories: energyCategories,
        axisTicks: { show: false },
        axisBorder: { show: false },
        labels: {
          style: { colors: "#7EAEDA", fontSize: "11px", fontWeight: 500 },
        },
        tooltip: { enabled: false },
      },
      yaxis: {
        min: 400,
        max: 1200,
        tickAmount: 4,
        labels: {
          style: { colors: "#7EAEDA", fontSize: "11px" },
          formatter: (value) =>
            value.toLocaleString("en-US", { maximumFractionDigits: 0 }),
        },
      },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number) => `${val.toLocaleString()} kWh`,
        },
      },
      legend: {
        show: true,
        labels: { colors: ["#fff"] },
        markers: { size: 10 },
      },
    }),
    [energyCategories]
  );

  return (
    <>
      <Sidebar>
        <div className="min-h-screen bg-[#eef6ff]">
          <Navbar
            searchSite={searchSite}
            setSearchSite={setSearchSite}
            siteOptions={siteOptions}
          selectedSite={selectedSite}
          setSelectedSite={setSelectedSite}
          date={date as any}
          setDate={setDate as any}
        />

        <div className="mx-auto w-full max-w-[1300px] px-6 pb-16">
          <div className="mt-6 mb-5 flex flex-wrap items-center gap-3">
            <h2 className="text-[20px] font-semibold text-[#0F172A]">
              Electric Meter Dashboard
            </h2>
            {meterDetailData && (
              <span className="inline-flex items-center rounded-full border border-[#1b3c58] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#1b3c58]">
                {meterDetailData.name}
              </span>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {loadingMeter && (
            <div className="mb-4 text-sm text-[#0F172A] opacity-70">
              กำลังโหลดข้อมูลมิเตอร์...
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#1b3c58] bg-[#05172c] px-5 py-3 text-white">
            <span className="text-sm font-semibold text-white/80">
              {rangeLabel}
            </span>
          </div>

          <MeterDetail
            meter={meterDetailData}
            onChange={() => navigate(abs("/electric"))}
          />

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div
              className="relative flex min-h-[160px] items-center justify-between gap-6 overflow-hidden rounded-[28px] border border-[#1b3c58] px-8 py-7 text-white shadow-[0_15px_30px_rgba(2,12,27,0.45)]"
              style={{ backgroundColor: C.cardBg }}
            >
              <div className="flex flex-col justify-between gap-4">
                <div className="text-[20px] font-semibold tracking-[0.05em] text-white">
                  TOTAL ENERGY USAGE
                </div>
                <div className="flex items-end gap-3">
                  <div
                    className="font-semibold leading-[1]"
                    style={{ color: C.num, fontSize: "56px" }}
                  >
                    {formatNumber(heroUsageValue)}
                  </div>
                  <div className="pb-[6px] text-[22px] text-[#24c2e5] opacity-85">
                    kWh
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[17px] font-semibold">
                  <span
                    className="inline-flex items-center gap-1"
                    style={{ color: trendColor }}
                  >
                    {trendArrowIcon}
                    This Month
                  </span>
                  <span className="opacity-60">vs</span>
                  <span className="opacity-90" style={{ color: C.lastMonth }}>
                    Last Month
                  </span>
                </div>
              </div>

              <RingRunner
                className="ml-auto hidden shrink-0 md:block"
                size={140}
                color="#01faf8"
                ringThickness={2}
                innerGap={14}
                durationSec={10}
                icon={
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="#01faf8"
                    stroke={C.num}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8z" />
                  </svg>
                }
              />
            </div>

            <div
              className="relative flex min-h-[160px] items-center justify-between gap-6 rounded-[28px] border border-[#1b3c58] px-8 py-7 text-white shadow-[0_15px_30px_rgba(2,12,27,0.45)]"
              style={{ backgroundColor: C.cardBg }}
            >
              <div className="flex flex-col justify-between gap-3">
                <div className="text-[20px] font-semibold tracking-[0.05em] text-white">
                  TOTAL COST
                </div>
                <div className="flex items-end gap-3">
                  <div className="text-[32px]  leading-[1] font-bold">฿</div>
                  <div
                    className="font-semibold leading-[1]"
                    style={{ color: C.num, fontSize: "56px" }}
                  >
                    {totalCostValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[17px] font-semibold">
                  <span
                    className="inline-flex items-center gap-1"
                    style={{ color: trendColor }}
                  >
                    {trendArrowIcon}
                    This Month
                  </span>
                  <span className="opacity-60">vs</span>
                  <span className="opacity-90" style={{ color: C.lastMonth }}>
                    Last Month
                  </span>
                </div>
              </div>

              {isTrendUp && (
                <div className="relative flex w-[80px] items-center justify-end md:w-[190px] md:justify-center">
                  <div className="absolute right-1 top-1 flex md:hidden">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.energyCost}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className="hidden w-full flex-col items-center justify-center rounded-[22px] px-4 py-5 text-center md:flex">
                    <div className="grid place-items-center rounded-full">
                      <svg
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={C.energyCost}
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <p
                      className="mt-3 text-[14px] font-semibold uppercase leading-relaxed tracking-wide"
                      style={{ color: C.energyCost }}
                    >
                      ENERGY COST
                      <br />
                      EXCEEDED THRESHOLD
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div
              className="rounded-[32px] border border-[#1b3c58] px-8 py-8 text-white shadow-[0_20px_35px_rgba(2,12,27,0.45)]"
              style={{ backgroundColor: C.cardBg }}
            >
              <div
                className="text-[26px] font-semibold tracking-wide"
                style={{ color: C.headFactory }}
              >
                {heroTitle}
              </div>

              {/* Block-1 */}
              <div className="items-center grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1.1fr_1.1fr]">
                <div className="flex flex-col justify-center gap-3 h-full mb-[50px]">
                  <div className="text-[20px] font-semibold tracking-[0.05em] text-white">
                    ENERGY USAGE (Realtime)
                  </div>

                  <div className="flex items-end gap-3">
                    <div
                      className="font-semibold leading-[1]"
                      style={{ color: C.num, fontSize: "56px" }}
                    >
                      {realtimeTotalValue.toLocaleString(undefined, {
                        maximumFractionDigits: 3,
                      })}
                    </div>
                    <div className="pb-[8px] text-[22px] text-[#24c2e5] opacity-85">kWh</div>
                  </div>

                  <div className="text-sm font-medium text-white/70">
                    อัปเดตล่าสุด:{" "}
                    {realtimeTimestamp
                      ? formatDateTime(realtimeTimestamp)
                      : "ยังไม่มีข้อมูลวันนี้"}
                  </div>
                </div>

                {/*Blcok-2*/}
                <div className="flex flex-col justify-center gap-4 h-full">
                  <div>
                    <div className="text-[20px] font-semibold tracking-[0.05em] text-white">
                      ON PEAK (kWh)
                    </div>
                    <div className="flex items-end gap-3">
                      <div
                        className="font-semibold leading-[1]"
                        style={{ color: C.num, fontSize: "56px" }}
                      >
                        {formatNumber(onPeakValue)}
                      </div>
                      <div className="pb-[6px] text-[20px] text-[#24c2e5] opacity-85">
                        kWh
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[16px] bg-gradient-to-r from-[#0c243a] to-[#08192a] p-4 shadow-inner">
                    <p className="text-sm font-semibold text-white/70">
                      OFF PEAK (kWh)
                    </p>
                    <div className="mt-1 flex items-end gap-2">
                      <span
                        className="text-[36px] font-semibold"
                        style={{ color: C.headFactory }}
                      >
                        {formatNumber(offPeakValue)}
                      </span>
                      <span className="text-[16px] text-white/70 pb-[4px]">
                        kWh
                      </span>
                    </div>
                  </div>
                </div>

                {/*Blcok-3*/}
                <div className="w-full rounded-[24px] mt-[-25px] text-white">
                  <div className="flex flex-col items-center h-full gap-3">
                    <div
                      className="grid size-[120px] place-items-center rounded-full border-3 border-[#01faf8]"
                      style={{
                        boxShadow:
                          "0 0 12px rgba(1,250,248,0.6), 0 0 32px rgba(1,250,248,0.4), 0 0 48px rgba(1,250,248,0.25)",
                      }}
                    >
                      <svg
                        width="42"
                        height="42"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={C.num}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2v4" />
                        <path d="M12 18v4" />
                        <path d="m4.93 4.93 2.83 2.83" />
                        <path d="m16.24 16.24 2.83 2.83" />
                        <path d="M2 12h4" />
                        <path d="M18 12h4" />
                        <circle cx="12" cy="12" r="5" />
                      </svg>
                    </div>
                    <div className="text-center text-[15px] font-semibold uppercase tracking-[0.25em] text-white">
                      VOLT DISPLAY
                    </div>
                    <div className="text-3xl font-semibold" style={{ color: C.num }}>
                      {voltageDisplay}
                    </div>
                    <div className="text-xs text-white/70">
                      {realtimeTimestamp
                        ? `อัปเดต ${formatDateTime(realtimeTimestamp)}`
                        : "รอข้อมูลแรงดันจากมิเตอร์"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div
              className="rounded-[28px] border border-[#1b3c58] px-6 py-5 text-white shadow-[0_18px_28px_rgba(2,12,27,0.4)]"
              style={{ backgroundColor: C.cardBg }}
            >
              <div className="text-[12px] font-semibold tracking-[0.2em] text-white/70">
                ENERGY USAGE
              </div>
              <div className="mt-4 rounded-[20px] border border-[#14334d] bg-gradient-to-b from-[#071f35] to-[#051627] px-2 py-3">
                <ReactApexChart
                  type="line"
                  height={200}
                  options={energyChartOptions}
                  series={energySeries}
                />
              </div>
            </div>
          </div>

          <div className="mt-10">
            <h3 className="mb-3 text-[16px] font-semibold text-[#0F172A]">
              Billing History
            </h3>
            <BillingHistoryTable
              rows={dashboard?.billingHistory ?? []}
              loading={loadingMeter}
              onDownload={handleDownloadHistoryPdf}
              downloadingId={downloadingHistoryId}
            />
          </div>
        </div>
      </div>
    </Sidebar>
    <Modal
      open={siteGuardOpen}
      id="electric-site-required"
      icon="cancel"
      title={siteGuardConfig.title}
      message={siteGuardConfig.message}
      closeLabel={siteGuardConfig.closeLabel}
      onClose={handleSiteGuardClose}
    />
  </>
  );
};

export default ElectricMeter;

function mapDeviceToMeterOption(device: any, siteLabel: string): MeterOption {
  const meta = (device?.meta ?? {}) as Record<string, any>;
  const details = (meta?.details ?? {}) as Record<string, any>;
  const statusRaw = String(device?.status ?? "offline").toLowerCase();
  const status: MeterOption["status"] =
    statusRaw === "online"
      ? "online"
      : statusRaw === "maintenance"
      ? "warning"
      : "offline";
  const rawId = device?.id ?? device?.model ?? "";
  const normalizedId = typeof rawId === "string" ? rawId : String(rawId);

  return {
    id: normalizedId,
    name:
      details?.name ??
      (typeof device?.model === "string"
        ? device.model.split(":").pop()
        : "Meter"),
    siteName: siteLabel,
    isOverall: false,
    description: details?.description ?? meta?.description ?? undefined,
    status,
    lastReading: "-",
    lastSync: device?.last_seen
      ? formatDateTime(device.last_seen)
      : "-",
    todayKwh: 0,
    location: details?.location ?? "-",
    billingMonth: new Date().toLocaleString("th-TH", {
      month: "long",
      year: "numeric",
    }),
    billingStatus: (meta?.billingStatus as any) ?? "pending",
    billingOutstandingMonth:
      meta?.billingOutstandingMonth ?? "เดือนก่อนหน้า",
    billingDueDate: undefined,
    trendDirection: "up",
  };
}

function isMeterDevice(item: any) {
  const meta = (item?.meta ?? {}) as Record<string, any>;
  const category = String(
    meta.deviceCategory ?? meta.device_type ?? item?.category ?? ""
  ).toLowerCase();
  if (category) return category === "meter";

  const model = String(item?.model ?? "").toUpperCase();
  return model.startsWith("METER:");
}

function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

type FixedRangeInfo = {
  startIso: string;
  endIso: string;
  label: string;
};

function computeFixedRange(): FixedRangeInfo {
  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endThisMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return {
    startIso: startThisMonth.toISOString(),
    endIso: endThisMonth.toISOString(),
    label: `เดือนนี้: ${formatRangeDate(startThisMonth)} - ${formatRangeDate(
      endThisMonth
    )} (ปัจจุบัน) | เดือนก่อน: ${formatRangeDate(startLastMonth)} - ${formatRangeDate(
      endLastMonth
    )}`,
  };
}

function formatRangeDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
