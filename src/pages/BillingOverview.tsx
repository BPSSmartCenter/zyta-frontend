import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  exportImage,
} from "../assets";
import { useUserPath } from "../routes/useUserPath";
import { MonthlyChart } from "../components/Chart";
import Modal from "../components/Modal";
import SearchInput from "../components/SearchInput";
import {
  downloadBillPdf,
  deleteBill,
  getBillingOverview,
  type BillingMonitorRow,
  type BillingOverviewPayload,
} from "../api/billing";
import { saveBlobAsFile } from "../utils/download";

type MonitorRow = BillingMonitorRow;
type CardConfig = {
  id: string;
  label: string;
  img: string;
  activeImg: string;
  labelClassName?: string;
};

const CARD_CONFIG: CardConfig[] = [
  {
    id: "usage",
    label: "Total usage (kWh)",
    img: cyanBolt,
    activeImg: whiteBolt,
  },
  {
    id: "billing",
    label: "Bill amount this month",
    img: cyanBaht,
    activeImg: whiteBaht,
    labelClassName: "text-[10px] uppercase tracking-wide",
  },
  {
    id: "trend",
    label: "Monthly trend",
    img: cyanTrend,
    activeImg: whiteTrend,
  },
] as const;

const BillingOverview: React.FC = () => {
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
  const location = useLocation();
  const { abs } = useUserPath();
  const { counts: inventoryCounts, loading: inventoryLoading } = useDeviceInventory();
  const [siteGuardType, setSiteGuardType] = React.useState<"none" | "select" | "blocked">("none");

  const [activeCard, setActiveCard] = React.useState<string>("usage");
  const [downloadingBillId, setDownloadingBillId] = React.useState<
    string | null
  >(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MonitorRow | null>(
    null
  );
  const [deletingBillId, setDeletingBillId] = React.useState<string | null>(
    null
  );

  const requestedCard = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get("view");
    const isValid = CARD_CONFIG.some((card) => card.id === view);
    return isValid ? view : null;
  }, [location.search]);

  React.useEffect(() => {
    if (requestedCard) setActiveCard(requestedCard);
  }, [requestedCard]);

  const handleCardChange = React.useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setActiveCard(ids[0]);
  }, []);

  const notifyMissingPdf = React.useCallback(() => {
    alert("ยังไม่มีไฟล์ PDF ที่บันทึกไว้สำหรับบิลนี้");
  }, []);

  const handleDownloadBill = React.useCallback(async (billId: string) => {
    setDownloadingBillId(billId);
    try {
      const blob = await downloadBillPdf(billId);
      saveBlobAsFile(blob, `bill-${billId}.pdf`);
    } catch (err) {
      console.error("[BillingOverview] download bill pdf failed", err);
      alert("ไม่สามารถดาวน์โหลด PDF ได้ กรุณาลองใหม่");
    } finally {
      setDownloadingBillId(null);
    }
  }, []);

  const [monthlySearch, setMonthlySearch] = React.useState("");
  const [tableSearch, setTableSearch] = React.useState("");

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
    refresh: refreshDashboard,
  } = useBillingOverviewData(requiresSiteSelection ? null : normalizedSite);
  const handleDeleteModalClose = React.useCallback(() => {
    setDeleteTarget(null);
  }, []);
  const handleConfirmDelete = React.useCallback(async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletingBillId(target.id);
    try {
      await deleteBill(target.id);
      await refreshDashboard();
    } catch (err) {
      console.error("[BillingOverview] delete bill failed", err);
      alert("ไม่สามารถลบบิลได้ กรุณาลองใหม่");
    } finally {
      setDeletingBillId(null);
      setDeleteTarget(null);
    }
  }, [deleteTarget, refreshDashboard]);

  const todayRef = React.useMemo(() => new Date(), []);
  const currentMonthNumber = todayRef.getMonth() + 1;
  const currentYear = todayRef.getFullYear();
  const realtimeUsageRows = billingData?.usageRows ?? [];
  const realtimeUsageTotal = React.useMemo(() => {
    if (!realtimeUsageRows.length) return null;
    let hasValue = false;
    const total = realtimeUsageRows.reduce((acc, row) => {
      const onPeak =
        typeof row.readingOnPeakKwh === "number" ? row.readingOnPeakKwh : 0;
      const offPeak =
        typeof row.readingOffPeakKwh === "number" ? row.readingOffPeakKwh : 0;
      if (onPeak || offPeak) hasValue = true;
      return acc + onPeak + offPeak;
    }, 0);
    return hasValue ? total : null;
  }, [realtimeUsageRows]);
  const isBillingRowInCurrentMonth = React.useCallback(
    (row: MonitorRow) => {
      if (
        typeof row.billingPeriodMonth === "number" &&
        typeof row.billingPeriodYear === "number"
      ) {
        return (
          row.billingPeriodMonth === currentMonthNumber &&
          row.billingPeriodYear === currentYear
        );
      }
      if (row.issuedAt) {
        const issued = new Date(row.issuedAt);
        if (!Number.isNaN(issued.getTime())) {
          return (
            issued.getMonth() + 1 === currentMonthNumber &&
            issued.getFullYear() === currentYear
          );
        }
      }
      const parsed = extractGregorianYearMonth(row.timestamp);
      if (!parsed) return false;
      return parsed.year === currentYear && parsed.monthIndex + 1 === currentMonthNumber;
    },
    [currentMonthNumber, currentYear]
  );
  const currentMonthBillingRows = React.useMemo(() => {
    if (!billingData) return [];
    const rows = billingData.billingRows ?? [];
    return rows.filter(isBillingRowInCurrentMonth);
  }, [billingData, isBillingRowInCurrentMonth]);
  const tableRows = React.useMemo(() => {
    if (!billingData) return [];
    if (activeCard === "billing") {
      return currentMonthBillingRows;
    }
    return billingData.usageRows ?? [];
  }, [billingData, activeCard, currentMonthBillingRows]);
  const historyItems = billingData?.historyItems ?? [];
  const monthlyTrendPercentLocal = React.useMemo(() => {
    const list = billingData?.monthlyList ?? [];
    if (list.length < 2) return 0;
    const latest = typeof list[0].cost === "number" ? list[0].cost : 0;
    const previous = typeof list[1].cost === "number" ? list[1].cost : 0;
    if (previous === 0) {
      return latest === 0 ? 0 : 100;
    }
    return ((latest - previous) / previous) * 100;
  }, [billingData]);
  const rawMonthlyList = billingData?.monthlyList ?? [];
  const monthlyChartMeta = React.useMemo(() => {
    const rows = rawMonthlyList ?? [];
    return [...rows].reverse().map((row) => ({
      month: row.month,
      cost: row.cost,
      usage: row.usageTotalKwh,
    }));
  }, [rawMonthlyList]);
  const monthlyListRows = React.useMemo(() => {
    if (!monthlySearch.trim()) return rawMonthlyList;
    const term = monthlySearch.trim().toLowerCase();
    return rawMonthlyList.filter((row) => row.month.toLowerCase().includes(term));
  }, [rawMonthlyList, monthlySearch]);
  const filteredTableRows = React.useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    if (!term) return tableRows;
    return tableRows.filter((row) => {
      const textParts = [row.meter, row.user ?? "", row.site ?? ""]
        .join(" ")
        .toLowerCase();
      return textParts.includes(term);
    });
  }, [tableRows, tableSearch]);
  const displayedBillingTotal = React.useMemo(() => {
    const rows =
      activeCard === "billing" ? filteredTableRows : currentMonthBillingRows;
    if (!rows.length) return 0;
    return rows.reduce((sum, row) => {
      const cost = typeof row.billingCost === "number" ? row.billingCost : 0;
      return sum + cost;
    }, 0);
  }, [activeCard, filteredTableRows, currentMonthBillingRows]);
  const cardItems = React.useMemo(() => {
    return CARD_CONFIG.map((card) => {
      let valueDisplay = loading ? "..." : "-";
      if (card.id === "usage") {
        const usageValue = realtimeUsageRows.length ? realtimeUsageTotal ?? 0 : 0;
        valueDisplay = usageValue.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });
      } else if (card.id === "billing") {
        const localTotal = displayedBillingTotal;
        valueDisplay = localTotal.toLocaleString("th-TH", {
          style: "currency",
          currency: "THB",
          minimumFractionDigits: 2,
        });
      } else if (card.id === "trend") {
        const val = monthlyTrendPercentLocal;
        valueDisplay = `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
      }
      return { ...card, value: valueDisplay };
    });
  }, [
    loading,
    realtimeUsageRows,
    realtimeUsageTotal,
    currentMonthBillingRows,
    displayedBillingTotal,
    monthlyTrendPercentLocal,
  ]);

  const isBillingView = activeCard === "billing";
  const headerTitle = isBillingView ? "Billing" : "Real-Time Monitor";
  const headerDescription = isBillingView
    ? "สถานะบิลและยอดคงค้างจากฐานข้อมูลจริง"
    : "รายการอ่านค่าล่าสุดจากมิเตอร์ไฟฟ้า";

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
    (row: MonitorRow) => {
      if (!row.meterId) return;
      const target = `${abs("/electric/meter")}?meterId=${encodeURIComponent(
        row.meterId
      )}`;
      navigate(target);
    },
    [navigate, abs]
  );
  const handleBillingPreview = React.useCallback(
    (row: MonitorRow) => {
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
  const siteGuardConfig =
    siteGuardType === "blocked"
      ? {
          title: "ไม่สามารถใช้งาน Billing ได้",
          message: "Site นี้ยังไม่มีอุปกรณ์ไฟฟ้าที่รองรับ Billing กรุณาเลือก Site อื่น",
          closeLabel: "ย้อนกลับ",
        }
      : {
          title: "กรุณาเลือก Site ก่อนใช้งาน",
          message: "โปรดเลือก Site จากเมนูด้านบน (Navbar) เพื่อใช้งานฟีเจอร์ Billing",
          closeLabel: "โอเค",
        };

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
              Billing Overview
            </h1>
            <p className="text-sm text-slate-500">
              ภาพรวมข้อมูลการใช้งานพลังงานและบิลจากฝั่ง Backend
            </p>
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

          {activeCard === "trend" ? (
            <>
              <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-[0_20px_35px_rgba(15,23,42,0.08)] p-6">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="flex-1 rounded-3xl border border-slate-100 bg-white p-4">
                    <MonthlyChart
                      categories={billingData?.monthlyChart?.categories}
                      series={billingData?.monthlyChart?.series}
                      meta={monthlyChartMeta}
                    />
                  </div>
                  <div className="rounded-3xl border border-slate-100 bg-[#f8fafc] p-6 w-full lg:w-72">
                    <h3 className="text-xl font-semibold text-slate-900">
                      History
                    </h3>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {historyItems.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-[0_20px_35px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      List View
                    </h2>
                    <p className="text-sm text-slate-500">
                      ตัวอย่างรายการบิลรายเดือน
                    </p>
                  </div>
                  <div className="w-full md:w-64">
                    <SearchInput
                      value={monthlySearch}
                      onChange={setMonthlySearch}
                      placeholder="ค้นหาบิล..."
                      disableMenu={true}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] table-fixed">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-3 text-left">เดือน</th>
                        <th className="px-6 py-3 text-left">ค่าไฟ (บาท)</th>
                        <th className="px-6 py-3 text-left">หน่วยใช้ (kWh)</th>
                        <th className="px-6 py-3 text-left">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyListRows.map((row) => {
                        const usageDisplay = row.usageTotalKwh.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        });
                        const timestampDisplay = formatDateTime(row.updatedAt);
                        return (
                          <tr
                            key={row.id}
                            className="border-t border-gray-100 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">
                                {row.month}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">
                                {row.cost.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">
                                {usageDisplay}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">
                                {timestampDisplay}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                  <span>Page 1 of 10</span>
                  <div className="flex items-center gap-3">
                    <button className="rounded-md border border-gray-200 px-4 py-2 text-sm text-slate-600 hover:bg-gray-50 cursor-pointer">
                      Previous
                    </button>
                    <button className="rounded-md border border-gray-200 px-4 py-2 text-sm text-slate-600 hover:bg-gray-50 cursor-pointer">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-[0_20px_35px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {headerTitle}
                  </h2>
                  <p className="text-sm text-slate-500">{headerDescription}</p>
                </div>
                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                  <div className="md:w-64">
                    <SearchInput
                      value={tableSearch}
                      onChange={setTableSearch}
                      placeholder="ค้นหารายการ..."
                      disableMenu={true}
                    />
                  </div>
                  <button
                    className="rounded-md border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(abs("/electric/generate-bill"))}
                  >
                    Generate Bills
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] table-fixed">
                  <thead>
                    {isBillingView ? (
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3 text-left">Meter</th>
                      <th className="px-6 py-3 text-left">User</th>
                      <th className="px-6 py-3 text-left">หน่วยใช้ (kWh)</th>
                      <th className="px-6 py-3 text-left">ค่าไฟ (บาท)</th>
                      <th className="px-6 py-3 text-left">Timestamp</th>
                      <th className="px-6 py-3 text-center">Actions</th>
                    </tr>
                    ) : (
                      <tr className="text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-3 text-left">Meter</th>
                        <th className="px-6 py-3 text-left">Last reading</th>
                        <th className="px-6 py-3 text-left">Voltage</th>
                        <th className="px-6 py-3 text-left">Timestamp</th>
                        <th className="px-6 py-3 text-left">ARL time</th>
                        <th className="px-6 py-3 text-center">Actions</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-6 text-center text-sm text-slate-500"
                        >
                          กำลังโหลดข้อมูล...
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      filteredTableRows.map((row) => {
                        const clickable = isBillingView
                          ? Boolean(row.id)
                          : Boolean(row.meterId);
                        const onPeakValue =
                          typeof row.readingOnPeakKwh === "number"
                            ? row.readingOnPeakKwh
                            : null;
                        const offPeakValue =
                          typeof row.readingOffPeakKwh === "number"
                            ? row.readingOffPeakKwh
                            : null;
                        const totalRealtime =
                          onPeakValue !== null || offPeakValue !== null
                            ? (onPeakValue ?? 0) + (offPeakValue ?? 0)
                            : null;
                        const lastReadingDisplay =
                          totalRealtime !== null
                            ? `${totalRealtime.toLocaleString(undefined, {
                                maximumFractionDigits: 3,
                              })} kWh`
                            : row.reading ?? "-";
                        const voltageDisplay =
                          typeof row.voltage === "number"
                            ? `${row.voltage.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })} V`
                            : "-";
                        const onRowClick = isBillingView
                          ? clickable
                            ? () => handleBillingPreview(row)
                            : undefined
                          : clickable
                          ? () => handleRowSelect(row)
                          : undefined;
                        return (
                          <tr
                            key={row.id}
                            onClick={onRowClick}
                            className={[
                              "border-t border-gray-100 text-sm text-slate-700",
                              clickable
                                ? "hover:bg-slate-50 cursor-pointer"
                                : "",
                            ].join(" ")}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {row.meter}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Site: {row.site}
                                  </p>
                                </div>
                              </div>
                            </td>
                            {isBillingView ? (
                              <>
                                <td className="px-6 py-4 text-slate-700">
                                  {row.user ?? "-"}
                                </td>
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-slate-900">
                                    {row.usageKwh?.toLocaleString() ?? "-"}
                                  </p>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-slate-900">
                                    {row.billingCost?.toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }
                                    ) ?? "-"}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-slate-900">
                                    {row.timestamp ?? "-"}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {row.arlTime ?? "-"}
                                  </p>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-slate-900">
                                    {lastReadingDisplay}
                                  </p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-slate-900">
                                    {voltageDisplay}
                                  </p>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-slate-900">
                                    {row.timestamp ?? "-"}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                  {row.arlTime ?? "-"}
                                </td>
                              </>
                            )}
                            <td className="px-6 py-4">
                              {isBillingView ? (
                                <div className="flex gap-2 items-center justify-center text-slate-400">
                                  <button
                                    className={[
                                      "rounded-full border border-gray-200 p-2",
                                      isBillingView &&
                                      (!row.documentUrl ||
                                        downloadingBillId === row.id)
                                        ? "cursor-not-allowed opacity-40"
                                        : "hover:text-cyan-600 hover:border-cyan-200 cursor-pointer",
                                    ].join(" ")}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isBillingView) return;
                                      if (!row.documentUrl) {
                                        notifyMissingPdf();
                                        return;
                                      }
                                      handleDownloadBill(row.id);
                                    }}
                                    disabled={
                                      isBillingView &&
                                      (!row.documentUrl ||
                                        downloadingBillId === row.id)
                                    }
                                    title={
                                      isBillingView
                                        ? row.documentUrl
                                          ? "ดาวน์โหลด PDF"
                                          : "ยังไม่มีไฟล์ PDF"
                                        : undefined
                                    }
                                  >
                                    {isBillingView &&
                                    downloadingBillId === row.id ? (
                                      <svg
                                        className="h-3.5 w-3.5 animate-spin text-cyan-600"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <circle
                                          cx="12"
                                          cy="12"
                                          r="9"
                                          strokeOpacity="0.25"
                                        />
                                        <path d="M21 12a9 9 0 0 0-9-9" />
                                      </svg>
                                    ) : (
                                      <img
                                        src={exportImage}
                                        alt="Export"
                                        className="h-3.5 w-3.5"
                                      />
                                    )}
                                  </button>
                                  <button
                                    className={[
                                      "rounded-full border border-gray-200 p-2",
                                      deletingBillId === row.id
                                        ? "cursor-not-allowed opacity-40"
                                        : "hover:text-red-500 hover:border-red-200 cursor-pointer",
                                    ].join(" ")}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (deletingBillId) return;
                                      setDeleteTarget(row);
                                    }}
                                    disabled={deletingBillId === row.id}
                                    title="ลบบิล"
                                  >
                                    {deletingBillId === row.id ? (
                                      <svg
                                        className="h-3.5 w-3.5 animate-spin text-red-500"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <circle
                                          cx="12"
                                          cy="12"
                                          r="9"
                                          strokeOpacity="0.25"
                                        />
                                        <path d="M21 12a9 9 0 0 0-9-9" />
                                      </svg>
                                    ) : (
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                        <path d="M14 10v8" />
                                        <path d="M10 10v8" />
                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <button
                                    className="inline-flex items-center gap-2 rounded-full border border-cyan-200 px-4 py-1.5 text-xs font-semibold text-cyan-700 hover:border-cyan-300 hover:bg-cyan-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!row.meterId) return;
                                      const target = `${abs(
                                        "/electric/meter"
                                      )}?meterId=${encodeURIComponent(
                                        row.meterId
                                      )}`;
                                      navigate(target);
                                    }}
                                  >
                                    Monitor
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {!loading && filteredTableRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-6 text-center text-sm text-slate-500"
                        >
                          ไม่พบข้อมูลสำหรับเงื่อนไขปัจจุบัน
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                <span>Page 1 of 10</span>
                <div className="flex items-center gap-3">
                  <button className="rounded-md border border-gray-200 px-4 py-2 text-sm text-slate-600 hover:bg-gray-50 cursor-pointer">
                    Previous
                  </button>
                  <button className="rounded-md border border-gray-200 px-4 py-2 text-sm text-slate-600 hover:bg-gray-50 cursor-pointer">
                    Next
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-6 py-4">
                <button
                  className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 cursor-pointer"
                  onClick={() => refreshDashboard()}
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal
        open={Boolean(deleteTarget)}
        id="billing-delete-bill"
        icon="warning"
        title="ยืนยันการลบบิลนี้?"
        message={
          deleteTarget ? (
            <div className="space-y-1">
              <p>
                ต้องการลบบิลของ{" "}
                <span className="font-semibold text-slate-900">
                  {deleteTarget.meter}
                </span>{" "}
                ใช่หรือไม่?
              </p>
              {typeof deleteTarget.billingCost === "number" ? (
                <p className="text-slate-500">
                  ยอดบิล:{" "}
                  <span className="font-semibold text-slate-900">
                    {deleteTarget.billingCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    บาท
                  </span>
                </p>
              ) : null}
            </div>
          ) : undefined
        }
        confirmLabel="ยืนยันการลบ"
        cancelLabel="ยกเลิก"
        onClose={handleDeleteModalClose}
        onConfirm={handleConfirmDelete}
      />
      <Modal
        open={siteGuardOpen}
        id="billing-site-required"
        icon="cancel"
        title={siteGuardConfig.title}
        message={siteGuardConfig.message}
        closeLabel={siteGuardConfig.closeLabel}
        onClose={handleSiteGuardClose}
      />
    </Sidebar>
  );
};

function extractGregorianYearMonth(timestamp?: string | null) {
  if (!timestamp) return null;
  const normalized = String(timestamp).trim();
  if (!normalized) return null;
  const parts = normalized.split(/[-/]/);
  if (parts.length < 2) return null;
  let year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (year > 2400) {
    year -= 543;
  }
  const monthIndex = Math.min(11, Math.max(0, month - 1));
  return { year, monthIndex };
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function useBillingOverviewData(siteId: string | null) {
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
        const message =
          err instanceof Error
            ? err.message
            : "ไม่สามารถดึงข้อมูล Billing ได้ในขณะนี้";
        setState({ data: null, loading: false, error: message });
      });
  }, [siteId]);

  React.useEffect(() => {
    refresh().catch(() => undefined);
  }, [siteId, refresh]);

  return { ...state, refresh };
}

export default BillingOverview;
