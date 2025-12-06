import React from "react";
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
  getBillingOverview,
  type BillingMonitorRow,
  type BillingOverviewPayload,
} from "../api/billing";
import { getElectricDevices } from "../api/electric";
import { getMeterDashboard, type MeterDashboard } from "../api/meter";
import { MonthlyChart } from "../components/Chart";

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
  } = useBillingOverviewData(requiresSiteSelection ? null : normalizedSite);

  const fetchRealtimeRowsForSite = React.useCallback(async (siteCode: string) => {
    const devicesResp = await getElectricDevices(siteCode);
    const deviceItems = normalizeDeviceList(devicesResp);
    if (!deviceItems.length) return [];
    const dashboards = await Promise.allSettled(
      deviceItems.map((device) => getMeterDashboard(device.id))
    );
    const rows: RealtimeRow[] = [];
    dashboards.forEach((result) => {
      if (result.status !== "fulfilled") return;
      const mapped = dashboardToRealtimeRow(result.value);
      if (mapped) rows.push(mapped);
    });
    rows.sort((a, b) => compareTimestampDesc(a.timestamp, b.timestamp));
    return rows;
  }, []);

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
          setRealtimeError("ไม่สามารถโหลดค่าจาก Gateway ได้");
        }
      })
      .finally(() => {
        if (!cancelled) setRealtimeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requiresSiteSelection, normalizedSite, fetchRealtimeRowsForSite]);

  const handleRefreshRealtime = React.useCallback(() => {
    if (requiresSiteSelection) return;
    setRealtimeLoading(true);
    setRealtimeError(null);
    fetchRealtimeRowsForSite(normalizedSite)
      .then((rows) => setRealtimeRows(rows))
      .catch((err) => {
        console.error("[BillingOverview] load realtime failed", err);
        setRealtimeRows([]);
        setRealtimeError("ไม่สามารถโหลดค่าจาก Gateway ได้");
      })
      .finally(() => setRealtimeLoading(false));
  }, [requiresSiteSelection, normalizedSite, fetchRealtimeRowsForSite]);

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
      let valueDisplay = loading ? "..." : "-";
      if (card.id === "usage") {
        valueDisplay = realtimeUsageTotal.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });
      } else if (card.id === "billing") {
        const billAmount = cards?.billAmountThisMonth ?? 0;
        valueDisplay = billAmount.toLocaleString("th-TH", {
          style: "currency",
          currency: "THB",
          minimumFractionDigits: 2,
        });
      } else if (card.id === "trend") {
        const val = cards?.monthlyTrendPercent ?? 0;
        valueDisplay = `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
      }
      return { ...card, value: valueDisplay };
    });
  }, [billingData, loading, realtimeUsageTotal]);

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
  const handleCardChange = React.useCallback((ids: string[]) => {
    if (!ids.length) return;
    setActiveCard(ids[0]);
  }, []);

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

          {activeCard === "usage" && realtimeError && (
            <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
              {realtimeError}
            </div>
          )}

          {activeCard === "usage" && (
            <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-[0_20px_35px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Real-Time Monitor</h2>
                <p className="text-sm text-slate-500">รายการอ่านค่าล่าสุดจาก Gateway</p>
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
                <div className="flex items-center gap-3">
                  <button
                    className="rounded-md border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 cursor-pointer"
                    onClick={handleRefreshRealtime}
                  >
                    Refresh
                  </button>
                  <button
                    className="rounded-md border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(abs("/electric/generate-bill"))}
                  >
                    Generate Bills
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] table-fixed">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 text-left">Meter</th>
                    <th className="px-6 py-3 text-left">Energy On Peak (kWh)</th>
                    <th className="px-6 py-3 text-left">Energy Off Peak (kWh)</th>
                    <th className="px-6 py-3 text-left">Timestamp</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {realtimeLoading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  )}
                  {!realtimeLoading &&
                    filteredRealtimeRows.map((row) => {
                      const onPeakDisplay =
                        row.onPeak !== null ? formatRealtimeValue(row.onPeak) : "-";
                      const offPeakDisplay =
                        row.offPeak !== null ? formatRealtimeValue(row.offPeak) : "-";
                      const timestampDisplay = formatRealtimeTimestamp(row.timestamp);
                      return (
                        <tr
                          key={row.meterId}
                          className="border-t border-gray-100 text-sm text-slate-700"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{row.meter}</span>
                              <span className="text-xs text-slate-500">
                                Site: {row.site ?? "-"}
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
                                Monitor
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
          {!realtimeLoading && filteredRealtimeRows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                ไม่พบข้อมูลสำหรับเงื่อนไขปัจจุบัน
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
                <h2 className="text-lg font-semibold text-slate-900">Billing Records</h2>
                <p className="text-sm text-slate-500">ข้อมูลบิลที่บันทึกและออกเอกสารแล้ว</p>
              </div>
              <div className="md:w-64">
                <SearchInput
                  value={billingSearch}
                  onChange={setBillingSearch}
                  placeholder="ค้นหาบิล..."
                  disableMenu={true}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] table-fixed">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 text-left">Meter</th>
                    <th className="px-6 py-3 text-left">รอบบิล</th>
                    <th className="px-6 py-3 text-left">หน่วยใช้ (kWh)</th>
                    <th className="px-6 py-3 text-left">ค่าไฟ (บาท)</th>
                    <th className="px-6 py-3 text-left">Timestamp</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !billingData && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">
                        กำลังโหลดข้อมูลบิล...
                      </td>
                    </tr>
                  )}
                  {filteredBillingRows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100 text-sm text-slate-700">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{row.meter}</span>
                          <span className="text-xs text-slate-500">Site: {row.site ?? "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {formatBillingPeriod(row)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {formatValue(row.usageKwh ?? 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(row.billingCost ?? 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {row.timestamp ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-200 px-4 py-1.5 text-xs font-semibold text-cyan-700 hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => handleBillingPreview(row)}
                            disabled={!row.id}
                          >
                            Preview
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredBillingRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">
                        ไม่พบบิลในช่วงนี้
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
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Monthly Trend Chart</h2>
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
                    <h2 className="text-lg font-semibold text-slate-900">Monthly Trend Table</h2>
                    <p className="text-sm text-slate-500">ยอดค่าไฟรวมรายเดือน</p>
                  </div>
                  <div className="md:w-64">
                    <SearchInput
                      value={monthlySearch}
                      onChange={setMonthlySearch}
                      placeholder="ค้นหาเดือน..."
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
                      {filteredMonthlyList.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100 text-sm text-slate-700">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900">{row.month}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900">
                              {row.cost.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900">
                              {row.usageTotalKwh.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900">
                              {formatHistoryTimestamp(row.updatedAt)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredMonthlyList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-6 text-center text-sm text-slate-500">
                            ไม่พบข้อมูลรายเดือน
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
        closeLabel={siteGuardConfig.closeLabel}
        onClose={handleSiteGuardClose}
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

function formatRealtimeValue(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function formatValue(value: number) {
  return Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(value: number) {
  return Number(value ?? 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  });
}

function normalizeDeviceList(payload: any) {
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
      return {
        id: normalizedId,
        name:
          details.name ??
          item?.name ??
          (typeof normalizedId === "string"
            ? normalizedId.split(":").pop()
            : "Meter"),
        siteName: item?.siteName ?? details.site ?? undefined,
      };
    })
    .filter(Boolean) as Array<{ id: string; name: string; siteName?: string }>;
}

function dashboardToRealtimeRow(dashboard: MeterDashboard): RealtimeRow | null {
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
      `มิเตอร์ ${dashboard.device.id.slice(0, 4)}`,
    site: dashboard.device.siteName ?? undefined,
    onPeak,
    offPeak,
    timestamp,
  };
}

const realtimeDateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatRealtimeTimestamp(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return realtimeDateFormatter.format(date);
}

function formatBillingPeriod(row: BillingRow) {
  if (
    typeof row.billingPeriodMonth === "number" &&
    typeof row.billingPeriodYear === "number"
  ) {
    const date = new Date(row.billingPeriodYear, row.billingPeriodMonth - 1, 1);
    return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }
  if (row.timestamp) return row.timestamp.slice(0, 7);
  return "-";
}

function formatHistoryTimestamp(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return realtimeDateFormatter.format(date);
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
