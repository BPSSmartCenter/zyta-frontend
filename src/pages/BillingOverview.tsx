import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Dashboard/Navbar";
import { useFilters } from "../context/FiltersContext";
import { StatCardGroup } from "../components/StatCard";
import StatCard from "../components/StatCard";
import { useDeviceInventory, getCountForType } from "../context/DeviceInventoryContext";
import { useDeviceInventoryLoader } from "../hooks/useDeviceInventoryLoader";
import {
  cyanBolt,
  whiteBolt,
  cyanBaht,
  whiteBaht,
  cyanTrend,
  whiteTrend,
} from "../assets";
import { useUserPath } from "../routes/useUserPath";
import Modal from "../components/Modal";
import SearchInput from "../components/SearchInput";
import {
  deleteBill,
  getBillingOverview,
  type BillingMonitorRow,
  type BillingOverviewPayload,
} from "../api/billing";
import { getElectricDevices } from "../api/electric";
import { getMeterDashboard, type MeterDashboard } from "../api/meter";
import { MonthlyChart } from "../components/Chart";

type CardConfig = {
  id: string;
  labelKey: string;
  defaultLabel: string;
  img: string;
  activeImg: string;
  labelClassName?: string;
};

const CARD_CONFIG: CardConfig[] = [
  {
    id: "usage",
    labelKey: "overview.cards.usage",
    defaultLabel: "Total usage (kWh)",
    img: cyanBolt,
    activeImg: whiteBolt,
  },
  {
    id: "billing",
    labelKey: "overview.cards.billing",
    defaultLabel: "Bill amount this month",
    img: cyanBaht,
    activeImg: whiteBaht,
    labelClassName: "text-[10px] uppercase tracking-wide",
  },
  {
    id: "trend",
    labelKey: "overview.cards.trend",
    defaultLabel: "Monthly trend",
    img: cyanTrend,
    activeImg: whiteTrend,
  },
] as const;

type RealtimeRow = {
  meterId: string;
  meter: string;
  site?: string;
  onPeak: number | null;
  offPeak: number | null;
  timestamp?: string | null;
};

type BillingRow = BillingMonitorRow;

const BillingOverview: React.FC = () => {
  const { t, i18n } = useTranslation(["billing"]);
  const locale = React.useMemo(
    () => ((i18n.language || "th").toLowerCase().startsWith("th") ? "th-TH" : "en-US"),
    [i18n.language]
  );
  const overviewText = React.useMemo(
    () => ({
      title: t("overview.title", { defaultValue: "Billing Overview" }),
      subtitle: t("overview.subtitle", {
        defaultValue: "Overall usage and billing data from backend",
      }),
      realtime: {
        heading: t("overview.realtime.heading", { defaultValue: "Real-Time Monitor" }),
        description: t("overview.realtime.description", {
          defaultValue: "Latest readings from gateway",
        }),
        searchPlaceholder: t("overview.realtime.searchPlaceholder", {
          defaultValue: "Search readings...",
        }),
        buttons: {
          refresh: t("overview.realtime.buttons.refresh", { defaultValue: "Refresh" }),
          generate: t("overview.realtime.buttons.generate", {
            defaultValue: "Generate Bills",
          }),
          monitor: t("overview.realtime.buttons.monitor", { defaultValue: "Monitor" }),
        },
        table: {
          meter: t("overview.realtime.table.meter", { defaultValue: "Meter" }),
          onPeak: t("overview.realtime.table.onPeak", {
            defaultValue: "Energy On Peak (kWh)",
          }),
          offPeak: t("overview.realtime.table.offPeak", {
            defaultValue: "Energy Off Peak (kWh)",
          }),
          timestamp: t("overview.realtime.table.timestamp", {
            defaultValue: "Timestamp",
          }),
          actions: t("overview.realtime.table.actions", { defaultValue: "Actions" }),
        },
        loading: t("overview.realtime.loading", {
          defaultValue: "Loading data...",
        }),
        empty: t("overview.realtime.empty", {
          defaultValue: "No readings match the filters",
        }),
        siteLabel: t("overview.realtime.siteLabel", { defaultValue: "Site" }),
        defaultDevice: t("overview.realtime.defaultDevice", { defaultValue: "Meter" }),
        fallbackDeviceName: t("overview.realtime.fallbackMeterName", {
          defaultValue: "Meter {{id}}",
          id: "",
        }),
      },
      errors: {
        gateway: t("overview.errors.gateway", {
          defaultValue: "Unable to load values from gateway",
        }),
        delete: t("overview.errors.delete", {
          defaultValue: "Unable to delete bill, please try again",
        }),
        fetch: t("overview.errors.fetchBilling", {
          defaultValue: "Unable to fetch billing data right now",
        }),
      },
      billing: {
        heading: t("overview.billing.heading", { defaultValue: "Billing Records" }),
        description: t("overview.billing.description", {
          defaultValue: "Issued bills with saved documents",
        }),
        searchPlaceholder: t("overview.billing.searchPlaceholder", {
          defaultValue: "Search bills...",
        }),
        table: {
          meter: t("overview.billing.table.meter", { defaultValue: "Meter" }),
          billingPeriod: t("overview.billing.table.billingPeriod", {
            defaultValue: "Billing period",
          }),
          usage: t("overview.billing.table.usage", { defaultValue: "Usage (kWh)" }),
          cost: t("overview.billing.table.cost", { defaultValue: "Cost (THB)" }),
          timestamp: t("overview.billing.table.timestamp", { defaultValue: "Timestamp" }),
          actions: t("overview.billing.table.actions", { defaultValue: "Actions" }),
        },
        loading: t("overview.billing.loading", {
          defaultValue: "Loading bills...",
        }),
        empty: t("overview.billing.empty", {
          defaultValue: "No bills found for this period",
        }),
        buttons: {
          preview: t("overview.billing.buttons.preview", { defaultValue: "Preview" }),
          delete: t("overview.billing.buttons.delete", { defaultValue: "Delete" }),
        },
      },
      trend: {
        chartTitle: t("overview.trend.chartTitle", { defaultValue: "Monthly Trend Chart" }),
        tableTitle: t("overview.trend.tableTitle", { defaultValue: "Monthly Trend Table" }),
        tableSubtitle: t("overview.trend.tableSubtitle", {
          defaultValue: "Monthly electricity totals",
        }),
        searchPlaceholder: t("overview.trend.searchPlaceholder", {
          defaultValue: "Search month...",
        }),
        table: {
          month: t("overview.trend.table.month", { defaultValue: "Month" }),
          cost: t("overview.trend.table.cost", { defaultValue: "Cost (THB)" }),
          usage: t("overview.trend.table.usage", { defaultValue: "Usage (kWh)" }),
          timestamp: t("overview.trend.table.timestamp", { defaultValue: "Timestamp" }),
        },
        empty: t("overview.trend.table.empty", {
          defaultValue: "No monthly data available",
        }),
      },
      siteGuard: {
        blocked: {
          title: t("overview.siteGuard.blocked.title", {
            defaultValue: "Billing is not available",
          }),
          message: t("overview.siteGuard.blocked.message", {
            defaultValue: "This site has no compatible devices. Please choose another site.",
          }),
          close: t("overview.siteGuard.blocked.close", { defaultValue: "Go back" }),
        },
        select: {
          title: t("overview.siteGuard.select.title", {
            defaultValue: "Please select a site",
          }),
          message: t("overview.siteGuard.select.message", {
            defaultValue: "Choose a site from the navbar before using billing features.",
          }),
          close: t("overview.siteGuard.select.close", { defaultValue: "OK" }),
        },
      },
      modal: {
        title: t("overview.modals.delete.title", {
          defaultValue: "Delete this bill?",
        }),
        meterLabel: t("overview.modals.delete.meterLabel", { defaultValue: "Meter:" }),
        billingLabel: t("overview.modals.delete.billingLabel", {
          defaultValue: "Billing period:",
        }),
        warning: t("overview.modals.delete.warning", {
          defaultValue: "This action cannot be undone",
        }),
        confirm: t("overview.modals.delete.confirm", { defaultValue: "Delete bill" }),
        cancel: t("overview.modals.delete.cancel", { defaultValue: "Cancel" }),
      },
    }),
    [t]
  );
  const fallbackDeviceLabel = React.useMemo(
    () => t("overview.realtime.defaultDevice", { defaultValue: "Meter" }),
    [t]
  );
  const fallbackMeterName = React.useCallback(
    (id: string) =>
      t("overview.realtime.fallbackMeterName", {
        id,
        defaultValue: "Meter {{id}}",
      }),
    [t]
  );
  const realtimeGatewayError = overviewText.errors.gateway;
  const fetchBillingError = overviewText.errors.fetch;
  const deleteBillingError = overviewText.errors.delete;
  const {
    searchSite,
    setSearchSite,
    siteOptions,
    selectedSite,
    setSelectedSite,
    date,
    setDate,
  } = useFilters();
  const navigate = useNavigate();
  const { abs } = useUserPath();
  const { counts: inventoryCounts, loading: inventoryLoading } = useDeviceInventory();
  const [siteGuardType, setSiteGuardType] = React.useState<"none" | "select" | "blocked">("none");

  const [activeCard, setActiveCard] = React.useState<string>("usage");
  const [tableSearch, setTableSearch] = React.useState("");
  const [realtimeRows, setRealtimeRows] = React.useState<RealtimeRow[]>([]);
const [realtimeLoading, setRealtimeLoading] = React.useState(false);
const [realtimeError, setRealtimeError] = React.useState<string | null>(null);
const [monthlySearch, setMonthlySearch] = React.useState("");
const [billingSearch, setBillingSearch] = React.useState("");
const [deleteTarget, setDeleteTarget] = React.useState<BillingRow | null>(null);

  const normalizedSite = (selectedSite ?? "").trim();
  const requiresSiteSelection = !normalizedSite || normalizedSite === "all";
  useDeviceInventoryLoader({
    selectedSiteCode: !requiresSiteSelection ? normalizedSite : undefined,
    enabled: !requiresSiteSelection,
  });

  const {
    data: billingData,
    loading,
    error,
    refresh,
  } = useBillingOverviewData(requiresSiteSelection ? null : normalizedSite, fetchBillingError);

  const fetchRealtimeRowsForSite = React.useCallback(
    async (siteCode: string) => {
      const devicesResp = await getElectricDevices(siteCode);
      const deviceItems = normalizeDeviceList(devicesResp, fallbackDeviceLabel);
      if (!deviceItems.length) return [];
      const dashboards = await Promise.allSettled(
        deviceItems.map((device) => getMeterDashboard(device.id))
      );
      const rows: RealtimeRow[] = [];
      dashboards.forEach((result) => {
        if (result.status !== "fulfilled") return;
        const mapped = dashboardToRealtimeRow(result.value, fallbackMeterName);
        if (mapped) rows.push(mapped);
      });
      rows.sort((a, b) => compareTimestampDesc(a.timestamp, b.timestamp));
      return rows;
    },
    [fallbackDeviceLabel, fallbackMeterName]
  );

  React.useEffect(() => {
    if (requiresSiteSelection) {
      setRealtimeRows([]);
      setRealtimeError(null);
      setRealtimeLoading(false);
      return;
    }
    let cancelled = false;
    setRealtimeLoading(true);
    setRealtimeError(null);
    fetchRealtimeRowsForSite(normalizedSite)
      .then((rows) => {
        if (!cancelled) setRealtimeRows(rows);
      })
      .catch((err) => {
        console.error("[BillingOverview] load realtime failed", err);
        if (!cancelled) {
          setRealtimeRows([]);
          setRealtimeError(realtimeGatewayError);
        }
      })
      .finally(() => {
        if (!cancelled) setRealtimeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requiresSiteSelection, normalizedSite, fetchRealtimeRowsForSite, realtimeGatewayError]);

  const handleRefreshRealtime = React.useCallback(() => {
    if (requiresSiteSelection) return;
    setRealtimeLoading(true);
    setRealtimeError(null);
    fetchRealtimeRowsForSite(normalizedSite)
      .then((rows) => setRealtimeRows(rows))
      .catch((err) => {
        console.error("[BillingOverview] load realtime failed", err);
        setRealtimeRows([]);
        setRealtimeError(realtimeGatewayError);
      })
      .finally(() => setRealtimeLoading(false));
  }, [
    requiresSiteSelection,
    normalizedSite,
    fetchRealtimeRowsForSite,
    realtimeGatewayError,
  ]);

  const filteredRealtimeRows = React.useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    if (!term) return realtimeRows;
    return realtimeRows.filter((row) => {
      const haystack = [row.meter, row.site ?? ""].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [realtimeRows, tableSearch]);

  const realtimeUsageTotal = React.useMemo(() => {
    if (!realtimeRows.length) return 0;
    return realtimeRows.reduce((sum, row) => {
      const on = row.onPeak ?? 0;
      const off = row.offPeak ?? 0;
      return sum + on + off;
    }, 0);
  }, [realtimeRows]);

  const billingRows = React.useMemo(() => billingData?.billingRows ?? [], [billingData]);
  const filteredBillingRows = React.useMemo(() => {
    const term = billingSearch.trim().toLowerCase();
    if (!term) return billingRows;
    return billingRows.filter((row) => {
      const haystack = [row.meter, row.site ?? "", row.user ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [billingRows, billingSearch]);

  const monthlyList = React.useMemo(() => billingData?.monthlyList ?? [], [billingData]);
  const filteredMonthlyList = React.useMemo(() => {
    const term = monthlySearch.trim().toLowerCase();
    if (!term) return monthlyList;
    return monthlyList.filter((row) => row.month.toLowerCase().includes(term));
  }, [monthlyList, monthlySearch]);

  const cardItems = React.useMemo(() => {
    const cards = billingData?.cards;
    return CARD_CONFIG.map((card) => {
      const label = t(card.labelKey, { defaultValue: card.defaultLabel });
      let valueDisplay = loading ? "..." : "-";
      if (card.id === "usage") {
        valueDisplay = realtimeUsageTotal.toLocaleString(locale, {
          maximumFractionDigits: 2,
        });
      } else if (card.id === "billing") {
        const billAmount = cards?.billAmountThisMonth ?? 0;
        valueDisplay = billAmount.toLocaleString(locale, {
          style: "currency",
          currency: "THB",
          minimumFractionDigits: 2,
        });
      } else if (card.id === "trend") {
        const val = cards?.monthlyTrendPercent ?? 0;
        valueDisplay = `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
      }
      return { ...card, value: valueDisplay, label };
    });
  }, [billingData, loading, realtimeUsageTotal, t, locale]);

  const electricDeviceCount = getCountForType(inventoryCounts as any, "electricmeter" as any);
  const noElectricAccess =
    !requiresSiteSelection &&
    normalizedSite !== "all" &&
    !inventoryLoading &&
    electricDeviceCount <= 0;

  React.useEffect(() => {
    if (requiresSiteSelection) setSiteGuardType("select");
    else if (noElectricAccess) setSiteGuardType("blocked");
    else setSiteGuardType("none");
  }, [requiresSiteSelection, noElectricAccess]);
  const siteGuardOpen = siteGuardType !== "none";

  const handleSiteGuardClose = React.useCallback(() => {
    setSiteGuardType("none");
    navigate(abs("/dashboard"), { replace: true });
  }, [navigate, abs]);

  const handleRowSelect = React.useCallback(
    (row: RealtimeRow) => {
      if (!row.meterId) return;
      const target = `${abs("/electric/meter")}?meterId=${encodeURIComponent(
        row.meterId
      )}`;
      navigate(target);
    },
    [navigate, abs]
  );

  const handleBillingPreview = React.useCallback(
    (row: BillingRow) => {
      if (!row.id) return;
      const params = new URLSearchParams({
        billId: row.id,
        mode: "monthly",
      });
      if (typeof row.billingPeriodMonth === "number") {
        params.set("billingMonth", String(row.billingPeriodMonth));
      }
      if (typeof row.billingPeriodYear === "number") {
        params.set("billingYear", String(row.billingPeriodYear));
      }
      navigate(`${abs("/electric/generate-bill/preview")}?${params.toString()}`);
    },
    [navigate, abs]
  );
  const handleDeleteRequest = React.useCallback((row: BillingRow) => {
    if (!row?.id) return;
    setDeleteTarget(row);
  }, []);
  const handleDeleteConfirm = React.useCallback(
    (row?: BillingRow | null) => {
      const target = row ?? deleteTarget;
      if (!target?.id) return;
      const targetId = target.id;
      setDeleteTarget(null);
      deleteBill(targetId)
        .then(() => {
          refresh();
        })
        .catch((err) => {
          const message =
            err instanceof Error
              ? err.message
              : deleteBillingError;
          alert(message || deleteBillingError);
        });
    },
    [deleteTarget, refresh, deleteBillingError]
  );
  const handleDeleteCancel = React.useCallback(() => {
    setDeleteTarget(null);
  }, []);
  const handleCardChange = React.useCallback((ids: string[]) => {
    if (!ids.length) return;
    setActiveCard(ids[0]);
  }, []);

  const siteGuardConfig =
    siteGuardType === "blocked"
      ? overviewText.siteGuard.blocked
      : overviewText.siteGuard.select;

  return (
    <Sidebar>
      <div className="min-h-screen bg-slate-50">
        <Navbar
          searchSite={searchSite}
          setSearchSite={setSearchSite}
          siteOptions={siteOptions}
          selectedSite={selectedSite}
          setSelectedSite={setSelectedSite}
          date={date as any}
          setDate={setDate as any}
        />

        <div className="mx-auto w-full  px-6 pb-16">
          <div className="mt-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              {overviewText.title}
            </h1>
            <p className="text-sm text-slate-500">{overviewText.subtitle}</p>
          </div>

          {error && (
            <div className="mt-4 rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 px-4 py-1 overflow-auto">
            <StatCardGroup
              selectionMode="single"
              activeIds={[activeCard]}
              onChange={handleCardChange}
              className="flex flex-wrap gap-4"
            >
              {cardItems.map((card) => (
                <StatCard
                  key={card.id}
                  id={card.id}
                  counting={card.value}
                  label={card.label}
                  img={card.img}
                  activeImg={card.activeImg}
                  activeBg="bg-[#1db5ff]"
                  inactiveBg="bg-white"
                  labelClassName={
                    card.labelClassName ?? "text-[12px] uppercase tracking-wide"
                  }
                />
              ))}
            </StatCardGroup>
          </div>

          {activeCard === "usage" && realtimeError && (
            <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
              {realtimeError}
            </div>
          )}

          {activeCard === "usage" && (
            <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-[0_20px_35px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {overviewText.realtime.heading}
                </h2>
                <p className="text-sm text-slate-500">{overviewText.realtime.description}</p>
              </div>
              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                <div className="md:w-64">
                  <SearchInput
                    value={tableSearch}
                    onChange={setTableSearch}
                    placeholder={overviewText.realtime.searchPlaceholder}
                    disableMenu={true}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="rounded-md border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 cursor-pointer"
                    onClick={handleRefreshRealtime}
                  >
                    {overviewText.realtime.buttons.refresh}
                  </button>
                  <button
                    className="rounded-md border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(abs("/electric/generate-bill"))}
                  >
                    {overviewText.realtime.buttons.generate}
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] table-fixed">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 text-left">{overviewText.realtime.table.meter}</th>
                    <th className="px-6 py-3 text-left">{overviewText.realtime.table.onPeak}</th>
                    <th className="px-6 py-3 text-left">{overviewText.realtime.table.offPeak}</th>
                    <th className="px-6 py-3 text-left">{overviewText.realtime.table.timestamp}</th>
                    <th className="px-6 py-3 text-center">{overviewText.realtime.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {realtimeLoading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                        {overviewText.realtime.loading}
                      </td>
                    </tr>
                  )}
                  {!realtimeLoading &&
                    filteredRealtimeRows.map((row) => {
                      const onPeakDisplay =
                        row.onPeak !== null ? formatRealtimeValue(row.onPeak, locale) : "-";
                      const offPeakDisplay =
                        row.offPeak !== null ? formatRealtimeValue(row.offPeak, locale) : "-";
                      const timestampDisplay = formatRealtimeTimestamp(row.timestamp, locale);
                      return (
                        <tr
                          key={row.meterId}
                          className="border-t border-gray-100 text-sm text-slate-700"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                             <span className="font-semibold text-slate-900">{row.meter}</span>
                              <span className="text-xs text-slate-500">
                                {overviewText.realtime.siteLabel}: {row.site ?? "-"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">{onPeakDisplay}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">{offPeakDisplay}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">
                              {timestampDisplay}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center">
                              <button
                                className="inline-flex items-center gap-2 rounded-full border border-cyan-200 px-4 py-1.5 text-xs font-semibold text-cyan-700 hover:border-cyan-300 hover:bg-cyan-50"
                                onClick={() => handleRowSelect(row)}
                              >
                                {overviewText.realtime.buttons.monitor}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
          {!realtimeLoading && filteredRealtimeRows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                {overviewText.realtime.empty}
              </td>
            </tr>
          )}
        </tbody>
              </table>
            </div>
          </div>
          )}

          {activeCard === "billing" && (
            <div className="mt-10 rounded-3xl border border-gray-200 bg-white shadow-[0_20px_35px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {overviewText.billing.heading}
                </h2>
                <p className="text-sm text-slate-500">{overviewText.billing.description}</p>
              </div>
              <div className="md:w-64">
                <SearchInput
                  value={billingSearch}
                  onChange={setBillingSearch}
                  placeholder={overviewText.billing.searchPlaceholder}
                  disableMenu={true}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] table-fixed">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 text-left">{overviewText.billing.table.meter}</th>
                    <th className="px-6 py-3 text-left">
                      {overviewText.billing.table.billingPeriod}
                    </th>
                    <th className="px-6 py-3 text-left">{overviewText.billing.table.usage}</th>
                    <th className="px-6 py-3 text-left">{overviewText.billing.table.cost}</th>
                    <th className="px-6 py-3 text-left">
                      {overviewText.billing.table.timestamp}
                    </th>
                    <th className="px-6 py-3 text-center">
                      {overviewText.billing.table.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !billingData && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">
                        {overviewText.billing.loading}
                      </td>
                    </tr>
                  )}
                  {filteredBillingRows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100 text-sm text-slate-700">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{row.meter}</span>
                          <span className="text-xs text-slate-500">
                            {overviewText.realtime.siteLabel}: {row.site ?? "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {formatBillingPeriod(row, locale)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {formatValue(row.usageKwh ?? 0, locale)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(row.billingCost ?? 0, locale)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {row.timestamp ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-200 px-4 py-1.5 text-xs font-semibold text-cyan-700 hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => handleBillingPreview(row)}
                            disabled={!row.id}
                          >
                            {overviewText.billing.buttons.preview}
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-700 hover:border-red-300 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => handleDeleteRequest(row)}
                            disabled={!row.id}
                          >
                            {overviewText.billing.buttons.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredBillingRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">
                        {overviewText.billing.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {activeCard === "trend" && (
            <div className="mt-10 space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white shadow-[0_20px_35px_rgba(15,23,42,0.08)] p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  {overviewText.trend.chartTitle}
                </h2>
                <MonthlyChart
                  categories={billingData?.monthlyChart?.categories}
                  series={billingData?.monthlyChart?.series}
                  meta={monthlyList.map((row) => ({
                    month: row.month,
                    cost: row.cost,
                    usage: row.usageTotalKwh,
                  }))}
                />
              </div>
              <div className="rounded-3xl border border-gray-200 bg-white shadow-[0_20px_35px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {overviewText.trend.tableTitle}
                    </h2>
                    <p className="text-sm text-slate-500">{overviewText.trend.tableSubtitle}</p>
                  </div>
                  <div className="md:w-64">
                    <SearchInput
                      value={monthlySearch}
                      onChange={setMonthlySearch}
                      placeholder={overviewText.trend.searchPlaceholder}
                      disableMenu={true}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] table-fixed">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-3 text-left">{overviewText.trend.table.month}</th>
                        <th className="px-6 py-3 text-left">{overviewText.trend.table.cost}</th>
                        <th className="px-6 py-3 text-left">{overviewText.trend.table.usage}</th>
                        <th className="px-6 py-3 text-left">
                          {overviewText.trend.table.timestamp}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMonthlyList.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100 text-sm text-slate-700">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900">{row.month}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900">
                              {row.cost.toLocaleString(locale, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900">
                              {row.usageTotalKwh.toLocaleString(locale, {
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900">
                              {formatHistoryTimestamp(row.updatedAt, locale)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredMonthlyList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-6 text-center text-sm text-slate-500">
                            {overviewText.trend.empty}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <Modal
        open={siteGuardOpen}
        id="billing-site-required"
        icon="cancel"
        title={siteGuardConfig.title}
        message={siteGuardConfig.message}
        closeLabel={siteGuardConfig.close}
        onClose={handleSiteGuardClose}
      />
      <Modal
        open={Boolean(deleteTarget)}
        id="billing-delete-confirm"
        icon="warning"
        title={overviewText.modal.title}
        message={
          deleteTarget ? (
            <div className="text-sm text-slate-600 space-y-1">
              <p>
                {overviewText.modal.meterLabel}{" "}
                <span className="font-semibold">{deleteTarget.meter ?? "-"}</span>
              </p>
              <p>
                {overviewText.modal.billingLabel} {formatBillingPeriod(deleteTarget, locale)}
              </p>
              <p className="text-red-600">{overviewText.modal.warning}</p>
            </div>
          ) : undefined
        }
        confirmLabel={overviewText.modal.confirm}
        cancelLabel={overviewText.modal.cancel}
        onConfirm={() => handleDeleteConfirm(deleteTarget)}
        onClose={handleDeleteCancel}
      />
    </Sidebar>
  );
};

function parseTimestamp(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function compareTimestampDesc(a?: string | null, b?: string | null) {
  const dateA = parseTimestamp(a);
  const dateB = parseTimestamp(b);
  if (dateA && dateB) return dateB.getTime() - dateA.getTime();
  if (dateA) return -1;
  if (dateB) return 1;
  return 0;
}

function formatRealtimeValue(value: number, locale?: string) {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function formatValue(value: number, locale: string) {
  return Number(value ?? 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(value: number, locale: string) {
  return Number(value ?? 0).toLocaleString(locale, {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  });
}

function normalizeDeviceList(payload: any, fallbackName: string) {
  const source =
    payload?.items ??
    payload?.data?.items ??
    payload?.data ??
    payload ??
    [];
  if (!Array.isArray(source)) return [];
  return source
    .map((item) => {
      const rawId = item?.id ?? item?.model;
      if (!rawId) return null;
      const normalizedId = typeof rawId === "string" ? rawId : String(rawId);
      const meta = (item?.meta ?? {}) as Record<string, any>;
      const details = (meta.details ?? {}) as Record<string, any>;
      const category = String(
        meta.deviceCategory ?? meta.device_type ?? item?.category ?? ""
      ).toLowerCase();
      if (category && category !== "meter") return null;
      const fallback =
        typeof normalizedId === "string"
          ? normalizedId.split(":").pop()
          : undefined;
      return {
        id: normalizedId,
        name:
          details.name ??
          item?.name ??
          fallback ??
          fallbackName,
        siteName: item?.siteName ?? details.site ?? undefined,
      };
    })
    .filter(Boolean) as Array<{ id: string; name: string; siteName?: string }>;
}

function dashboardToRealtimeRow(
  dashboard: MeterDashboard,
  fallbackMeterName: (id: string) => string
): RealtimeRow | null {
  if (!dashboard?.device?.id) return null;
  const realtime = dashboard.realtime ?? dashboard.lastReading ?? null;
  const onPeak =
    typeof realtime?.onPeakKwh === "number" ? realtime.onPeakKwh : null;
  const offPeak =
    typeof realtime?.offPeakKwh === "number" ? realtime.offPeakKwh : null;
  const timestamp = realtime?.timestamp ?? null;
  return {
    meterId: dashboard.device.id,
    meter:
      dashboard.device.name ??
      dashboard.device.serial ??
      fallbackMeterName(dashboard.device.id),
    site: dashboard.device.siteName ?? undefined,
    onPeak,
    offPeak,
    timestamp,
  };
}

function formatRealtimeTimestamp(value?: string | null, locale = "th-TH") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const fmt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(date);
}

function formatBillingPeriod(row: BillingRow, locale = "th-TH") {
  if (
    typeof row.billingPeriodMonth === "number" &&
    typeof row.billingPeriodYear === "number"
  ) {
    const date = new Date(row.billingPeriodYear, row.billingPeriodMonth - 1, 1);
    return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }
  if (row.timestamp) return row.timestamp.slice(0, 7);
  return "-";
}

function formatHistoryTimestamp(value?: string | null, locale = "th-TH") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const fmt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(date);
}

function useBillingOverviewData(siteId: string | null, errorFallback: string) {
  const [state, setState] = React.useState<{
    data: BillingOverviewPayload | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });
  const refresh = React.useCallback(() => {
    if (!siteId) {
      setState({ data: null, loading: false, error: null });
      return Promise.resolve();
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    return getBillingOverview(siteId)
      .then((payload) => {
        setState({ data: payload, loading: false, error: null });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : errorFallback;
        setState({ data: null, loading: false, error: message });
      });
  }, [siteId, errorFallback]);

  React.useEffect(() => {
    refresh().catch(() => undefined);
  }, [siteId, refresh]);

  return { ...state, refresh };
}

export default BillingOverview;
