import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Dashboard/Navbar";
import Modal from "../components/Modal";
import { useFilters } from "../context/FiltersContext";
import {
  useDeviceInventory,
  getCountForType,
} from "../context/DeviceInventoryContext";
import { useDeviceInventoryLoader } from "../hooks/useDeviceInventoryLoader";
import { useUserPath } from "../routes/useUserPath";
import { useLocation, useNavigate } from "react-router-dom";
import { brandImage, meaLogo } from "../assets";
import { toJpeg } from "html-to-image";
import jsPDF from "jspdf";
import type { MeterDashboard } from "../api/meter";
import {
  createBill,
  downloadBillExcel,
  getBillDetailApi,
  getBillingReadingsData,
  uploadBillPdf,
  generateBillExcel as generateBillExcelApi,
  type BillDetailPayload,
  type BillingReadingsPayload,
} from "../api/billing";
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

type ExtendedBillRow = BillDetailPayload["rows"][number] & {
  label?: string;
};

const BillPdfPreview: React.FC = () => {
  const location = useLocation();
  const preview = (
    location.state as { preview?: BillPreviewPayload } | undefined
  )?.preview;
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
  const { counts: inventoryCounts, loading: inventoryLoading } =
    useDeviceInventory();
  const [guardType, setGuardType] = React.useState<
    "none" | "select" | "blocked"
  >("none");
  const pdfRef = React.useRef<HTMLDivElement | null>(null);
  const manualScaleRef = React.useRef(false);
  const [previewScale, setPreviewScale] = React.useState(() => {
    if (typeof window === "undefined") return 1;
    return computeAutoPreviewScale(window.innerWidth);
  });
  const [isMobileViewport, setIsMobileViewport] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 640;
  });
  const [billDetail, setBillDetail] = React.useState<BillDetailPayload | null>(
    null
  );
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [hasStoredExcel, setHasStoredExcel] = React.useState(false);
  const [downloadingExcel, setDownloadingExcel] = React.useState(false);
  const [currentBillId, setCurrentBillId] = React.useState<string | null>(
    billIdParam
  );
  const lastExcelContextRef = React.useRef<string | null>(null);
  const [savingBill, setSavingBill] = React.useState(false);
  const [billingReadings, setBillingReadings] =
    React.useState<BillingReadingsPayload | null>(null);
  const [billingReadingsError, setBillingReadingsError] = React.useState<
    string | null
  >(null);
  const [billingQuarterReadings, setBillingQuarterReadings] =
    React.useState<BillingReadingsPayload | null>(null);
  const [billingQuarterReadingsError, setBillingQuarterReadingsError] =
    React.useState<string | null>(null);
  const [currentPreviewPage, setCurrentPreviewPage] = React.useState(0);
  React.useEffect(() => {
    if (billIdParam) {
      setCurrentBillId(billIdParam);
    }
  }, [billIdParam]);
  React.useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      const width = window.innerWidth;
      const mobile = width < 640;
      setIsMobileViewport(mobile);
      if (!manualScaleRef.current) {
        setPreviewScale(computeAutoPreviewScale(width));
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const previewForm = preview?.form;
  const preferredData = billDetail ?? preview ?? null;
  const preferredDeviceId =
    preferredData?.meter?.id ?? previewForm?.meterId ?? null;
  const dashboard = billDetail ? null : preview?.dashboard ?? null;
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
  const previewMeterDescription = getPreviewMeterDescription(
    preferredData?.meter
  );
  const meterName =
    preferredData?.meter?.name ?? previewMeterDescription ?? "มิเตอร์";

  const reportMode = React.useMemo<BillingMode>(() => {
    return resolveReportMode(billDetail, formValues);
  }, [billDetail, formValues]);

  const monthlyPeriod = React.useMemo(() => {
    if (reportMode !== "monthly") return null;
    return getPeriodMonthYear(billDetail, formValues);
  }, [reportMode, billDetail, formValues]);

  const resolvedDailyDate = React.useMemo(() => {
    const candidates = [
      (billDetail?.form as any)?.dailyDate,
      formValues.dailyDate,
      dailyDateParam,
      previewForm?.dailyDate,
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    return null;
  }, [billDetail?.form, formValues, dailyDateParam, previewForm]);

  React.useEffect(() => {
    if (!preferredDeviceId) return;
    if (!reportMode) return;
    let requestParams:
      | { mode: "daily"; date: string }
      | { mode: "monthly"; month: number; year: number }
      | null = null;
    if (reportMode === "daily") {
      if (!resolvedDailyDate) return;
      requestParams = { mode: "daily", date: resolvedDailyDate };
    } else {
      const period =
        monthlyPeriod ?? getPeriodMonthYear(billDetail, formValues);
      if (!period) return;
      requestParams = {
        mode: "monthly",
        month: period.month,
        year: period.year,
      };
    }
    let cancelled = false;
    setBillingReadingsError(null);
    setBillingReadings(null);
    setBillingQuarterReadings(null);
    setBillingQuarterReadingsError(null);
    getBillingReadingsData(preferredDeviceId, requestParams)
      .then((data) => {
        if (!cancelled) {
          setBillingReadings(data);
        }
      })
      .catch((err) => {
        console.error("[BillPdfPreview] load billing readings failed", err);
        if (!cancelled) {
          setBillingReadings(null);
          setBillingReadingsError("ไม่สามารถโหลดข้อมูลพลังงานได้");
        }
      });
    if (reportMode === "daily" && resolvedDailyDate) {
      getBillingReadingsData(preferredDeviceId, {
        mode: "quarter",
        date: resolvedDailyDate,
      })
        .then((data) => {
          if (!cancelled) {
            setBillingQuarterReadings(data);
          }
        })
        .catch((err) => {
          console.error(
            "[BillPdfPreview] load quarter billing readings failed",
            err
          );
          if (!cancelled) {
            setBillingQuarterReadings(null);
            setBillingQuarterReadingsError(
              "ไม่สามารถโหลดข้อมูลพลังงานแบบ 15 นาทีได้"
            );
          }
        });
    } else {
      setBillingQuarterReadings(null);
      setBillingQuarterReadingsError(null);
    }
    return () => {
      cancelled = true;
    };
  }, [
    preferredDeviceId,
    reportMode,
    resolvedDailyDate,
    monthlyPeriod,
    billDetail,
    formValues,
  ]);

  const billingReadingRows = React.useMemo<ExtendedBillRow[]>(() => {
    if (!billingReadings?.rows?.length) return [];
    return billingReadings.rows.map((row) => ({
      label: row.label,
      timestamp: row.timestamp,
      energyProduction: row.total,
      energyOnPeak: row.onPeak,
      energyOffPeak: row.offPeak,
      energyPurchased: row.total,
    }));
  }, [billingReadings]);

  const previewRows = React.useMemo<ExtendedBillRow[]>(() => {
    if (billingReadingRows.length) return billingReadingRows;
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
  }, [billingReadingRows, billDetail, dashboard, reportMode]);

  const tableData = React.useMemo<TableDataRow[]>(() => {
    const rows = previewRows;
    if (reportMode === "daily") {
      return buildDailyTableRows(rows);
    }
    const period = monthlyPeriod ?? getPeriodMonthYear(billDetail, formValues);
    return buildMonthlyTableRows(rows, period.year, period.month);
  }, [billDetail, formValues, previewRows, reportMode, monthlyPeriod]);

  const quarterTableRows = React.useMemo<TableDataRow[]>(() => {
    if (!billingQuarterReadings?.rows?.length) return [];
    return billingQuarterReadings.rows.map((row) => ({
      time: row.label,
      energyProduction: row.total,
      energyOnPeak: row.onPeak,
      energyOffPeak: row.offPeak,
      energyPurchased: row.total,
      irradiance: 0,
      ambientTemp: 0,
      moduleTemp: 0,
    }));
  }, [billingQuarterReadings]);

  const quarterPages = React.useMemo(() => {
    if (quarterTableRows.length === 0) return [];
    const segments = [
      { label: "00:00 - 07:45", start: 0, end: 32 },
      { label: "08:00 - 15:45", start: 32, end: 64 },
      { label: "16:00 - 23:45", start: 64, end: 96 },
    ];
    return segments
      .map((segment) => ({
        label: segment.label,
        rows: quarterTableRows.slice(segment.start, segment.end),
      }))
      .filter((segment) => segment.rows.length > 0);
  }, [quarterTableRows]);

  React.useEffect(() => {
    if (reportMode !== "daily") {
      if (currentPreviewPage !== 0) setCurrentPreviewPage(0);
      return;
    }
    if (currentPreviewPage > 0 && !quarterPages[currentPreviewPage - 1]) {
      setCurrentPreviewPage(0);
    }
  }, [reportMode, quarterPages, currentPreviewPage]);

  const previewPageOptions = React.useMemo(() => {
    if (reportMode !== "daily" || quarterPages.length === 0) return [];
    return [
      { value: 0, label: "ภาพรวม" },
      ...quarterPages.map((page, index) => ({
        value: index + 1,
        label: page.label,
      })),
    ];
  }, [reportMode, quarterPages]);

  const tableTotals = React.useMemo(
    () => sumTableRows(tableData),
    [tableData]
  );

  const displayTableRows = React.useMemo(() => {
    if (currentPreviewPage === 0 || reportMode !== "daily") {
      return tableData;
    }
    const targetPage = quarterPages[currentPreviewPage - 1];
    return targetPage?.rows ?? tableData;
  }, [currentPreviewPage, quarterPages, tableData, reportMode]);

  const displayTableTotals = React.useMemo(
    () => sumTableRows(displayTableRows),
    [displayTableRows]
  );

  const displayRowCount = displayTableRows.length || 1;

  const hasSavedBill = Boolean(currentBillId);

  const totalEnergy = tableTotals.production;
  const onPeakKwhValue = tableTotals.onPeak;
  const offPeakKwhValue = tableTotals.offPeak;
  const rateOnPeak = toNumber(formValues.baseOnPeak);
  const rateOffPeak = toNumber(formValues.baseOffPeak);
  const onPeakCost = onPeakKwhValue * rateOnPeak;
  const offPeakCost = offPeakKwhValue * rateOffPeak;
  const totalCost = onPeakCost + offPeakCost;

  const chartSourceRows = React.useMemo(() => {
    if (reportMode !== "daily") {
      return tableData;
    }
    if (currentPreviewPage === 0) {
      return tableData;
    }
    return displayTableRows;
  }, [reportMode, currentPreviewPage, tableData, displayTableRows]);

  const isQuarterPage = reportMode === "daily" && currentPreviewPage > 0;

  const chartPointsFromTable = React.useMemo(() => {
    if (!chartSourceRows.length) return null;
    return chartSourceRows.map((row, index) => {
      const label =
        reportMode === "monthly"
          ? formatMonthlyLabel(row.time, monthlyPeriod)
          : formatChartTimeLabel(row.time, isQuarterPage);
      return {
        label,
        index,
        onPeak: row.energyOnPeak,
        purchased: row.energyOffPeak,
      };
    });
  }, [chartSourceRows, reportMode, monthlyPeriod, isQuarterPage]);

  const chartPointsData = React.useMemo(() => {
    if (chartPointsFromTable?.length) {
      return chartPointsFromTable;
    }
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
          purchased: base * (1 - onRatio),
          onPeak: base * onRatio,
        };
      });
    }
    return CHART_POINTS;
  }, [chartPointsFromTable, billDetail, dashboard, reportMode]);

  const chartBarStyles = React.useMemo(() => {
    if (reportMode === "monthly") {
      return {
        barWidthClass: "w-2.5",
        gapClass: "gap-1",
        maxHeight: 140,
        labelClass: "text-[9px]",
      };
    }
    return {
      barWidthClass: "w-4",
      gapClass: "gap-2",
      maxHeight: 180,
      labelClass: "text-[10px]",
    };
  }, [reportMode]);

  const normalizedSite = (selectedSite ?? "").trim();
  const requiresSiteSelection = !normalizedSite || normalizedSite === "all";
  const siteCodeForCreate = preview?.siteCode ?? normalizedSite;
  useDeviceInventoryLoader({
    selectedSiteCode: !requiresSiteSelection ? normalizedSite : undefined,
    enabled: !requiresSiteSelection,
  });
  const electricDeviceCount = getCountForType(
    inventoryCounts as any,
    "electricmeter" as any
  );
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
        setHasStoredExcel(Boolean(data.documentExcelUrl));
        lastExcelContextRef.current = null;
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
  const adjustPreviewScale = React.useCallback((delta: number) => {
    manualScaleRef.current = true;
    setPreviewScale((prev) => clampPreviewScale(prev + delta));
  }, []);
  const handleZoomOut = React.useCallback(() => adjustPreviewScale(-0.1), [
    adjustPreviewScale,
  ]);
  const handleZoomIn = React.useCallback(() => adjustPreviewScale(0.1), [
    adjustPreviewScale,
  ]);
  const handleResetZoom = React.useCallback(() => {
    manualScaleRef.current = false;
    if (typeof window === "undefined") {
      setPreviewScale(1);
      return;
    }
    setPreviewScale(computeAutoPreviewScale(window.innerWidth));
  }, []);
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
      setHasStoredExcel(false);
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
  const temporarilyResetPreviewScale = React.useCallback(() => {
    const node = pdfRef.current;
    if (!node) return () => {};
    const prevTransform = node.style.transform;
    const prevTransition = node.style.transition;
    const prevOrigin = node.style.transformOrigin;
    node.style.transition = "none";
    node.style.transform = "scale(1)";
    node.style.transformOrigin = "top center";
    return () => {
      node.style.transition = prevTransition;
      node.style.transform = prevTransform;
      node.style.transformOrigin = prevOrigin;
    };
  }, []);

  const waitForNextFrame = React.useCallback(() => {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => resolve())
      );
    });
  }, []);

  const handleExportPdf = React.useCallback(async () => {
    if (!currentBillId) return;
    const node = pdfRef.current;
    if (!node) return;
    setExporting(true);
    const hiddenNodes: HTMLElement[] = [];
    const previousDisplay: string[] = [];
    const previousPage = currentPreviewPage;
    const exportPageCandidates = previewPageOptions.length
      ? previewPageOptions.map((option) => option.value)
      : [];
    const exportPages = Array.from(new Set([0, ...exportPageCandidates]));
    let restoreScale: (() => void) | null = null;
    let activePage = currentPreviewPage;
    try {
      restoreScale = temporarilyResetPreviewScale();
      node
        .querySelectorAll<HTMLElement>("[data-export-hidden='true']")
        .forEach((el) => {
          hiddenNodes.push(el);
          previousDisplay.push(el.style.display);
          el.style.display = "none";
        });

      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let pageIndex = 0;
      for (const targetPage of exportPages) {
        if (activePage !== targetPage) {
          setCurrentPreviewPage(targetPage);
          activePage = targetPage;
        }
        await waitForNextFrame();
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
        const image = new Image();
        image.src = dataUrl;
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = (event) => reject(event);
        });
        const imgHeight = (image.height * pdfWidth) / image.width;
        let heightLeft = imgHeight;
        let position = 0;

        if (pageIndex === 0) {
          pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
        } else {
          pdf.addPage();
          pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pageIndex += 1;
      }
      if (currentBillId) {
        const pdfBase64 = pdf.output("datauristring").split(",")[1];
        await uploadBillPdf(currentBillId, pdfBase64);
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
      if (previousPage !== activePage) {
        setCurrentPreviewPage(previousPage);
        await waitForNextFrame();
        activePage = previousPage;
      }
      if (restoreScale) {
        restoreScale();
      }
      setExporting(false);
    }
  }, [
    currentBillId,
    temporarilyResetPreviewScale,
    currentPreviewPage,
    previewPageOptions,
    waitForNextFrame,
  ]);

  const handleDownloadExcel = React.useCallback(async () => {
    if (!currentBillId) return;
    setDownloadingExcel(true);
    try {
      let excelPayload: Parameters<typeof generateBillExcelApi>[1] | undefined;
      if (reportMode === "daily" && resolvedDailyDate) {
        excelPayload = { mode: "daily", dailyDate: resolvedDailyDate };
      } else if (reportMode === "monthly") {
        const period =
          monthlyPeriod ?? getPeriodMonthYear(billDetail, formValues);
        if (period) {
          excelPayload = {
            mode: "monthly",
            billingMonth: period.month,
            billingYear: period.year,
          };
        }
      }
      const payloadKey = JSON.stringify(excelPayload ?? {});
      const needsGenerate =
        !hasStoredExcel || lastExcelContextRef.current !== payloadKey;
      if (needsGenerate) {
        await generateBillExcelApi(currentBillId, excelPayload);
        setHasStoredExcel(true);
        lastExcelContextRef.current = payloadKey;
      }
      const blob = await downloadBillExcel(currentBillId);
      saveBlobAsFile(blob, `bill-${currentBillId}.xlsx`);
    } catch (err) {
      console.error("[BillPdfPreview] download excel failed", err);
      alert("ไม่สามารถดาวน์โหลดไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDownloadingExcel(false);
    }
  }, [
    currentBillId,
    hasStoredExcel,
    reportMode,
    resolvedDailyDate,
    monthlyPeriod,
    billDetail,
    formValues,
  ]);

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
      const month =
        formValues.billingMonth ?? preferredData?.form?.billingMonth;
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
  const showZoomControls = isMobileViewport;
  const zoomPercentage = Math.round(previewScale * 100);

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

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
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

          <div className="flex flex-col items-center">
            {showZoomControls && (
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-600 sm:hidden">
                <span className="tracking-wide">
                  Zoom {zoomPercentage}%
                </span>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 shadow-sm transition hover:bg-slate-100 active:scale-95"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 shadow-sm transition hover:bg-slate-100 active:scale-95"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 shadow-sm transition hover:bg-slate-100 active:scale-95"
                  >
                    รีเซ็ต
                  </button>
                </div>
              </div>
            )}
            {previewPageOptions.length > 1 && (
              <div
                className="mb-4 flex flex-wrap items-center justify-center gap-3"
                data-export-hidden="true"
              >
                {previewPageOptions.map((option) => {
                  const isActive = currentPreviewPage === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCurrentPreviewPage(option.value)}
                      className={[
                        "rounded-full px-4 py-1.5 text-sm font-semibold transition cursor-pointer",
                        isActive
                          ? "bg-[#1cb5ff] text-white shadow"
                          : "border border-[#1cb5ff] text-[#0a86ba] bg-white hover:bg-[#e5f7ff]",
                      ].join(" ")}
                    >
                      {option.value === 0
                        ? option.label
                        : `ช่วง ${option.label}`}
                    </button>
                  );
                })}
              </div>
            )}
            <div
              ref={pdfRef}
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: "top center",
                transition: "transform 150ms ease-out",
              }}
              className="w-full max-w-[900px] rounded-[36px] bg-white p-8 text-slate-800 shadow-[0_30px_60px_rgba(15,23,42,0.12)]"
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
                      {reportMode === "monthly"
                        ? "Monthly Energy Report"
                        : "Daily Energy Report"}
                    </p>
                    <p className="text-sm">{reportDate}</p>
                    <p className="text-sm">{meterName}</p>
                  </div>
                  <img
                    src={meaLogo}
                    alt="MEA"
                    className="h-34 w-40 object-contain"
                  />
                </div>
                <div className="h-[2px] w-full bg-[#d40000]" />
              </div>
              <div className="mt-6 grid gap-40 px-1 text-sm text-black md:grid-cols-2">
                <div className="space-y-1">
                  <SummaryRow
                    label="Energy Production"
                    value={`${formatValue(totalEnergy)} kWh`}
                  />
                  <SummaryRow
                    label="Energy Production (On Peak)"
                    value={`${formatValue(onPeakKwhValue)} kWh`}
                  />
                  <SummaryRow
                    label="Energy Production (Off Peak)"
                    value={`${formatValue(offPeakKwhValue)} kWh`}
                  />
                  <SummaryRow label="CO₂ Reduction" value="- kg" />
                  <SummaryRow label="Tree Saving" value="- Trees" />
                </div>
                <div className="space-y-1">
                  <SummaryRow
                    label="Energy Charge"
                    value={`${formatValue(totalCost)} THB`}
                  />
                  <SummaryRow
                    label="Energy Charge (On Peak)"
                    value={`${formatValue(onPeakCost)} THB`}
                  />
                  <SummaryRow
                    label="Energy Charge (Off Peak)"
                    value={`${formatValue(offPeakCost)} THB`}
                  />
                  <SummaryRow label="Financial Saving" value="-" />
                  <SummaryRow label="Financial Saving (FT)" value="-" />
                </div>
              </div>

              <div className="mt-3">
                {billingReadingsError && (
                  <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    {billingReadingsError}
                  </div>
                )}
                {reportMode === "daily" && billingQuarterReadingsError && (
                  <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    {billingQuarterReadingsError}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-sm text-black">
                    <thead className="text-xs uppercase tracking-wide text-black">
                      <tr className="text-center">
                        <th className="py-2 px-2 border">
                          {reportMode === "monthly" ? "Date" : "Time"}
                        </th>
                        <th className="py-2 px-2 border">
                          Energy Production (kWh)
                        </th>
                        <th className="py-2 px-2 border">
                          Energy On Peak (kWh)
                        </th>
                        <th className="py-2 px-2 border">
                          Energy Off Peak (kWh)
                        </th>
                        <th className="py-2 px-2 border">Irradiance (Wh/m²)</th>
                        <th className="py-2 px-2 border">Ambient Temp. (°C)</th>
                        <th className="py-2 px-2 border">Module Temp. (°C)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayTableRows.map((row) => (
                        <tr
                          key={`${row.time}-${row.energyProduction}-${row.energyOnPeak}`}
                          className="border text-center text-sm"
                        >
                          <td className="text-center text-black">
                            {reportMode === "monthly"
                              ? formatMonthlyLabel(row.time, monthlyPeriod)
                              : row.time}
                          </td>
                          <td className="text-[15px] border">
                            {formatValue(row.energyProduction)}
                          </td>
                          <td className="text-[15px] border">
                            {formatValue(row.energyOnPeak)}
                          </td>
                          <td className="text-[15px] border">
                            {formatValue(row.energyOffPeak)}
                          </td>
                          <td className="text-[15px] border">
                            {formatValue(row.irradiance)}
                          </td>
                          <td className="text-[15px] border">
                            {formatValue(row.ambientTemp)}
                          </td>
                          <td className="text-[15px] border">
                            {formatValue(row.moduleTemp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-black text-center font-bold">
                        <td className=" text-center text-[14px] px-2 border">
                          Total/Average
                        </td>
                        <td className="text-[15px] border">
                          {formatValue(displayTableTotals.production)}
                        </td>
                        <td className="text-[15px] border">
                          {formatValue(displayTableTotals.onPeak)}
                        </td>
                        <td className="text-[15px] border">
                          {formatValue(displayTableTotals.offPeak)}
                        </td>
                        <td className="text-[15px] border">
                          {formatValue(displayTableTotals.irradiance)}
                        </td>
                        <td className="text-[15px] border">
                          {formatValue(
                            displayTableTotals.ambient / displayRowCount
                          )}
                        </td>
                        <td className="text-[15px] border">
                          {formatValue(
                            displayTableTotals.module / displayRowCount
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl py-4 w-full">
                <div className="mt-4 h-48 w-full">
                  <div className="w-full flex justify-center">
                    <div
                      className={`inline-flex items-end ${chartBarStyles.gapClass}`}
                    >
                      {chartPointsData.map((point) => {
                        const onHeight =
                          (point.onPeak / chartBarMax) *
                          chartBarStyles.maxHeight;
                        const offHeight =
                          (point.purchased / chartBarMax) *
                          chartBarStyles.maxHeight;
                        return (
                          <div
                            key={point.label}
                            className={`flex flex-col items-center gap-1 ${chartBarStyles.barWidthClass}`}
                          >
                            <div
                              className={`relative flex ${chartBarStyles.barWidthClass} flex-col justify-end gap-1`}
                              style={{
                                height: `${chartBarStyles.maxHeight}px`,
                              }}
                            >
                              <div
                                className="rounded-sm bg-[#2ab07f]"
                                style={{ height: `${onHeight}px` }}
                              />
                              <div
                                className="rounded-sm bg-[#1e88e5]"
                                style={{ height: `${offHeight}px` }}
                              />
                            </div>
                            <span
                              className={`${chartBarStyles.labelClass} text-slate-600`}
                            >
                              {point.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
              <div
                className="mt-8 flex flex-col items-center gap-3 pb-6"
                data-export-hidden="true"
              >
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
                {hasSavedBill && (
                  <button
                    onClick={handleDownloadExcel}
                    disabled={downloadingExcel}
                    className={[
                      "rounded-2xl px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#1cb5ff]/30 transition",
                      downloadingExcel
                        ? "bg-[#9bdfff] cursor-not-allowed"
                        : "bg-[#1cb5ff] hover:bg-[#0f9eda] cursor-pointer",
                    ].join(" ")}
                  >
                    {downloadingExcel
                      ? "กำลังดาวน์โหลด Excel..."
                      : "ดาวน์โหลด Excel"}
                  </button>
                )}
              </div>
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

function formatMonthlyLabel(
  label: string,
  period: { month: number; year: number } | null
) {
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

function formatChartTimeLabel(label: string, useQuarterGranularity: boolean) {
  const [hourRaw, minuteRaw = "0"] = label.split(":");
  const hour = Number.parseInt(hourRaw, 10);
  const minute = Number.parseInt(minuteRaw, 10) || 0;
  if (Number.isNaN(hour)) return label;
  if (!useQuarterGranularity) {
    return String(hour);
  }
  if (minute === 0) {
    return String(hour);
  }
  const minuteStr = minute.toString().padStart(2, "0");
  return `${hour}.${minuteStr}`;
}

function resolveReportMode(
  billDetail?: BillDetailPayload | null,
  form?: BillFormLike
): BillingMode {
  const normalizedForm = (form ?? {}) as Record<string, any>;
  const formMode =
    (billDetail?.form as any)?.billingMode ?? normalizedForm.billingMode;
  if (formMode === "daily" || formMode === "monthly") return formMode;
  const rows = billDetail?.rows ?? [];
  if (rows.length) {
    const firstKey = dayKey(rows[0].timestamp);
    const hasMultipleDays = rows.some(
      (row) => dayKey(row.timestamp) !== firstKey
    );
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
    Number(billDetail?.period?.month ?? normalizedForm.billingMonth ?? NaN) ||
    new Date().getMonth() + 1;
  const resolvedYear =
    Number(billDetail?.period?.year ?? normalizedForm.billingYear ?? NaN) ||
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

function sumTableRows(rows: TableDataRow[]) {
  return rows.reduce(
    (acc, row) => ({
      production: acc.production + row.energyProduction,
      onPeak: acc.onPeak + row.energyOnPeak,
      offPeak: acc.offPeak + row.energyOffPeak,
      irradiance: acc.irradiance + row.irradiance,
      ambient: acc.ambient + row.ambientTemp,
      module: acc.module + row.moduleTemp,
    }),
    {
      production: 0,
      onPeak: 0,
      offPeak: 0,
      irradiance: 0,
      ambient: 0,
      module: 0,
    }
  );
}

function buildDailyTableRows(rows: ExtendedBillRow[]): TableDataRow[] {
  const map = new Map<string, TableDataRow>();
  rows.forEach((row) => {
    const label = row.label ?? getHourLabel(row.timestamp);
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

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const normalized =
    typeof value === "string" ? value.replace(/,/g, "") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPreviewScale(value: number) {
  const min = 0.35;
  const max = 1.35;
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return Number(value.toFixed(2));
}

function computeAutoPreviewScale(viewportWidth: number) {
  if (!viewportWidth || Number.isNaN(viewportWidth)) return 1;
  if (viewportWidth <= 320) {
    return clampPreviewScale(0.9);
  }
  return 1;
}
