import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Dashboard/Navbar";
import Modal from "../components/Modal";
import { useFilters } from "../context/FiltersContext";
import { useDeviceInventory, getCountForType } from "../context/DeviceInventoryContext";
import { useDeviceInventoryLoader } from "../hooks/useDeviceInventoryLoader";
import { useUserPath } from "../routes/useUserPath";
import { useLocation, useNavigate } from "react-router-dom";
import { brandImage, meaLogo } from "../assets";
import { toJpeg } from "html-to-image";
import jsPDF from "jspdf";
import type { MeterDashboard } from "../api/meter";
import { createBill, downloadBillPdf, getBillDetailApi, uploadBillPdf, type BillDetailPayload } from "../api/billing";
import { saveBlobAsFile } from "../utils/download";
import { buildBrandingLogoSrc } from "../utils/branding";
type BillingMode = "monthly" | "daily";

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

type PreviewFormState = {
  meterId: string;
  ereOnPeak: string;
  ereOffPeak: string;
  baseOnPeak: string;
  baseOffPeak: string;
  billingMonth: string;
  billingYear: string;
  billingMode?: BillingMode;
  dailyDate?: string;
};

type BillFormLike = PreviewFormState | Record<string, any> | null | undefined;

type BillPreviewPayload = {
  site?: { name?: string; address?: string; brandingLogoUrl?: string | null };
  siteCode?: string;
  meter?: { id?: string; name?: string; description?: string; serial?: string };
  form?: PreviewFormState;
  dashboard?: MeterDashboard;
  customLogoDataUrl?: string | null;
};

type TableDataRow = {
  time: string;
  energyProduction: number;
  energyOnPeak: number;
  energyOffPeak: number;
  energyPurchased: number;
  irradiance: number;
  ambientTemp: number;
  moduleTemp: number;
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
  const modeParam = searchParams.get("mode");
  const dailyDateParam = searchParams.get("dailyDate");
  const billingMonthParam = searchParams.get("billingMonth");
  const billingYearParam = searchParams.get("billingYear");
  const { counts: inventoryCounts, loading: inventoryLoading } = useDeviceInventory();
  const [guardType, setGuardType] = React.useState<"none" | "select" | "blocked">("none");
  const pdfRef = React.useRef<HTMLDivElement | null>(null);
  const [billDetail, setBillDetail] = React.useState<BillDetailPayload | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [hasStoredPdf, setHasStoredPdf] = React.useState(false);
  const [downloadingStored, setDownloadingStored] = React.useState(false);
  const [currentBillId, setCurrentBillId] = React.useState<string | null>(billIdParam);
  const [savingBill, setSavingBill] = React.useState(false);
  React.useEffect(() => {
    if (billIdParam) {
      setCurrentBillId(billIdParam);
    }
  }, [billIdParam]);
  const preferredData = billDetail ?? preview ?? null;
  const dashboard = billDetail ? null : preview?.dashboard ?? null;
  const previewForm = preview?.form;
  const queryForm = React.useMemo(() => {
    const payload: Record<string, any> = {};
    if (modeParam === "daily") {
      payload.billingMode = "daily";
      if (dailyDateParam) payload.dailyDate = dailyDateParam;
    } else if (modeParam === "monthly") {
      payload.billingMode = "monthly";
    }
    if (billingMonthParam) payload.billingMonth = billingMonthParam;
    if (billingYearParam) payload.billingYear = billingYearParam;
    return Object.keys(payload).length ? payload : undefined;
  }, [modeParam, dailyDateParam, billingMonthParam, billingYearParam]);

  const formValues = React.useMemo(() => {
    const result: Record<string, any> = {};
    for (const source of [billDetail?.form, previewForm, queryForm]) {
      if (source && typeof source === "object") {
        Object.entries(source).forEach(([key, value]) => {
          if (result[key] === undefined && value !== undefined) {
            result[key] = value;
          }
        });
      }
    }
    return result;
  }, [billDetail?.form, previewForm, queryForm]);
  const siteName = preferredData?.site?.name ?? "Building System";
  const previewCustomLogo =
    preferredData && "customLogoDataUrl" in preferredData
      ? (preferredData.customLogoDataUrl as string | null | undefined)
      : null;
  const rawLogo =
    previewCustomLogo ?? preferredData?.site?.brandingLogoUrl ?? null;
  const normalizedLogo = buildBrandingLogoSrc(rawLogo);
  const siteLogoUrl = normalizedLogo ?? null;
  const leftLogoSrc =
    (normalizedLogo && normalizedLogo.length > 0 ? normalizedLogo : null) ??
    brandImage;
  const previewMeterDescription = getPreviewMeterDescription(preferredData?.meter);
  const meterName =
    preferredData?.meter?.name ??
    previewMeterDescription ??
    "มิเตอร์";
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

  const reportMode = React.useMemo<BillingMode>(() => {
    return resolveReportMode(billDetail, formValues);
  }, [billDetail, formValues]);

  const previewRows = React.useMemo<BillDetailPayload["rows"]>(() => {
    if (billDetail?.rows?.length) return billDetail.rows;
    if (reportMode === "daily" && dashboard?.chart?.categories?.length) {
      const total = dashboard.totals.energyUsageKwh || 1;
      const onRatio = total ? (dashboard.totals.onPeakKwh || 0) / total : 0.5;
      const offRatio = 1 - onRatio;
      return dashboard.chart.categories.map((label, idx) => {
        const base = Number(dashboard.chart.current[idx] ?? 0);
        return {
          timestamp: label,
          energyProduction: base,
          energyOnPeak: base * onRatio,
          energyOffPeak: base * offRatio,
          energyPurchased: base,
        };
      }) as BillDetailPayload["rows"];
    }
    return [];
  }, [billDetail, dashboard, reportMode]);

  const monthlyPeriod = React.useMemo(() => {
    if (reportMode !== "monthly") return null;
    return getPeriodMonthYear(billDetail, formValues);
  }, [reportMode, billDetail, formValues]);

  const tableData = React.useMemo<TableDataRow[]>(() => {
    const rows = previewRows;
    if (reportMode === "daily") {
      return buildDailyTableRows(rows);
    }
    const period = monthlyPeriod ?? getPeriodMonthYear(billDetail, formValues);
    return buildMonthlyTableRows(rows, period.year, period.month);
  }, [billDetail, formValues, previewRows, reportMode, monthlyPeriod]);

  const hasSavedBill = Boolean(currentBillId);
  const tableTotals = React.useMemo(() => {
    return tableData.reduce(
      (acc, row) => ({
        production: acc.production + row.energyProduction,
        onPeak: acc.onPeak + row.energyOnPeak,
        offPeak: acc.offPeak + row.energyOffPeak,
        purchased: acc.purchased + row.energyPurchased,
        irradiance: acc.irradiance + row.irradiance,
        ambient: acc.ambient + row.ambientTemp,
        module: acc.module + row.moduleTemp,
      }),
      {
        production: 0,
        onPeak: 0,
        offPeak: 0,
        purchased: 0,
        irradiance: 0,
        ambient: 0,
        module: 0,
      }
    );
  }, [tableData]);

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

  const normalizedSite = (selectedSite ?? "").trim();
  const requiresSiteSelection = !normalizedSite || normalizedSite === "all";
  const siteCodeForCreate = preview?.siteCode ?? normalizedSite;
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

  React.useEffect(() => {
    if (!currentBillId) return;
    setLoadingDetail(true);
    setDetailError(null);
    getBillDetailApi(currentBillId)
      .then((data) => {
        setBillDetail(data);
        setHasStoredPdf(Boolean(data.documentUrl));
      })
      .catch((err) => {
        console.error("[BillPdfPreview] fetch bill detail failed", err);
        setDetailError("ไม่สามารถดึงข้อมูลบิลได้");
      })
      .finally(() => setLoadingDetail(false));
  }, [currentBillId]);

  const handleSiteGuardClose = React.useCallback(() => {
    setGuardType("none");
    navigate(abs("/dashboard"), { replace: true });
  }, [navigate, abs]);
  const handleSaveBill = React.useCallback(async () => {
    if (hasSavedBill) return;
    if (!previewForm) {
      alert("ไม่พบข้อมูลที่จะบันทึก กรุณากลับไปกรอกฟอร์มใหม่");
      return;
    }
    if (!siteCodeForCreate || siteCodeForCreate === "all") {
      alert("กรุณาเลือก Site ก่อนบันทึกบิล");
      return;
    }
    const targetMeterId = previewForm.meterId || preview?.meter?.id;
    if (!targetMeterId) {
      alert("ไม่พบข้อมูลมิเตอร์สำหรับบันทึกบิล");
      return;
    }
    setSavingBill(true);
    try {
      const payload = {
        meterId: targetMeterId,
        meterLabel: preview?.meter?.name,
        meterSerial: preview?.meter?.serial,
        billingMonth: previewForm.billingMonth,
        billingYear: previewForm.billingYear,
        ereOnPeak: previewForm.ereOnPeak,
        ereOffPeak: previewForm.ereOffPeak,
        baseOnPeak: previewForm.baseOnPeak,
        baseOffPeak: previewForm.baseOffPeak,
      };
      const bill = await createBill(siteCodeForCreate, payload);
      const newBillId = bill?.billId;
      if (!newBillId) throw new Error("missing bill id");
      setCurrentBillId(newBillId);
      setHasStoredPdf(false);
      const params = new URLSearchParams(location.search);
      params.set("billId", newBillId);
      const modeValue = previewForm.billingMode ?? "monthly";
      params.set("mode", modeValue);
      if (modeValue === "daily") {
        const dateValue = previewForm.dailyDate ?? dailyDateParam ?? "";
        if (dateValue) params.set("dailyDate", dateValue);
      }
      navigate(`${location.pathname}?${params.toString()}`, {
        replace: true,
        state: { preview },
      });
    } catch (err) {
      console.error("[BillPdfPreview] save bill failed", err);
      alert("ไม่สามารถบันทึกบิลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSavingBill(false);
    }
  }, [
    hasSavedBill,
    previewForm,
    siteCodeForCreate,
    preview,
    location.search,
    location.pathname,
    dailyDateParam,
    navigate,
  ]);

  const handleBack = React.useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(abs("/electric/generate-bill"));
  }, [navigate, abs]);

  const handleExportPdf = React.useCallback(async () => {
    if (!currentBillId) return;
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

      if (currentBillId) {
        const pdfBase64 = pdf.output("datauristring").split(",")[1];
        await uploadBillPdf(currentBillId, pdfBase64);
        setHasStoredPdf(true);
      }

      pdf.save(`bill-${currentBillId}.pdf`);
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
  }, [currentBillId]);

  const handleDownloadStored = React.useCallback(async () => {
    if (!currentBillId) return;
    setDownloadingStored(true);
    try {
      const blob = await downloadBillPdf(currentBillId);
      saveBlobAsFile(blob, `bill-${currentBillId}.pdf`);
    } catch (err) {
      console.error("[BillPdfPreview] download stored pdf failed", err);
      alert("ไม่สามารถดาวน์โหลดไฟล์ PDF ที่บันทึกไว้ได้");
    } finally {
      setDownloadingStored(false);
    }
  }, [currentBillId]);

  const reportDate = React.useMemo(() => {
    if (reportMode === "daily") {
      const raw =
        (billDetail?.form as any)?.dailyDate ??
        (formValues.dailyDate as string | undefined);
      if (raw) {
        const date = new Date(raw);
        if (!Number.isNaN(date.getTime())) {
          return date.toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          });
        }
      }
      if (preferredData?.form?.dailyDate) {
        const date = new Date(preferredData.form.dailyDate);
        if (!Number.isNaN(date.getTime())) {
          return date.toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          });
        }
      }
    } else if (reportMode === "monthly") {
      const month = formValues.billingMonth ?? preferredData?.form?.billingMonth;
      const year = formValues.billingYear ?? preferredData?.form?.billingYear;
      if (month && year) {
        const date = new Date(Number(year), Number(month) - 1, 1);
        if (!Number.isNaN(date.getTime())) {
          return date.toLocaleDateString("th-TH", {
            month: "long",
            year: "numeric",
          });
        }
      }
    }
    const issued = (billDetail as any)?.issued_at;
    if (issued) return formatThaiDate(issued);
    return new Date().toLocaleDateString("th-TH", { dateStyle: "long" });
  }, [billDetail, formValues, preferredData, reportMode]);

  const chartBarMax = React.useMemo(() => {
    const values = chartPointsData.flatMap((p) => [p.purchased, p.onPeak]);
    return values.length ? Math.max(...values, 10) : 10;
  }, [chartPointsData]);

  const primaryButtonLabel = hasSavedBill
    ? exporting
      ? "กำลังสร้างไฟล์..."
      : "ดาวน์โหลด PDF"
    : savingBill
    ? "กำลังบันทึก..."
    : "บันทึก";
  const primaryButtonDisabled = hasSavedBill
    ? exporting
    : savingBill || !previewForm;
  const primaryButtonHandler = hasSavedBill ? handleExportPdf : handleSaveBill;

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
            ย้อนกลับ
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
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-around">
                <img
                  src={leftLogoSrc}
                  alt={siteLogoUrl ? "Site logo" : "Brand"}
                  className="h-34 w-40 object-contain"
                />
                <div className="text-center text-slate-900">
                  <p className="text-xl font-semibold">{siteName}</p>
                  <p className="text-lg">
                    {reportMode === "monthly" ? "Monthly Energy Report" : "Daily Energy Report"}
                  </p>
                  <p className="text-sm">{reportDate}</p>
                  <p className="text-sm">{meterName}</p>
                </div>
                <img src={meaLogo} alt="MEA" className="h-34 w-40 object-contain" />
              </div>
              <div className="h-[2px] w-full bg-[#d40000]" />
            </div>
            <div className="mt-6 grid gap-40 px-1 text-sm text-black md:grid-cols-2">
              <div className="space-y-1">
                <SummaryRow label="Energy Production" value={`${formatValue(totalEnergy)} kWh`} />
                <SummaryRow label="Energy Production (On Peak)" value={`${formatValue(onPeakKwhValue)} kWh`} />
                <SummaryRow label="Energy Production (Off Peak)" value={`${formatValue(offPeakKwhValue)} kWh`} />
                <SummaryRow label="CO₂ Reduction" value="- kg" />
                <SummaryRow label="Tree Saving" value="- Trees" />
              </div>
              <div className="space-y-1">
                <SummaryRow label="Energy Charge" value={`${formatValue(totalCost)} THB`} />
                <SummaryRow label="Energy Charge (On Peak)" value={`${formatValue(onPeakCost)} THB`} />
                <SummaryRow label="Energy Charge (Off Peak)" value={`${formatValue(offPeakCost)} THB`} />
                <SummaryRow label="Financial Saving" value="-" />
                <SummaryRow label="Financial Saving (FT)" value="-" />
              </div>
            </div>

            <div className="mt-3">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm text-black">
                  <thead className="text-xs uppercase tracking-wide text-black">
                    <tr className="text-center">
                      <th className="py-2 px-2 border">
                        {reportMode === "monthly" ? "Date" : "Time"}
                      </th>
                      <th className="py-2 px-2 border">Energy Production (kWh)</th>
                      <th className="py-2 px-2 border">Energy On Peak (kWh)</th>
                      <th className="py-2 px-2 border">Energy Off Peak (kWh)</th>
                      <th className="py-2 px-2 border">Energy Purchased (kWh)</th>
                      <th className="py-2 px-2 border">Irradiance (Wh/m²)</th>
                      <th className="py-2 px-2 border">Ambient Temp. (°C)</th>
                      <th className="py-2 px-2 border">Module Temp. (°C)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row) => (
                      <tr
                        key={row.time}
                        className="border text-center text-sm"
                      >
                        <td className="text-center text-black">
                          {reportMode === "monthly"
                            ? formatMonthlyLabel(row.time, monthlyPeriod)
                            : row.time}
                        </td>
                        <td className="text-[15px] border">{formatValue(row.energyProduction)}</td>
                        <td className="text-[15px] border">{formatValue(row.energyOnPeak)}</td>
                        <td className="text-[15px] border">{formatValue(row.energyOffPeak)}</td>
                        <td className="text-[15px] border">{formatValue(row.energyPurchased)}</td>
                        <td className="text-[15px] border">{formatValue(row.irradiance)}</td>
                        <td className="text-[15px] border">{formatValue(row.ambientTemp)}</td>
                        <td className="text-[15px] border">{formatValue(row.moduleTemp)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-black text-center font-bold">
                      <td className=" text-center text-[14px] px-2 border">Total/Average</td>
                      <td className="text-[15px] border">
                        {formatValue(tableTotals.production)}
                      </td>
                      <td className="text-[15px] border">
                        {formatValue(tableTotals.onPeak)}
                      </td>
                      <td className="text-[15px] border">
                        {formatValue(tableTotals.offPeak)}
                      </td>
                      <td className="text-[15px] border">
                        {formatValue(tableTotals.purchased)}
                      </td>
                      <td className="text-[15px] border">
                        {formatValue(tableTotals.irradiance)}
                      </td>
                      <td className="text-[15px] border">
                        {formatValue(
                          tableTotals.ambient / (tableData.length || 1)
                        )}
                      </td>
                      <td className="text-[15px] border">
                        {formatValue(
                          tableTotals.module / (tableData.length || 1)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="mt-2 rounded-3xl px-4 py-4">
              <div className="mt-4 h-64 w-full overflow-x-auto px-2">
                <div className="flex min-w-[640px] items-end gap-4">
                  {chartPointsData.map((point) => {
                    const onHeight = (point.onPeak / chartBarMax) * 180;
                    const offHeight = (point.purchased / chartBarMax) * 180;
                    return (
                      <div key={point.label} className="flex w-12 flex-col items-center gap-1 text-xs">
                        <div className="relative flex h-48 w-6 flex-col justify-end gap-1">
                          <div
                            className="rounded-sm bg-[#2ab07f]"
                            style={{ height: `${onHeight}px` }}
                          />
                          <div
                            className="rounded-sm bg-[#1e88e5]"
                            style={{ height: `${offHeight}px` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-600">
                          {point.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#1e88e5]" />
                  Energy Off Peak
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#2ab07f]" />
                  Energy On Peak
                </span>
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center gap-3 pb-6" data-export-hidden="true">
              <button
                onClick={primaryButtonHandler}
                disabled={primaryButtonDisabled}
                className={[
                  "rounded-2xl px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#1cb5ff]/30 transition",
                  primaryButtonDisabled
                    ? "bg-[#9bdfff] cursor-not-allowed"
                    : "bg-[#1cb5ff] hover:bg-[#0f9eda] cursor-pointer",
                ].join(" ")}
              >
                {primaryButtonLabel}
              </button>
              {hasStoredPdf && currentBillId && (
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

function formatThaiDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { dateStyle: "long" });
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[15px]">
      <span className="font-medium text-black">{label}</span>
      <span className="text-black">{value}</span>
    </div>
  );
}

function formatMonthlyLabel(label: string, period: { month: number; year: number } | null) {
  const day = Number.parseInt(label, 10);
  if (Number.isNaN(day)) return label;
  const fallback = period ?? {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  };
  const date = new Date(fallback.year, fallback.month - 1, day);
  return date
    .toLocaleDateString("th-TH", {
      day: "2-digit",
    })
    .replace(/\D/g, "")
    .padStart(2, "0");
}

function resolveReportMode(
  billDetail?: BillDetailPayload | null,
  form?: BillFormLike
): BillingMode {
  const normalizedForm = (form ?? {}) as Record<string, any>;
  const formMode =
    (billDetail?.form as any)?.billingMode ??
    normalizedForm.billingMode;
  if (formMode === "daily" || formMode === "monthly") return formMode;
  const rows = billDetail?.rows ?? [];
  if (rows.length) {
    const firstKey = dayKey(rows[0].timestamp);
    const hasMultipleDays = rows.some((row) => dayKey(row.timestamp) !== firstKey);
    return hasMultipleDays ? "monthly" : "daily";
  }
  return "monthly";
}

function getPeriodMonthYear(
  billDetail?: BillDetailPayload | null,
  form?: BillFormLike
) {
  const normalizedForm = (form ?? {}) as Record<string, any>;
  const resolvedMonth =
    Number((billDetail?.period?.month ?? normalizedForm.billingMonth) ?? NaN) ||
    new Date().getMonth() + 1;
  const resolvedYear =
    Number((billDetail?.period?.year ?? normalizedForm.billingYear) ?? NaN) ||
    new Date().getFullYear();
  return {
    month: clampMonth(resolvedMonth),
    year: resolvedYear,
  };
}

function clampMonth(month: number) {
  if (Number.isNaN(month)) return new Date().getMonth() + 1;
  if (month < 1) return 1;
  if (month > 12) return 12;
  return month;
}

function buildDailyTableRows(rows: BillDetailPayload["rows"]): TableDataRow[] {
  const map = new Map<string, TableDataRow>();
  rows.forEach((row) => {
    const label = getHourLabel(row.timestamp);
    const target = map.get(label) ?? createEmptyRow(label);
    map.set(label, mergeRowValues(target, row));
  });

  const result: TableDataRow[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const label = `${hour.toString().padStart(2, "0")}:00`;
    result.push(map.get(label) ?? createEmptyRow(label));
  }
  return result;
}

function buildMonthlyTableRows(
  rows: BillDetailPayload["rows"],
  year: number,
  month: number
) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const map = new Map<string, TableDataRow>();
  rows.forEach((row) => {
    const day = getDayOfMonth(row.timestamp);
    if (day < 1 || day > daysInMonth) return;
    const label = day.toString().padStart(2, "0");
    const target = map.get(label) ?? createEmptyRow(label);
    map.set(label, mergeRowValues(target, row));
  });

  const result: TableDataRow[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const label = day.toString().padStart(2, "0");
    result.push(map.get(label) ?? createEmptyRow(label));
  }
  return result;
}

function mergeRowValues(
  target: TableDataRow,
  addition: {
    energyProduction?: number;
    energyOnPeak?: number;
    energyOffPeak?: number;
    energyPurchased?: number;
    irradiance?: number;
    ambientTemp?: number;
    moduleTemp?: number;
  }
) {
  target.energyProduction += Number(addition.energyProduction ?? 0);
  target.energyOnPeak += Number(addition.energyOnPeak ?? 0);
  target.energyOffPeak += Number(addition.energyOffPeak ?? 0);
  target.energyPurchased += Number(addition.energyPurchased ?? 0);
  target.irradiance += Number(addition.irradiance ?? 0);
  target.ambientTemp += Number(addition.ambientTemp ?? 0);
  target.moduleTemp += Number(addition.moduleTemp ?? 0);
  return target;
}

function createEmptyRow(label: string): TableDataRow {
  return {
    time: label,
    energyProduction: 0,
    energyOnPeak: 0,
    energyOffPeak: 0,
    energyPurchased: 0,
    irradiance: 0,
    ambientTemp: 0,
    moduleTemp: 0,
  };
}

function dayKey(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

function getHourLabel(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return `${date.getHours().toString().padStart(2, "0")}:00`;
}

function getDayOfMonth(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return -1;
  return date.getDate();
}
