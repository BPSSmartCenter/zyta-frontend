import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Dashboard/Navbar";
import Modal from "../components/Modal";
import { useFilters } from "../context/FiltersContext";
import { useUserPath } from "../routes/useUserPath";
import { useLocation, useNavigate } from "react-router-dom";
import { brandImage } from "../assets";
import { toJpeg } from "html-to-image";
import jsPDF from "jspdf";
import type { MeterDashboard } from "../api/meter";
import { downloadBillPdf, getBillDetailApi, uploadBillPdf, type BillDetailPayload } from "../api/billing";
import { saveBlobAsFile } from "../utils/download";
type BillRow = {
  time: string;
  energyProduction: string;
  energyOnPeak: string;
  energyOffPeak: string;
  energyPurchased: string;
  irradiance: string;
  ambientTemp: string;
  moduleTemp: string;
};

const BILL_ROWS: BillRow[] = [
  {
    time: "00:00",
    energyProduction: "1.2588",
    energyOnPeak: "1.2588",
    energyOffPeak: "1.2588",
    energyPurchased: "1.2588",
    irradiance: "1.2588",
    ambientTemp: "1.2588",
    moduleTemp: "1.2588",
  },
  {
    time: "01:00",
    energyProduction: "542",
    energyOnPeak: "542",
    energyOffPeak: "542",
    energyPurchased: "542",
    irradiance: "542",
    ambientTemp: "542",
    moduleTemp: "542",
  },
  {
    time: "02:00",
    energyProduction: "1.087",
    energyOnPeak: "1.087",
    energyOffPeak: "1.087",
    energyPurchased: "1.087",
    irradiance: "1.087",
    ambientTemp: "1.087",
    moduleTemp: "1.087",
  },
  {
    time: "03:00",
    energyProduction: "0",
    energyOnPeak: "0",
    energyOffPeak: "0",
    energyPurchased: "0",
    irradiance: "0",
    ambientTemp: "0",
    moduleTemp: "0",
  },
  {
    time: "04:00",
    energyProduction: "2.3",
    energyOnPeak: "2.3",
    energyOffPeak: "2.3",
    energyPurchased: "2.3",
    irradiance: "2.3",
    ambientTemp: "2.3",
    moduleTemp: "2.3",
  },
  {
    time: "05:00",
    energyProduction: "6.7",
    energyOnPeak: "6.7",
    energyOffPeak: "6.7",
    energyPurchased: "6.7",
    irradiance: "6.7",
    ambientTemp: "6.7",
    moduleTemp: "6.7",
  },
];

const CHART_POINTS = [
  { label: "00:00", purchased: 0, onPeak: 0 },
  { label: "02:00", purchased: 40, onPeak: 40 },
  { label: "04:00", purchased: 100, onPeak: 80 },
  { label: "06:00", purchased: 120, onPeak: 90 },
  { label: "08:00", purchased: 200, onPeak: 150 },
  { label: "10:00", purchased: 250, onPeak: 210 },
  { label: "11:00", purchased: 230, onPeak: 240 },
  { label: "12:00", purchased: 180, onPeak: 200 },
];

const chartHeight = 240;
const chartWidth = 720;
const chartPadding = { top: 20, bottom: 40, left: 60, right: 20 };
const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
const BASE_MAX_VALUE = 300;
const BASE_TICK_VALUES = [0, 100, 200, 300];

const linePath = (
  points: Array<{ label: string; purchased: number; onPeak: number }>,
  key: "purchased" | "onPeak",
  maxValue: number
) => {
  return points
    .map((point, idx) => {
      const x =
        chartPadding.left + (idx / Math.max(points.length - 1, 1)) * chartInnerWidth;
      const value = point[key];
      const y =
        chartPadding.top +
        chartInnerHeight -
        (maxValue ? (value / maxValue) * chartInnerHeight : 0);
      return `${x},${y}`;
    })
    .join(" ");
};

type PreviewFormState = {
  meterId: string;
  ereOnPeak: string;
  ereOffPeak: string;
  baseOnPeak: string;
  baseOffPeak: string;
  billingMonth: string;
  billingYear: string;
};

type BillPreviewPayload = {
  site?: { name?: string; address?: string };
  meter?: { id?: string; name?: string; description?: string; serial?: string };
  form?: PreviewFormState;
  dashboard?: MeterDashboard;
};

const BillPdfPreview: React.FC = () => {
  const location = useLocation();
  const preview = (location.state as { preview?: BillPreviewPayload } | undefined)?.preview;
  const {
    searchSite,
    setSearchSite,
    siteOptions,
    selectedSite,
    setSelectedSite,
    date,
    setDate,
  } = useFilters();
  const { abs } = useUserPath();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const billIdParam = searchParams.get("billId");
  const [siteGuardOpen, setSiteGuardOpen] = React.useState(false);
  const pdfRef = React.useRef<HTMLDivElement | null>(null);
  const [billDetail, setBillDetail] = React.useState<BillDetailPayload | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [hasStoredPdf, setHasStoredPdf] = React.useState(false);
  const [downloadingStored, setDownloadingStored] = React.useState(false);
  const preferredData = billDetail ?? preview ?? null;
  const dashboard = billDetail ? null : preview?.dashboard ?? null;
  const formValues = preferredData?.form;
  const siteName = preferredData?.site?.name ?? "Building System";
  const siteAddress =
    preferredData?.site?.address ?? "ที่อยู่บริษัท: (กรุณาระบุในแบบฟอร์ม)";
  const previewMeterDescription = getPreviewMeterDescription(preferredData?.meter);
  const meterName =
    preferredData?.meter?.name ??
    previewMeterDescription ??
    "มิเตอร์";
  const meterSerial =
    preferredData?.meter?.serial ??
    preferredData?.meter?.id ??
    "-";
  const totalEnergy = billDetail
    ? billDetail.totals.totalKwh
    : dashboard?.totals.energyUsageKwh ?? 0;
  const onPeakKwhValue = billDetail
    ? billDetail.totals.onPeakKwh
    : dashboard?.totals.onPeakKwh ?? 0;
  const offPeakKwhValue = billDetail
    ? billDetail.totals.offPeakKwh
    : dashboard?.totals.offPeakKwh ?? 0;
  const onPeakCost = billDetail
    ? billDetail.cost.onPeak
    : dashboard?.cost.onPeakCost ?? 0;
  const offPeakCost = billDetail
    ? billDetail.cost.offPeak
    : dashboard?.cost.offPeakCost ?? 0;
  const totalCost = billDetail
    ? billDetail.cost.total
    : dashboard?.cost.totalCost ?? 0;
  const billingPeriod = billDetail?.period?.label
    ? billDetail.period.label
    : formValues
    ? `${formValues.billingMonth || "-"} / ${formValues.billingYear || "-"}`
    : "ไม่ระบุ";
  const billNumber = billDetail?.id ?? "-";

  const tableRows = React.useMemo(() => {
    if (billDetail?.rows?.length) {
      return billDetail.rows.map((row) => ({
        time: formatThaiTime(row.timestamp),
        energyProduction: formatValue(row.energyProduction),
        energyOnPeak: formatValue(row.energyOnPeak),
        energyOffPeak: formatValue(row.energyOffPeak),
        energyPurchased: formatValue(row.energyPurchased),
        irradiance: "-",
        ambientTemp: "-",
        moduleTemp: "-",
      }));
    }
    if (dashboard?.chart?.categories?.length) {
      const total = dashboard.totals.energyUsageKwh || 1;
      const onRatio = total ? (dashboard.totals.onPeakKwh || 0) / total : 0.5;
      const offRatio = 1 - onRatio;
      return dashboard.chart.categories.map((label, idx) => {
        const base = Number(dashboard.chart.current[idx] ?? 0);
        return {
          time: label,
          energyProduction: formatValue(base),
          energyOnPeak: formatValue(base * onRatio),
          energyOffPeak: formatValue(base * offRatio),
          energyPurchased: formatValue(base),
          irradiance: "-",
          ambientTemp: "-",
          moduleTemp: "-",
        };
      });
    }
    return BILL_ROWS;
  }, [billDetail, dashboard]);

  const chartPointsData = React.useMemo(() => {
    if (billDetail?.chartPoints?.length) {
      return billDetail.chartPoints;
    }
    if (dashboard?.chart?.categories?.length) {
      const total = dashboard.totals.energyUsageKwh || 1;
      const onRatio = total ? (dashboard.totals.onPeakKwh || 0) / total : 0.5;
      return dashboard.chart.categories.map((label, idx) => {
        const base = Number(dashboard.chart.current[idx] ?? 0);
        return {
          label,
          purchased: base,
          onPeak: base * onRatio,
        };
      });
    }
    return CHART_POINTS;
  }, [billDetail, dashboard]);

  const chartMaxValue = React.useMemo(() => {
    const values = chartPointsData.map((p) => Math.max(p.purchased, p.onPeak));
    return Math.max(BASE_MAX_VALUE, ...values);
  }, [chartPointsData]);
  const chartTicks = React.useMemo(() => {
    if (chartMaxValue === BASE_MAX_VALUE) return BASE_TICK_VALUES;
    const step = chartMaxValue / 3;
    return [0, step, step * 2, chartMaxValue].map((v) => Math.round(v));
  }, [chartMaxValue]);

  const normalizedSite = (selectedSite ?? "").trim();
  const requiresSiteSelection = !normalizedSite || normalizedSite === "all";

  React.useEffect(() => {
    setSiteGuardOpen(requiresSiteSelection);
  }, [requiresSiteSelection]);

  React.useEffect(() => {
    if (!billIdParam) return;
    setLoadingDetail(true);
    setDetailError(null);
    getBillDetailApi(billIdParam)
      .then((data) => {
        setBillDetail(data);
        setHasStoredPdf(Boolean(data.documentUrl));
      })
      .catch((err) => {
        console.error("[BillPdfPreview] fetch bill detail failed", err);
        setDetailError("ไม่สามารถดึงข้อมูลบิลได้");
      })
      .finally(() => setLoadingDetail(false));
  }, [billIdParam]);

  const handleSiteGuardClose = React.useCallback(() => {
    setSiteGuardOpen(false);
    navigate(abs("/dashboard"), { replace: true });
  }, [navigate, abs]);

  const handleBack = React.useCallback(() => {
    navigate(abs("/electric/generate-bill"));
  }, [navigate, abs]);

  const handleExportPdf = React.useCallback(async () => {
    const node = pdfRef.current;
    if (!node) return;
    setExporting(true);
    const hiddenNodes: HTMLElement[] = [];
    const previousDisplay: string[] = [];
    try {
      node.querySelectorAll<HTMLElement>("[data-export-hidden='true']").forEach((el) => {
        hiddenNodes.push(el);
        previousDisplay.push(el.style.display);
        el.style.display = "none";
      });

      const dataUrl = await toJpeg(node, {
        cacheBust: true,
        pixelRatio: 1.25,
        quality: 0.82,
        backgroundColor: "#ffffff",
        filter: (domNode) => {
          if (!(domNode instanceof Element)) return true;
          if (
            domNode.tagName === "LINK" &&
            domNode.getAttribute("href")?.includes("fonts.googleapis.com")
          ) {
            return false;
          }
          return true;
        },
      });
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const image = new Image();
      image.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = (event) => reject(event);
      });
      const imgHeight = (image.height * pdfWidth) / image.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      if (billIdParam) {
        const pdfBase64 = pdf.output("datauristring").split(",")[1];
        await uploadBillPdf(billIdParam, pdfBase64);
        setHasStoredPdf(true);
      }

      pdf.save(`bill-${billIdParam ?? Date.now()}.pdf`);
    } catch (err) {
      console.error("[BillPdfPreview] export pdf failed", err);
      alert("ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      if (node) {
        hiddenNodes.forEach((el, idx) => {
          el.style.display = previousDisplay[idx];
        });
      }
      setExporting(false);
    }
  }, [billIdParam]);

  const handleDownloadStored = React.useCallback(async () => {
    if (!billIdParam) return;
    setDownloadingStored(true);
    try {
      const blob = await downloadBillPdf(billIdParam);
      saveBlobAsFile(blob, `bill-${billIdParam}.pdf`);
    } catch (err) {
      console.error("[BillPdfPreview] download stored pdf failed", err);
      alert("ไม่สามารถดาวน์โหลดไฟล์ PDF ที่บันทึกไว้ได้");
    } finally {
      setDownloadingStored(false);
    }
  }, [billIdParam]);

  return (
    <Sidebar>
      <div className="min-h-screen bg-[#e9eef5]">
        <Navbar
          searchSite={searchSite}
          setSearchSite={setSearchSite}
          siteOptions={siteOptions}
          selectedSite={selectedSite}
          setSelectedSite={setSelectedSite}
          date={date as any}
          setDate={setDate as any}
        />

        <div className="mx-auto max-w-5xl px-6 py-10">
          <button
            onClick={handleBack}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            กลับไปแก้ไขแบบฟอร์ม
          </button>

          {loadingDetail && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
              กำลังโหลดข้อมูลบิลจากฐานข้อมูล...
            </div>
          )}
          {detailError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {detailError}
            </div>
          )}

          <div
            ref={pdfRef}
            className="rounded-[36px] bg-white p-8 text-slate-800 shadow-[0_30px_60px_rgba(15,23,42,0.12)]"
          >
            <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <img src={brandImage} alt="BPS" className="h-40 w-40 " />
                <div>
                  <h1 className="text-3xl font-semibold text-slate-900">
                    {siteName}
                  </h1>
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <p>{siteAddress}</p>
                    <p>เลขประจำตัวผู้เสียภาษี: -</p>
                    <p>เบอร์โทร / อีเมล: -</p>
                  </div>
                </div>
              </div>
              <div className="text-right text-sm text-slate-600">
                <p className="text-slate-900">เลขที่บิล: {billNumber}</p>
                <p>
                  {new Date().toLocaleDateString("th-TH", { dateStyle: "medium" })}
                </p>
                <p>ประเภทไฟฟ้า: On Peak / Off Peak</p>
                <p>รอบบิล: {billingPeriod}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 text-sm text-slate-600 md:flex-row md:justify-between">
              <div>
                <p className="text-xl font-semibold text-slate-900">
                  มิเตอร์: {meterName}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p>อาคาร/ตำแหน่ง: {meterName}</p>
                  <p>หมายเลขมิเตอร์: {meterSerial}</p>
                </div>
              </div>
              <div className="text-sm pt-2 md:pt-6">
                <p>รอบบิล: {billingPeriod}</p>
                <p className="mt-1">รวมพลังงาน: {formatValue(totalEnergy)} kWh</p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-100">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Monthly Report
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] table-fixed text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">เวลา</th>
                      <th className="px-4 py-3 text-left">
                        Energy Production (kWh)
                      </th>
                      <th className="px-4 py-3 text-left">
                        Energy On Peak (kWh)
                      </th>
                      <th className="px-4 py-3 text-left">
                        Energy Off Peak (kWh)
                      </th>
                      <th className="px-4 py-3 text-left">
                        Energy Purchased (kWh)
                      </th>
                      <th className="px-4 py-3 text-left">
                        Irradiance (W/m^2)
                      </th>
                      <th className="px-4 py-3 text-left">Ambient Temp. (C)</th>
                      <th className="px-4 py-3 text-left">Module Temp. (C)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => (
                      <tr
                        key={row.time}
                        className="border-t border-slate-100 hover:bg-slate-50 text-sm font-medium"
                      >
                        <td className="px-4 py-3 text-slate-900">{row.time}</td>
                        <td className="px-4 py-3">{row.energyProduction}</td>
                        <td className="px-4 py-3">{row.energyOnPeak}</td>
                        <td className="px-4 py-3">{row.energyOffPeak}</td>
                        <td className="px-4 py-3">{row.energyPurchased}</td>
                        <td className="px-4 py-3">{row.irradiance}</td>
                        <td className="px-4 py-3">{row.ambientTemp}</td>
                        <td className="px-4 py-3">{row.moduleTemp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8">
                <svg
                  width="100%"
                  height={chartHeight}
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  preserveAspectRatio="none"
                >
                <defs>
                  <linearGradient id="grid-line" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#d4deed" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#eef2f7" stopOpacity="0.7" />
                  </linearGradient>
                </defs>
                {chartTicks.map((value) => {
                  const y =
                    chartPadding.top +
                    chartInnerHeight -
                    (value / chartMaxValue) * chartInnerHeight;
                  return (
                    <g key={value}>
                      <line
                        x1={chartPadding.left}
                        y1={y}
                        x2={chartPadding.left + chartInnerWidth}
                        y2={y}
                        stroke="url(#grid-line)"
                        strokeWidth={1}
                      />
                      <text
                        x={chartPadding.left - 16}
                        y={value === 0 ? y + 12 : y + 4}
                        textAnchor="end"
                        fontSize={12}
                        fill="#475569"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}
                <text
                  x={chartPadding.left - 16}
                  y={chartPadding.top - 12}
                  textAnchor="end"
                  fontSize={12}
                  fill="#475569"
                >
                  kWh
                </text>
                <polyline
                  fill="none"
                  stroke="#1e88e5"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={linePath(chartPointsData, "purchased", chartMaxValue)}
                />
                <polyline
                  fill="none"
                  stroke="#2ab07f"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={linePath(chartPointsData, "onPeak", chartMaxValue)}
                />
                {chartPointsData.map((point, idx) => {
                  const x =
                    chartPadding.left +
                    (idx / Math.max(chartPointsData.length - 1, 1)) * chartInnerWidth;
                  const purchasedY =
                    chartPadding.top +
                    chartInnerHeight -
                    (point.purchased / chartMaxValue) * chartInnerHeight;
                  const onPeakY =
                    chartPadding.top +
                    chartInnerHeight -
                    (point.onPeak / chartMaxValue) * chartInnerHeight;
                  return (
                    <React.Fragment key={point.label}>
                      <circle cx={x} cy={purchasedY} r={5} fill="#1e88e5" />
                      <circle cx={x} cy={onPeakY} r={5} fill="#2ab07f" />
                      <text
                        x={x}
                        y={chartPadding.top + chartInnerHeight + 25}
                        textAnchor="middle"
                        fontSize={12}
                        fill="#475569"
                      >
                        {point.label}
                      </text>
                    </React.Fragment>
                  );
                })}
              </svg>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#1e88e5]" />
                  Energy Purchased
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#2ab07f]" />
                  On Peak
                </span>
              </div>
            </div>

            <div className="mt-8 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-sm font-semibold text-slate-900">
                  สรุปพลังงาน
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p>รวมพลังงานทั้งหมด: {formatValue(totalEnergy)} kWh</p>
                  <p>On Peak: {formatValue(onPeakKwhValue)} kWh</p>
                  <p>Off Peak: {formatValue(offPeakKwhValue)} kWh</p>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-sm font-semibold text-slate-900">
                  สรุปค่าใช้จ่าย
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p>On Peak: ฿ {formatValue(onPeakCost)}</p>
                  <p>Off Peak: ฿ {formatValue(offPeakCost)}</p>
                  <p className="font-semibold text-slate-900">
                    ยอดรวม: ฿ {formatValue(totalCost)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-6 text-sm text-slate-600 md:grid-cols-2">
              <div>
                <p className="font-semibold text-slate-900">
                  หมายเหตุ / เงื่อนไขการชำระเงิน
                </p>
                <p className="mt-2">
                  ช่องทางการชำระเงิน: QR / PromptPay / โอนบัญชี
                </p>
              </div>
              <div className="text-center md:text-center">
                <p className="font-semibold text-slate-900">
                  ผู้รับตรวจสอบ/ผู้จัดทำบิล
                </p>
                <p className="mt-2">
                  ลายเซ็นเจ้าหน้าที่........................................
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 pb-6" data-export-hidden="true">
              <button
                onClick={handleExportPdf}
                disabled={exporting}
                className={[
                  "rounded-2xl px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#1cb5ff]/30 transition",
                  exporting
                    ? "bg-[#9bdfff] cursor-not-allowed"
                    : "bg-[#1cb5ff] hover:bg-[#0f9eda] cursor-pointer",
                ].join(" ")}
              >
                {exporting ? "กำลังสร้างไฟล์..." : "ส่งออกและบันทึก PDF"}
              </button>
              {hasStoredPdf && billIdParam && (
                <button
                  onClick={handleDownloadStored}
                  disabled={downloadingStored}
                  className={[
                    "rounded-2xl border border-[#1cb5ff] px-6 py-2 text-sm font-semibold text-[#0a86ba] transition",
                    downloadingStored
                      ? "cursor-not-allowed opacity-60"
                      : "hover:bg-[#e5f7ff] cursor-pointer",
                  ].join(" ")}
                >
                  {downloadingStored ? "กำลังดาวน์โหลด..." : "ดาวน์โหลด PDF ที่บันทึกไว้"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <Modal
        open={siteGuardOpen}
        id="bill-preview-site-required"
        icon="cancel"
        title="กรุณาเลือก Site ก่อนใช้งาน"
        message="โปรดเลือก Site จาก Navbar ก่อนดูตัวอย่างบิล PDF"
        closeLabel="โอเค"
        onClose={handleSiteGuardClose}
      />
    </Sidebar>
  );
};

export default BillPdfPreview;

function formatValue(value: number) {
  return Number(value ?? 0).toFixed(2);
}

function formatThaiTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPreviewMeterDescription(
  meter: BillDetailPayload["meter"] | BillPreviewPayload["meter"] | undefined
) {
  if (!meter) return undefined;
  const candidate = meter as { description?: unknown };
  if (typeof candidate.description === "string") {
    return candidate.description;
  }
  return undefined;
}
