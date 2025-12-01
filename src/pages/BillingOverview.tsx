import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Dashboard/Navbar";
import { useFilters } from "../context/FiltersContext";
import { StatCardGroup } from "../components/StatCard";
import StatCard from "../components/StatCard";
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
  getBillingOverview,
  type BillingMonitorRow,
  type BillingOverviewPayload,
  type MonthlyListRow as ApiMonthlyListRow,
} from "../api/billing";
import { saveBlobAsFile } from "../utils/download";

type MonitorRow = BillingMonitorRow;
type MonthlyListRow = ApiMonthlyListRow;

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
  const [siteGuardOpen, setSiteGuardOpen] = React.useState(false);

  const [activeCard, setActiveCard] = React.useState<string>("usage");
  const [downloadingBillId, setDownloadingBillId] = React.useState<string | null>(null);

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

  const { data: billingData, loading, error } = useBillingOverviewData(
    requiresSiteSelection ? null : normalizedSite
  );

  const summary = billingData?.cards;
  const cardItems = React.useMemo(() => {
    return CARD_CONFIG.map((card) => {
      let valueDisplay = loading ? "..." : "-";
      if (summary) {
        if (card.id === "usage") {
          valueDisplay = summary.totalUsageKwh.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          });
        } else if (card.id === "billing") {
          valueDisplay = summary.billAmountThisMonth.toLocaleString("th-TH", {
            style: "currency",
            currency: "THB",
            minimumFractionDigits: 2,
          });
        } else if (card.id === "trend") {
          const val = summary.monthlyTrendPercent;
          valueDisplay = `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
        }
      }
      return { ...card, value: valueDisplay };
    });
  }, [summary, loading]);

  const tableRows = React.useMemo(() => {
    if (!billingData) return [];
    if (activeCard === "billing") return billingData.billingRows ?? [];
    return billingData.usageRows ?? [];
  }, [billingData, activeCard]);
  const historyItems = billingData?.historyItems ?? [];
  const monthlyListRows = React.useMemo(() => {
    const rows = billingData?.monthlyList ?? [];
    if (!monthlySearch.trim()) return rows;
    const term = monthlySearch.trim().toLowerCase();
    return rows.filter((row) => row.month.toLowerCase().includes(term));
  }, [billingData, monthlySearch]);
  const filteredTableRows = React.useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    if (!term) return tableRows;
    return tableRows.filter((row) => {
      const textParts = [row.meter, row.user ?? "", row.site ?? ""].join(" ").toLowerCase();
      return textParts.includes(term);
    });
  }, [tableRows, tableSearch]);

  const isBillingView = activeCard === "billing";
  const headerTitle = isBillingView ? "Billing" : "Real-Time Monitor";
  const headerDescription = isBillingView
    ? "สถานะบิลและยอดคงค้างจากฐานข้อมูลจริง"
    : "รายการอ่านค่าล่าสุดจากมิเตอร์ไฟฟ้า";

  React.useEffect(() => {
    setSiteGuardOpen(requiresSiteSelection);
  }, [requiresSiteSelection]);

  const handleSiteGuardClose = React.useCallback(() => {
    setSiteGuardOpen(false);
    navigate(abs("/dashboard"), { replace: true });
  }, [navigate, abs]);

  const handleRowSelect = React.useCallback(
    (row: MonitorRow) => {
      if (!row.meterId) return;
      const target = `${abs("/electric/meter")}?meterId=${encodeURIComponent(row.meterId)}`;
      navigate(target);
    },
    [navigate, abs]
  );

  const handleMonthlyPreview = React.useCallback(
    (row: MonthlyListRow) => {
      if (!row.billId) {
        alert("ยังไม่มีไฟล์บิลสำหรับเดือนนี้");
        return;
      }
      navigate(
        `${abs("/electric/generate-bill/preview")}?billId=${encodeURIComponent(row.billId)}`
      );
    },
    [navigate, abs]
  );

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
                  labelClassName={card.labelClassName ?? "text-[12px] uppercase tracking-wide"}
                />
              ))}
            </StatCardGroup>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-md border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(abs("/electric/generate-bill"))}
              >
                Generate Bills
              </button>
            </div>
          </div>

          {activeCard === "trend" ? (
            <>
              <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-[0_20px_35px_rgba(15,23,42,0.08)] p-6">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="flex-1 rounded-3xl border border-slate-100 bg-white p-4">
                    <MonthlyChart
                      categories={billingData?.monthlyChart?.categories}
                      series={billingData?.monthlyChart?.series}
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
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyListRows.map((row) => {
                        const statusMeta = MONTHLY_STATUS_META[row.status];
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
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <span
                                  className={`inline-flex h-2.5 w-2.5 rounded-full ${statusMeta.color}`}
                                />
                                <span className="text-slate-700">
                                  {statusMeta.label}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-3 text-slate-400">
                                <button
                                  className={[
                                    "text-sm font-semibold",
                                    row.billId
                                      ? "text-cyan-700 hover:text-cyan-900 cursor-pointer"
                                      : "text-slate-400 cursor-not-allowed",
                                  ].join(" ")}
                                  disabled={!row.billId}
                                  onClick={() => row.billId && handleMonthlyPreview(row)}
                                >
                                  [ ดู PDF ]
                                </button>
                                <button className="rounded-full border border-gray-200 p-2 hover:text-cyan-600 hover:border-cyan-200 cursor-pointer">
                                  <img src={exportImage} alt="Export" className="h-3.5 w-3.5" />
                                </button>
                                <button className="rounded-full border border-gray-200 p-2 hover:text-red-500 hover:border-red-200 cursor-pointer">
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
                                </button>
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
                <p className="text-sm text-slate-500">
                  {headerDescription}
                </p>
              </div>
            <div className="w-full md:w-64">
                <SearchInput
                  value={tableSearch}
                  onChange={setTableSearch}
                  placeholder="ค้นหารายการ..."
                  disableMenu={true}
                />
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
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-center">Actions</th>
                    </tr>
                  ) : (
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3 text-left">Meter</th>
                      <th className="px-6 py-3 text-left">Last reading</th>
                      <th className="px-6 py-3 text-left">Timestamp</th>
                      <th className="px-6 py-3 text-left">ARL time</th>
                      <th className="px-6 py-3 text-center">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={isBillingView ? 6 : 5} className="px-6 py-6 text-center text-sm text-slate-500">
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredTableRows.map((row) => {
                    const clickable = Boolean(row.meterId);
                    return (
                      <tr
                        key={row.id}
                        onClick={clickable ? () => handleRowSelect(row) : undefined}
                        className={[
                          "border-t border-gray-100 text-sm text-slate-700",
                          clickable ? "hover:bg-slate-50 cursor-pointer" : "",
                        ].join(" ")}
                      >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{row.meter}</p>
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
                              {row.billingCost?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }) ?? "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <span
                                className={[
                                  "inline-flex h-2.5 w-2.5 rounded-full",
                                  row.billingStatus === "paid"
                                    ? "bg-emerald-500"
                                    : "bg-red-500",
                                ].join(" ")}
                              />
                              <span className="text-slate-700">
                                {row.billingStatus === "paid" ? "ชำระแล้ว" : "ค้างชำระ"}
                              </span>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">
                              {row.reading ?? "-"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">
                              {row.timestamp ?? "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{row.arlTime ?? "-"}</td>
                        </>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3 text-slate-400">
                          <button
                            className={[
                              "rounded-full border border-gray-200 p-2",
                              isBillingView && (!row.documentUrl || downloadingBillId === row.id)
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
                              isBillingView && (!row.documentUrl || downloadingBillId === row.id)
                            }
                            title={
                              isBillingView
                                ? row.documentUrl
                                  ? "ดาวน์โหลด PDF"
                                  : "ยังไม่มีไฟล์ PDF"
                                : undefined
                            }
                          >
                            {isBillingView && downloadingBillId === row.id ? (
                              <svg
                                className="h-3.5 w-3.5 animate-spin text-cyan-600"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                                <path d="M21 12a9 9 0 0 0-9-9" />
                              </svg>
                            ) : (
                              <img src={exportImage} alt="Export" className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            className="rounded-full border border-gray-200 p-2 hover:text-red-500 hover:border-red-200 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })}
                  {!loading && filteredTableRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={isBillingView ? 6 : 5}
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
          </div>
          )}
        </div>
      </div>
        <Modal
          open={siteGuardOpen}
          id="billing-site-required"
          icon="cancel"
          title="กรุณาเลือก Site ก่อนใช้งาน"
          message="โปรดเลือก Site จากเมนูด้านบน (Navbar) เพื่อใช้งานฟีเจอร์ Billing"
          closeLabel="โอเค"
          onClose={handleSiteGuardClose}
        />
    </Sidebar>
  );
};

const MONTHLY_STATUS_META: Record<
  MonthlyListRow["status"],
  { label: string; color: string }
> = {
  paid: { label: "ชำระแล้ว", color: "bg-emerald-500" },
  due: { label: "ค้างชำระ", color: "bg-red-500" },
};

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

  React.useEffect(() => {
    let canceled = false;
    if (!siteId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    getBillingOverview(siteId)
      .then((payload) => {
        if (canceled) return;
        setState({ data: payload, loading: false, error: null });
      })
      .catch((err) => {
        if (canceled) return;
        const message =
          err instanceof Error
            ? err.message
            : "ไม่สามารถดึงข้อมูล Billing ได้ในขณะนี้";
        setState({ data: null, loading: false, error: message });
      });
    return () => {
      canceled = true;
    };
  }, [siteId]);

  return state;
}

export default BillingOverview;
