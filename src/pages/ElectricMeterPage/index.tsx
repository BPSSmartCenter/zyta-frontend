// src/pages/ElectricMeterPage/index.tsx
import React from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { AxisSeries } from "../../types/apexSeries";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "../../components/Dashboard/Navbar";
import { useFilters } from "../../context/FiltersContext";
import { useUserLogo } from "../../hooks/useUserLogo";
import { useDeviceInventory, getCountForType } from "../../context/DeviceInventoryContext";
import { useDeviceInventoryLoader } from "../../hooks/useDeviceInventoryLoader";
import RingRunner from "../../components/RingRunner";
import MeterDetail from "../../components/ElectricMeterDashboard/MeterDetail";
import BillingHistoryTable from "../../components/ElectricMeterDashboard/BillingHistoryTable";
import Modal from "../../components/Modal";
import { useUserPath } from "../../routes/useUserPath";
import type { MeterOption } from "../../types/meter";
import { getElectricDevices } from "../../features/electric";
import { getMeterDashboard, getSiteMetersDashboard, type MeterDashboard } from "../../features/electric";
import { downloadBillPdf } from "../../features/billing";
import { saveBlobAsFile } from "../../utils/download";

const OVERVIEW_METER_ID = "overview";

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
export const ElectricMeter: React.FC = () => {
  const { t, i18n } = useTranslation(["electricMeter"]);
  const locale = React.useMemo(
    () =>
      (i18n.language || "th").toLowerCase().startsWith("th") ? "th-TH" : "en-US",
    [i18n.language]
  );
  const {
    searchSite,
    setSearchSite,
    siteOptions,
    selectedSite,
    setSelectedSite,
    date,
    setDate,
  } = useFilters();
  const userLogoSrc = useUserLogo();
  const location = useLocation();
  const searchParams = React.useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const meterIdParam = searchParams.get("meterId");
  const [meterOptions, setMeterOptions] = React.useState<MeterOption[]>([]);
  const [selectedMeter, setSelectedMeter] = React.useState<MeterOption | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerSearch, setPickerSearch] = React.useState("");
  const [dashboard, setDashboard] = React.useState<MeterDashboard | null>(null);
  const [loadingMeter, setLoadingMeter] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { counts: inventoryCounts, loading: inventoryLoading } = useDeviceInventory();
  const [guardType, setGuardType] = React.useState<"none" | "select" | "blocked">("none");
  const [downloadingHistoryId, setDownloadingHistoryId] = React.useState<string | null>(null);
  const [rangeLabel, setRangeLabel] = React.useState(() =>
    computeFixedRange({
      locale,
      thisMonthLabel: t("range.thisMonth", { defaultValue: "This month" }),
      lastMonthLabel: t("range.lastMonth", { defaultValue: "Last month" }),
      toPresentLabel: t("range.toPresent", { defaultValue: "(to present)" }),
    }).label
  );
  const navigate = useNavigate();
  const { abs } = useUserPath();
  const deferredPickerSearch = React.useDeferredValue(pickerSearch);
  const pickSearchLower = deferredPickerSearch.trim().toLowerCase();

  const filteredMeterPickerOptions = React.useMemo(() => {
    if (!pickSearchLower) return meterOptions;
    return meterOptions.filter((opt) => {
      const buildingTag = (opt.tags ?? []).find((tag) =>
        String(tag).toLowerCase().startsWith("building:")
      );
      const buildingName = buildingTag
        ? String(buildingTag).slice("building:".length).trim()
        : "";
      const haystack = [
        opt.name,
        opt.siteName,
        opt.description ?? "",
        opt.location ?? "",
        buildingName,
        opt.id,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(pickSearchLower);
    });
  }, [meterOptions, pickSearchLower]);

  const groupedPickerOptions = React.useMemo(() => {
    const overview = filteredMeterPickerOptions.filter(
      (opt) => opt.scope === "overview" || Boolean(opt.isOverall)
    );
    const buildings = filteredMeterPickerOptions.filter((opt) => opt.scope === "tag");
    const meters = filteredMeterPickerOptions.filter(
      (opt) => !opt.scope || opt.scope === "meter"
    );
    return { overview, buildings, meters };
  }, [filteredMeterPickerOptions]);

  const handlePickMeter = React.useCallback(
    (opt: MeterOption) => {
      setSelectedMeter(opt);
      setPickerOpen(false);
      setPickerSearch("");

      const nextParams = new URLSearchParams(location.search);
      nextParams.set("meterId", opt.id);
      const nextSearch = nextParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : "",
        },
        { replace: true }
      );
    },
    [location.pathname, location.search, navigate]
  );
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
      setError(t("errors.loadMeter", { defaultValue: "Unable to load meter data" }));
    } finally {
      setLoadingMeter(false);
    }
    },
    [t]
  );

  const loadSiteDashboard = React.useCallback(
    async (
      siteIdOrCode: string,
      params?: { startDate?: string; endDate?: string; tag?: string }
    ) => {
      setLoadingMeter(true);
      try {
        setError(null);
        const data = await getSiteMetersDashboard(siteIdOrCode, params);
        setDashboard(data);
      } catch (err) {
        console.error("[ElectricMeter] site dashboard failed", err);
        setDashboard(null);
        setError(
          t("errors.loadOverview", {
            defaultValue: "Unable to load aggregated meter data",
          })
        );
      } finally {
        setLoadingMeter(false);
      }
    },
    [t]
  );

  const handleDownloadHistoryPdf = React.useCallback(async (billId: string) => {
    setDownloadingHistoryId(billId);
    try {
      const blob = await downloadBillPdf(billId);
      saveBlobAsFile(blob, `bill-${billId}.pdf`);
    } catch (err) {
      console.error("[ElectricMeter] download bill history failed", err);
      alert(t("errors.downloadPdf", { defaultValue: "Unable to download PDF" }));
    } finally {
      setDownloadingHistoryId(null);
    }
  }, [t]);

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
        mapDeviceToMeterOption(item, siteLabel, locale)
      );
      const buildingTags = Array.from(
        new Set(
          mapped
            .flatMap((m) => m.tags ?? [])
            .filter((tag) => String(tag).toLowerCase().startsWith("building:"))
        )
      );
      const buildingOptions: MeterOption[] = buildingTags.map((tag) => {
        const metersInTag = mapped.filter((m) => (m.tags ?? []).includes(tag));
        const status: MeterOption["status"] = metersInTag.some((m) => m.status === "online")
          ? "online"
          : metersInTag.some((m) => m.status === "warning")
          ? "warning"
          : "offline";
        const label = tag.replace(/^building:/i, "").trim() || tag;
        return {
          id: `tag:${tag}`,
          name: label,
          siteName: siteLabel,
          description: t("picker.meta.building", { name: label, defaultValue: "Building: " + label }),
          location: "-",
          status,
          lastReading: "-",
          lastSync: "-",
          todayKwh: 0,
          scope: "tag",
          tag,
          includedMeters: metersInTag.length,
          billingMonth: new Date().toLocaleString(locale, {
            month: "long",
            year: "numeric",
          }),
          billingStatus: "pending",
          billingOutstandingMonth: t("range.lastMonth", { defaultValue: "Last month" }),
          trendDirection: "up",
        };
      });
      const overallStatus: MeterOption["status"] = mapped.some((m) => m.status === "online")
        ? "online"
        : mapped.some((m) => m.status === "warning")
        ? "warning"
        : "offline";
      const overallOption: MeterOption = {
        id: OVERVIEW_METER_ID,
        name: t("view.overallLabel", { defaultValue: "All meters summary" }),
        siteName: siteLabel,
        description: t("picker.meta.included", {
          defaultValue: "Includes {{count}} meters",
          count: mapped.length,
        }),
        location: "-",
        status: overallStatus,
        lastReading: "-",
        lastSync: "-",
        todayKwh: 0,
        isOverall: true,
        scope: "overview",
        includedMeters: mapped.length,
        billingMonth: new Date().toLocaleString(locale, { month: "long", year: "numeric" }),
        billingStatus: "pending",
        billingOutstandingMonth: t("range.lastMonth", { defaultValue: "Last month" }),
        trendDirection: "up",
      };
      setMeterOptions([overallOption, ...buildingOptions, ...mapped]);
    } catch (err) {
      console.error("[ElectricMeter] load meters failed", err);
      setError(t("errors.loadMeters", { defaultValue: "Unable to load meter list" }));
      setMeterOptions([]);
    }
  }, [normalizedSite, siteOptions, locale, t]);

  React.useEffect(() => {
    if (requiresSiteSelection) return;
    loadMeterOptions();
  }, [requiresSiteSelection, loadMeterOptions]);

  React.useEffect(() => {
    if (!selectedMeter) {
      setDashboard(null);
      return;
    }
    const fixedRange = computeFixedRange({
      locale,
      thisMonthLabel: t("range.thisMonth", { defaultValue: "This month" }),
      lastMonthLabel: t("range.lastMonth", { defaultValue: "Last month" }),
      toPresentLabel: t("range.toPresent", { defaultValue: "(to present)" }),
    });
    setRangeLabel(fixedRange.label);
    const params = { startDate: fixedRange.startIso, endDate: fixedRange.endIso };
    if (selectedMeter.scope === "overview" || selectedMeter.isOverall) {
      loadSiteDashboard(normalizedSite, params);
      return;
    }
    if (selectedMeter.scope === "tag" && selectedMeter.tag) {
      loadSiteDashboard(normalizedSite, { ...params, tag: selectedMeter.tag });
      return;
    }
    loadMeterDashboard(selectedMeter.id, params);
  }, [selectedMeter, loadMeterDashboard, loadSiteDashboard, normalizedSite, locale, t]);

  const handleSiteGuardClose = React.useCallback(() => {
    setGuardType("none");
    navigate(abs("/dashboard"), { replace: true });
  }, [navigate, abs]);
  const siteGuardConfig =
    guardType === "blocked"
      ? {
          title: t("guard.blockedTitle", {
            defaultValue: "Electric Dashboard is not available",
          }),
          message: t("guard.blockedMessage", {
            defaultValue:
              "This site has no compatible electric meter devices. Please choose another site.",
          }),
          closeLabel: t("guard.closeBack", { defaultValue: "Go back" }),
        }
      : {
          title: t("guard.selectTitle", { defaultValue: "Please select a site" }),
          message: t("guard.selectMessage", {
            defaultValue:
              "Choose a site from the navbar before using electric features.",
          }),
          closeLabel: t("guard.closeOk", { defaultValue: "OK" }),
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
      ? formatDateTime(dashboard.lastReading.timestamp, locale)
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
    : t("view.noSelection", { defaultValue: "Please select a meter" });
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
  const emptyChartData = React.useMemo<number[]>(
    () => energyCategories.map(() => 0),
    [energyCategories]
  );
  const currentEnergyData = React.useMemo<number[]>(
    () => [...(dashboard?.chart.current ?? emptyChartData)],
    [dashboard, emptyChartData]
  );
  const lastMonthEnergyData = React.useMemo<number[]>(
    () =>
      dashboard?.chart.previous
        ? [...dashboard.chart.previous]
        : [...emptyChartData],
    [dashboard, emptyChartData]
  );
  const chartMaxValue = React.useMemo(
    () => Math.max(0, ...currentEnergyData, ...lastMonthEnergyData),
    [currentEnergyData, lastMonthEnergyData]
  );

  const energySeries = React.useMemo<AxisSeries>(
    () => [
      {
        name: t("chart.thisMonth", { defaultValue: "This month" }),
        data: currentEnergyData,
      },
      {
        name: t("chart.lastMonth", { defaultValue: "Last month" }),
        data: lastMonthEnergyData,
      },
    ],
    [currentEnergyData, lastMonthEnergyData, t]
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
        min: 0,
        max: chartMaxValue > 0 ? Math.ceil(chartMaxValue * 1.15) : 10,
        tickAmount: 5,
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
    [energyCategories, chartMaxValue]
  );

  return (
    <>
      <div className="min-h-screen bg-[#eef6ff]">
        <Navbar
          searchSite={searchSite}
          setSearchSite={setSearchSite}
          siteOptions={siteOptions}
          selectedSite={selectedSite}
          setSelectedSite={setSelectedSite}
          date={date as any}
          setDate={setDate as any}
          logoSrc={userLogoSrc}
        />

        <div className="mx-auto w-full max-w-[1300px] px-6 pb-16">
          <div className="mt-6 mb-5 flex flex-wrap items-center gap-3">
            <h2 className="text-[20px] font-semibold text-[#0F172A]">
              {t("title", { defaultValue: "Electric Meter Dashboard" })}
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
              {t("loading.dashboard", { defaultValue: "Loading meter data..." })}
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#1b3c58] bg-[#05172c] px-5 py-3 text-white">
            <span className="text-sm font-semibold text-white/80">
              {rangeLabel}
            </span>
          </div>

          <MeterDetail
            meter={meterDetailData}
            onChange={() => setPickerOpen(true)}
          />

          <div className="mt-5 grid grid-cols-1 gap-6 lg-1024:grid-cols-2 lg:grid-cols-2">
            <div
              className="relative flex min-h-[160px] items-center justify-between gap-6 overflow-hidden rounded-[28px] border border-[#1b3c58] px-8 py-7 text-white shadow-[0_15px_30px_rgba(2,12,27,0.45)]"
              style={{ backgroundColor: C.cardBg }}
            >
              <div className="flex flex-col justify-between gap-4">
                <div className="text-[20px] font-semibold tracking-[0.05em] text-white">
                  {t("cards.totalEnergyUsage", {
                    defaultValue: "TOTAL ENERGY USAGE",
                  })}
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
                    {t("cards.thisMonth", { defaultValue: "This Month" })}
                  </span>
                  <span className="opacity-60">
                    {t("cards.vs", { defaultValue: "vs" })}
                  </span>
                  <span className="opacity-90" style={{ color: C.lastMonth }}>
                    {t("cards.lastMonth", { defaultValue: "Last Month" })}
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
                  {t("cards.totalCost", { defaultValue: "TOTAL COST" })}
                </div>
                <div className="flex items-end gap-3">
                  <div className="text-[32px] leading-[1] font-bold">฿</div>
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
                    {t("cards.thisMonth", { defaultValue: "This Month" })}
                  </span>
                  <span className="opacity-60">
                    {t("cards.vs", { defaultValue: "vs" })}
                  </span>
                  <span className="opacity-90" style={{ color: C.lastMonth }}>
                    {t("cards.lastMonth", { defaultValue: "Last Month" })}
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
                      {t("cards.energyCost", { defaultValue: "ENERGY COST" })}
                      <br />
                      {t("cards.exceededThreshold", {
                        defaultValue: "EXCEEDED THRESHOLD",
                      })}
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
              <div className="items-center grid grid-cols-1 gap-8 lg-1024:grid-cols-3 lg:grid-cols-[1.1fr_1.1fr_1.1fr]">
                <div className="flex flex-col justify-center gap-3 h-full mb-[50px]">
                  <div className="text-[20px] font-semibold tracking-[0.05em] text-white">
                    {t("cards.energyUsageRealtime", {
                      defaultValue: "ENERGY USAGE (Realtime)",
                    })}
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
                    {t("cards.updatedAt", { defaultValue: "Updated:" })}{" "}
                    {realtimeTimestamp
                      ? formatDateTime(realtimeTimestamp, locale)
                      : t("cards.noDataToday", {
                          defaultValue: "No data for today yet",
                        })}
                  </div>
                </div>

                {/*Blcok-2*/}
                <div className="flex flex-col justify-center gap-4 h-full">
                  <div>
                    <div className="text-[20px] font-semibold tracking-[0.05em] text-white">
                      {t("cards.onPeak", { defaultValue: "ON PEAK (kWh)" })}
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
                      {t("cards.offPeak", { defaultValue: "OFF PEAK (kWh)" })}
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
                      {t("cards.voltDisplay", { defaultValue: "VOLT DISPLAY" })}
                    </div>
                    <div className="text-3xl font-semibold" style={{ color: C.num }}>
                      {voltageDisplay}
                    </div>
                    <div className="text-xs text-white/70">
                      {realtimeTimestamp
                        ? `${t("cards.updatedAt", {
                            defaultValue: "Updated:",
                          })} ${formatDateTime(realtimeTimestamp, locale)}`
                        : t("cards.awaitVoltage", {
                            defaultValue: "Waiting for voltage from meter",
                          })}
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
                {t("chart.title", { defaultValue: "ENERGY USAGE" })}
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
              {t("history.title", { defaultValue: "Billing History" })}
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
    <Modal
      open={siteGuardOpen}
      id="electric-site-required"
      icon="cancel"
      title={siteGuardConfig.title}
      message={siteGuardConfig.message}
      closeLabel={siteGuardConfig.closeLabel}
      onClose={handleSiteGuardClose}
    />
    <Modal
      open={pickerOpen}
      id="electric-meter-picker"
      hideIcon={true}
      title={t("picker.title", { defaultValue: "Select meter view" })}
      message={
        <div className="mt-4 text-left">
          <input
            type="text"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder={t("picker.searchPlaceholder", {
              defaultValue: "Search meters or buildings...",
            })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-200"
          />
          <div className="mt-4 max-h-[360px] overflow-y-auto rounded-xl border border-slate-100">
            <PickerSection
              title={t("picker.sections.overview", { defaultValue: "Overview" })}
              items={groupedPickerOptions.overview}
              selectedId={selectedMeter?.id ?? null}
              onSelect={handlePickMeter}
            />
            <PickerSection
              title={t("picker.sections.buildings", {
                defaultValue: "Buildings (tags)",
              })}
              items={groupedPickerOptions.buildings}
              selectedId={selectedMeter?.id ?? null}
              onSelect={handlePickMeter}
            />
            <PickerSection
              title={t("picker.sections.meters", { defaultValue: "Meters" })}
              items={groupedPickerOptions.meters}
              selectedId={selectedMeter?.id ?? null}
              onSelect={handlePickMeter}
            />
            {filteredMeterPickerOptions.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">
                {t("picker.empty", { defaultValue: "No results" })}
              </div>
            )}
          </div>
        </div>
      }
      closeLabel={t("picker.close", { defaultValue: "Close" })}
      onClose={() => {
        setPickerOpen(false);
        setPickerSearch("");
      }}
    />
  </>
  );
};

export default ElectricMeter;

function PickerSection({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: MeterOption[];
  selectedId: string | null;
  onSelect: (opt: MeterOption) => void;
}) {
  const { t } = useTranslation(["electricMeter"]);
  const DEFAULT_LIMIT = 60;
  const [limit, setLimit] = React.useState(DEFAULT_LIMIT);

  React.useEffect(() => {
    setLimit(DEFAULT_LIMIT);
  }, [items]);

  if (!items.length) return null;
  const visibleItems = items.slice(0, limit);
  const hasMore = items.length > visibleItems.length;
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="sticky top-0 z-10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title} ({items.length.toLocaleString()})
      </div>
      <div className="py-1">
        {visibleItems.map((opt) => {
          const active = Boolean(selectedId && opt.id === selectedId);
          const buildingTag = (opt.tags ?? []).find((tag) =>
            String(tag).toLowerCase().startsWith("building:")
          );
          const buildingName = buildingTag
            ? String(buildingTag).slice("building:".length).trim()
            : null;
          const subtitle =
            opt.scope === "overview" || opt.isOverall
              ? t("picker.meta.included", {
                  count: opt.includedMeters ?? 0,
                  defaultValue: `Includes ${opt.includedMeters ?? 0} meters`,
                })
              : opt.scope === "tag"
              ? t("picker.meta.included", {
                  count: opt.includedMeters ?? 0,
                  defaultValue: `Includes ${opt.includedMeters ?? 0} meters`,
                })
              : buildingName
              ? t("picker.meta.building", {
                  name: buildingName,
                  defaultValue: `Building: ${buildingName}`,
                })
              : opt.description || opt.location || "";
          const dot =
            opt.status === "online"
              ? "bg-emerald-500"
              : opt.status === "warning"
              ? "bg-amber-500"
              : "bg-rose-500";

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt)}
              className={[
                "flex w-full items-start justify-between gap-3 px-4 py-2 text-left hover:bg-slate-50 cursor-pointer",
                active ? "bg-cyan-50" : "",
              ].join(" ")}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {opt.scope === "overview" || opt.isOverall
                      ? t("view.overallLabel", {
                          defaultValue: "All meters summary",
                        })
                      : opt.scope === "tag"
                      ? t("view.buildingPrefix", {
                          name: opt.name,
                          defaultValue: `Building: ${opt.name}`,
                        })
                      : opt.name}
                  </span>
                  {active && (
                    <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {t("view.selectedBadge", { defaultValue: "Selected" })}
                    </span>
                  )}
                </div>
                {subtitle ? (
                  <div className="truncate text-xs text-slate-500">
                    {subtitle}
                  </div>
                ) : null}
              </div>
              <span className="mt-1 inline-flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              </span>
            </button>
          );
        })}
        {hasMore ? (
          <button
            type="button"
            onClick={() => setLimit((prev) => prev + 80)}
            className="w-full px-4 py-2 text-left text-sm font-semibold text-cyan-700 hover:bg-cyan-50 cursor-pointer"
          >
            {t("picker.showMore", { defaultValue: "Show more" })}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function mapDeviceToMeterOption(device: any, siteLabel: string, locale: string): MeterOption {
  const meta = (device?.meta ?? {}) as Record<string, any>;
  const details = (meta?.details ?? {}) as Record<string, any>;
  const tags = Array.isArray(meta?.tags) ? meta.tags.map((t: any) => String(t)) : [];
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
    scope: "meter",
    tags,
    description: details?.description ?? meta?.description ?? undefined,
    status,
    lastReading: "-",
    lastSync: device?.last_seen
      ? formatDateTime(device.last_seen, locale)
      : "-",
    todayKwh: 0,
    location: details?.location ?? "-",
    billingMonth: new Date().toLocaleString(locale, {
      month: "long",
      year: "numeric",
    }),
    billingStatus: (meta?.billingStatus as any) ?? "pending",
    billingOutstandingMonth:
      meta?.billingOutstandingMonth ?? undefined,
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

function formatDateTime(value: string | Date, locale = "th-TH") {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale, {
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

function computeFixedRange({
  locale,
  thisMonthLabel,
  lastMonthLabel,
  toPresentLabel,
}: {
  locale: string;
  thisMonthLabel: string;
  lastMonthLabel: string;
  toPresentLabel: string;
}): FixedRangeInfo {
  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endThisMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return {
    startIso: startThisMonth.toISOString(),
    endIso: endThisMonth.toISOString(),
    label: `${thisMonthLabel}: ${formatRangeDate(startThisMonth, locale)} - ${formatRangeDate(
      endThisMonth,
      locale
    )} ${toPresentLabel} | ${lastMonthLabel}: ${formatRangeDate(
      startLastMonth,
      locale
    )} - ${formatRangeDate(endLastMonth, locale)}`,
  };
}

function formatRangeDate(date: Date, locale = "th-TH") {
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
