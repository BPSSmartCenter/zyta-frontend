import React from "react";
import Navbar from "../../components/Dashboard/Navbar";
import Modal from "../../components/Modal";
import { useFilters } from "../../context/FiltersContext";
import { useUserLogo } from "../../hooks/useUserLogo";

import {
  useDeviceInventory,
  getCountForType,
} from "../../context/DeviceInventoryContext";
import { useDeviceInventoryLoader } from "../../hooks/useDeviceInventoryLoader";
import { useUserPath } from "../../routes/useUserPath";
import { useLocation, useNavigate } from "react-router-dom";
import { brandImage, meaLogo, peaLogo } from "../../assets";
import { toJpeg } from "html-to-image";
import jsPDF from "jspdf";
import type { MeterDashboard } from "../../api/meter";
import {
  downloadBillExcel,
  downloadPreviewBillExcel,
  getBillDetailApi,
  getBillingReadingsData,
  getSiteBillingReadingsData,
  uploadBillPdf,
  generateBillExcel as generateBillExcelApi,
  type BillDetailPayload,
  type BillingReadingsPayload,
} from "../../api/billing";
import { saveBlobAsFile } from "../../utils/download";
import { buildBrandingLogoSrc } from "../../utils/branding";
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
  billingDiscountRate?: string;
  billingFtRate?: string;
  billingCo2Factor?: string;
  billingTreeFactor?: string;
  billingMonth: string;
  billingYear: string;
  billingMode?: BillingMode;
  dailyDate?: string;
};

type BillFormLike = PreviewFormState | Record<string, any> | null | undefined;

type LogoSlotConfig = {
  visible: boolean;
  customDataUrl: string | null;
};

type ReportCustomization = {
  leftLogo: LogoSlotConfig;
  rightLogo: LogoSlotConfig;
  logosSwapped: boolean;
  lineColor: string;
};

type BillPreviewPayload = {
  site?: { name?: string; address?: string; brandingLogoUrl?: string | null };
  siteCode?: string;
  meter?: { id?: string; name?: string; description?: string; serial?: string };
  form?: PreviewFormState;
  dashboard?: MeterDashboard;
  customLogoDataUrl?: string | null;
  reportCustomization?: ReportCustomization;
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

function normalizeDailyDateInput(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function formatThaiDateFromDateOnly(raw: string) {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

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
  const userLogoSrc = useUserLogo();
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

  // ดึง utility label จาก siteOptions เพื่อเลือก logo การไฟฟ้าที่ถูกต้อง
  const currentSiteCode = (preview?.siteCode ?? selectedSite ?? "").trim();
  const currentSiteOption = React.useMemo(
    () => siteOptions.find((o) => o.value === currentSiteCode) ?? null,
    [siteOptions, currentSiteCode]
  );
  const utilityLabel = currentSiteOption?.utilityLabel ?? "";
  const utilityCode = React.useMemo(() => {
    const upper = utilityLabel.toUpperCase();
    if (upper.includes("PEA")) return "PEA";
    if (upper.includes("MEA")) return "MEA";
    return null;
  }, [utilityLabel]);
  const utilityLogo = utilityCode === "PEA" ? peaLogo : meaLogo;

  const previewCustomLogo =
    preferredData && "customLogoDataUrl" in preferredData
      ? (preferredData.customLogoDataUrl as string | null | undefined)
      : null;
  const rawLogo =
    previewCustomLogo ?? preferredData?.site?.brandingLogoUrl ?? null;
  const normalizedLogo = buildBrandingLogoSrc(rawLogo);
  const siteLogoUrl = normalizedLogo ?? null;
  const siteBrandLogoSrc =
    (normalizedLogo && normalizedLogo.length > 0 ? normalizedLogo : null) ??
    brandImage;

  const reportCustomization: ReportCustomization = React.useMemo(() => {
    const custom = preview?.reportCustomization;
    return {
      leftLogo: {
        visible: custom?.leftLogo?.visible ?? true,
        customDataUrl: custom?.leftLogo?.customDataUrl ?? null,
      },
      rightLogo: {
        visible: custom?.rightLogo?.visible ?? true,
        customDataUrl: custom?.rightLogo?.customDataUrl ?? null,
      },
      logosSwapped: custom?.logosSwapped ?? false,
      lineColor: custom?.lineColor ?? "#d40000",
    };
  }, [preview?.reportCustomization]);

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
      const normalized = normalizeDailyDateInput(candidate);
      if (normalized) return normalized;
    }
    return null;
  }, [billDetail?.form, formValues, dailyDateParam, previewForm]);

  React.useEffect(() => {
    if (!preferredDeviceId) return;
    if (!reportMode) return;
    const preferredId = String(preferredDeviceId);
    const isOverall = preferredId.toLowerCase() === "overview";
    const isTag = preferredId.toLowerCase().startsWith("tag:");
    const tagValue = isTag ? preferredId.slice(4).trim() : null;
    const siteKeyForReadings = preview?.siteCode ?? (selectedSite ?? "").trim();
    if ((isOverall || isTag) && (!siteKeyForReadings || siteKeyForReadings === "all")) {
      setBillingReadings(null);
      setBillingReadingsError("ไม่สามารถโหลดข้อมูลพลังงานได้");
      setBillingQuarterReadings(null);
      setBillingQuarterReadingsError("ไม่สามารถโหลดข้อมูลพลังงานแบบ 15 นาทีได้");
      return;
    }
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
    const readingsLoader =
      isOverall || isTag
        ? getSiteBillingReadingsData(siteKeyForReadings, { ...(requestParams as any), tag: tagValue || undefined })
        : getBillingReadingsData(preferredDeviceId, requestParams);
    Promise.resolve(readingsLoader)
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
      const quarterLoader =
        isOverall || isTag
          ? getSiteBillingReadingsData(siteKeyForReadings, {
              mode: "quarter",
              date: resolvedDailyDate,
              tag: tagValue || undefined,
            } as any)
          : getBillingReadingsData(preferredDeviceId, {
              mode: "quarter",
              date: resolvedDailyDate,
            });
      Promise.resolve(quarterLoader)
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
    preview?.siteCode,
    selectedSite,
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

  const tableData = React.useMemo<TableDataRow[]>(() => {
    if (reportMode === "daily") {
      // Prefer quarter (15-min) readings as source of truth for daily preview.
      // This keeps "ภาพรวม" consistent even when legacy hourly aggregates are stale.
      if (quarterTableRows.length > 0) {
        return buildDailyTableRowsFromQuarter(quarterTableRows);
      }
      return buildDailyTableRows(previewRows);
    }
    const rows = previewRows;
    const period = monthlyPeriod ?? getPeriodMonthYear(billDetail, formValues);
    return buildMonthlyTableRows(rows, period.year, period.month);
  }, [billDetail, formValues, previewRows, reportMode, monthlyPeriod, quarterTableRows]);

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

  const totalEnergy = tableTotals.production;
  const onPeakKwhValue = tableTotals.onPeak;
  const offPeakKwhValue = tableTotals.offPeak;
  const rateOnPeak = toNumber(formValues.baseOnPeak);
  const rateOffPeak = toNumber(formValues.baseOffPeak);
  const discountRateRaw = toNumber(formValues.billingDiscountRate);
  const discountRate =
    discountRateRaw > 1 ? discountRateRaw / 100 : discountRateRaw;
  const discountedOnPeak = rateOnPeak * (1 - discountRate);
  const discountedOffPeak = rateOffPeak * (1 - discountRate);
  const onPeakCost = onPeakKwhValue * discountedOnPeak;
  const offPeakCost = offPeakKwhValue * discountedOffPeak;
  const totalCost = onPeakCost + offPeakCost;
  const baseTotalCost =
    onPeakKwhValue * rateOnPeak + offPeakKwhValue * rateOffPeak;
  const financialSaving = baseTotalCost - totalCost;
  const ftRate = toNumber(formValues.billingFtRate);
  const co2Factor = toNumber(formValues.billingCo2Factor);
  const treeFactor = toNumber(formValues.billingTreeFactor);
  const ftSaving = totalEnergy * ftRate;
  const co2Reduction = totalEnergy * co2Factor;
  const treeSaving = totalEnergy * treeFactor;

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

  const reportFileBase = React.useMemo(() => {
    if (reportMode === "daily") {
      const raw = resolvedDailyDate ?? (formValues.dailyDate as string | undefined);
      const dateOnly = normalizeDailyDateInput(raw);
      const fallback = new Date().toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const formatted = dateOnly
        ? formatThaiDateFromDateOnly(dateOnly).replace(/\s/g, "/")
        : fallback;
      return `report เก็บค่าไฟ วันที่ ${formatted}`.replace(/[\\/]/g, "-");
    }
    const period = monthlyPeriod ?? getPeriodMonthYear(billDetail, formValues);
    const ref = new Date(period.year, period.month - 1, 1);
    const formatted = ref.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    });
    return `report เก็บค่าไฟ เดือน ${formatted}`.replace(/[\\/]/g, "-");
  }, [reportMode, resolvedDailyDate, formValues, monthlyPeriod, billDetail]);

  const handleExportPdf = React.useCallback(async () => {
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
    let pdfPageIndex = 0;
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
      for (const targetPage of exportPages) {
        if (activePage !== targetPage) {
          setCurrentPreviewPage(targetPage);
          activePage = targetPage;
        }
        await waitForNextFrame();
        const sectionNodes = Array.from(
          node.querySelectorAll<HTMLElement>("[data-export-section='page']")
        );
        const captureTargets = sectionNodes.length ? sectionNodes : [node];
        for (const targetNode of captureTargets) {
          const dataUrl = await toJpeg(targetNode, {
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
          const scale = Math.min(pdfWidth / image.width, pageHeight / image.height);
          const renderWidth = image.width * scale;
          const renderHeight = image.height * scale;
          const offsetX = (pdfWidth - renderWidth) / 2;
          const offsetY = (pageHeight - renderHeight) / 2;

          if (pdfPageIndex === 0) {
            pdf.addImage(dataUrl, "PNG", offsetX, offsetY, renderWidth, renderHeight);
          } else {
            pdf.addPage();
            pdf.addImage(dataUrl, "PNG", offsetX, offsetY, renderWidth, renderHeight);
          }
          pdfPageIndex += 1;
        }
      }
      if (currentBillId) {
        const pdfBase64 = pdf.output("datauristring").split(",")[1];
        await uploadBillPdf(currentBillId, pdfBase64);
      }

      const fileName = `${reportFileBase}.pdf`;
      pdf.save(fileName);
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
    reportFileBase,
  ]);

  const handleDownloadExcel = React.useCallback(async () => {
    setDownloadingExcel(true);
    try {
      // ── helper: URL / path → data URL ──────────────────────────────
      const toDataUrl = async (src: string): Promise<string | null> => {
        if (/^data:/i.test(src)) return src;
        try {
          const resp = await fetch(src);
          if (!resp.ok) return null;
          const blob = await resp.blob();
          const reader = new FileReader();
          return await new Promise<string | null>((resolve) => {
            reader.onload = () =>
              resolve(typeof reader.result === "string" ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      // ── resolve logo ทั้งสอง slot ───────────────────────────────────
      const isSwapped = reportCustomization.logosSwapped;
      const rawSiteLogo = preferredData?.site?.brandingLogoUrl
        ? buildBrandingLogoSrc(preferredData.site.brandingLogoUrl) ?? preferredData.site.brandingLogoUrl
        : null;
      const siteLogoDataUrl = rawSiteLogo
        ? await toDataUrl(rawSiteLogo)
        : await toDataUrl(brandImage);
      const utilityLogoDataUrl = await toDataUrl(utilityLogo);

      const leftDefaultSrc = isSwapped ? utilityLogoDataUrl : siteLogoDataUrl;
      const rightDefaultSrc = isSwapped ? siteLogoDataUrl : utilityLogoDataUrl;

      const resolvedLeftLogo = reportCustomization.leftLogo.visible
        ? (reportCustomization.leftLogo.customDataUrl ?? leftDefaultSrc)
        : null;
      const resolvedRightLogo = reportCustomization.rightLogo.visible
        ? (reportCustomization.rightLogo.customDataUrl ?? rightDefaultSrc)
        : null;

      // utilityCode ส่งไปก็ต่อเมื่อ right slot แสดง utility logo จริงๆ
      // (ไม่ swap, ไม่ซ่อน, ไม่มี custom override) — ป้องกัน backend วาด utility ทับ
      const effectiveUtilityCode =
        reportCustomization.rightLogo.visible &&
        !isSwapped &&
        !reportCustomization.rightLogo.customDataUrl
          ? (utilityCode ?? null)
          : null;

      const logoCustomFields = {
        // new fields (รองรับ backend ที่ implement แล้ว)
        leftLogoDataUrl: resolvedLeftLogo,
        rightLogoDataUrl: resolvedRightLogo,
        leftLogoVisible: reportCustomization.leftLogo.visible,
        rightLogoVisible: reportCustomization.rightLogo.visible,
        lineColor: reportCustomization.lineColor,
        // backward-compat: left logo via old field name
        brandingLogoDataUrl: resolvedLeftLogo,
        customLogoDataUrl: reportCustomization.leftLogo.customDataUrl ?? null,
        utilityCode: effectiveUtilityCode,
      };

      // ── Path 1: preview (ยังไม่บันทึก bill) ───────────────────────
      if (!currentBillId) {
        if (!siteCodeForCreate || siteCodeForCreate === "all") {
          throw new Error("missing site for preview export");
        }
        if (!preferredDeviceId) {
          throw new Error("missing meter for preview export");
        }
        const period =
          reportMode === "monthly"
            ? monthlyPeriod ?? getPeriodMonthYear(billDetail, formValues)
            : null;

        const previewPayload = {
          meterId: preferredDeviceId,
          billingMode: reportMode,
          dailyDate: reportMode === "daily" ? resolvedDailyDate ?? undefined : undefined,
          billingMonth: period?.month,
          billingYear: period?.year,
          baseOnPeak: String(formValues.baseOnPeak ?? ""),
          baseOffPeak: String(formValues.baseOffPeak ?? ""),
          billingDiscountRate: formValues.billingDiscountRate,
          billingFtRate: formValues.billingFtRate,
          billingCo2Factor: formValues.billingCo2Factor,
          billingTreeFactor: formValues.billingTreeFactor,
          ...logoCustomFields,
        };
        const blob = await downloadPreviewBillExcel(siteCodeForCreate, previewPayload);
        saveBlobAsFile(blob, `${reportFileBase}.xlsx`);
        return;
      }

      // ── Path 2: saved bill ────────────────────────────────────────
      // logoCustomFields มี utilityCode ที่ปรับแล้ว → ไม่ต้องใส่ซ้ำ
      let excelPayload: Parameters<typeof generateBillExcelApi>[1] | undefined;
      if (reportMode === "daily" && resolvedDailyDate) {
        excelPayload = {
          mode: "daily",
          dailyDate: resolvedDailyDate,
          ...logoCustomFields,
        };
      } else if (reportMode === "monthly") {
        const period = monthlyPeriod ?? getPeriodMonthYear(billDetail, formValues);
        if (period) {
          excelPayload = {
            mode: "monthly",
            billingMonth: period.month,
            billingYear: period.year,
            ...logoCustomFields,
          };
        }
      }
      // เสมอ regenerate เมื่อ customization เปลี่ยน
      const payloadKey = JSON.stringify(excelPayload ?? {});
      const needsGenerate =
        !hasStoredExcel || lastExcelContextRef.current !== payloadKey;
      if (needsGenerate) {
        await generateBillExcelApi(currentBillId, excelPayload);
        setHasStoredExcel(true);
        lastExcelContextRef.current = payloadKey;
      }
      const blob = await downloadBillExcel(currentBillId);
      saveBlobAsFile(blob, `${reportFileBase}.xlsx`);
    } catch (err) {
      console.error("[BillPdfPreview] download excel failed", err);
      alert("ไม่สามารถดาวน์โหลดไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDownloadingExcel(false);
    }
  }, [
    currentBillId,
    siteCodeForCreate,
    preferredDeviceId,
    preferredData?.site?.brandingLogoUrl,
    reportCustomization,
    utilityLogo,
    hasStoredExcel,
    reportMode,
    resolvedDailyDate,
    monthlyPeriod,
    billDetail,
    formValues,
    reportFileBase,
    utilityCode,
  ]);

  const reportDate = React.useMemo(() => {
    if (reportMode === "daily") {
      const raw =
        (billDetail?.form as any)?.dailyDate ??
        (formValues.dailyDate as string | undefined);
      const normalized = normalizeDailyDateInput(raw);
      if (normalized) {
        const formatted = formatThaiDateFromDateOnly(normalized);
        if (formatted) return formatted;
      }
      if (preferredData?.form?.dailyDate) {
        const normalizedPreferred = normalizeDailyDateInput(preferredData.form.dailyDate);
        if (normalizedPreferred) {
          const formattedPreferred = formatThaiDateFromDateOnly(normalizedPreferred);
          if (formattedPreferred) return formattedPreferred;
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

  const primaryButtonLabel = exporting
    ? "กำลังสร้างไฟล์..."
    : "ดาวน์โหลด PDF";
  const primaryButtonDisabled = exporting;
  const primaryButtonHandler = handleExportPdf;
  const showZoomControls = isMobileViewport;
  const zoomPercentage = Math.round(previewScale * 100);
  return (
    <>
      <div className="min-h-screen bg-[#e9eef5]">
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
              <div
                data-export-section="page"
                className="space-y-6 px-6 md:px-10"
              >
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 items-center">
                    {/* ช่องซ้าย */}
                    <div className="flex justify-start">
                      {reportCustomization.leftLogo.visible && (() => {
                        const isSwapped = reportCustomization.logosSwapped;
                        const src = reportCustomization.leftLogo.customDataUrl
                          ?? (isSwapped ? utilityLogo : siteBrandLogoSrc);
                        const alt = isSwapped ? (utilityCode ?? "Utility") : (siteLogoUrl ? "Site logo" : "Brand");
                        return (
                          <img src={src} alt={alt} className="h-34 w-40 object-contain" />
                        );
                      })()}
                    </div>

                    {/* ช่องกลาง — หัวข้อ Report อยู่ตรงกลางเสมอ */}
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

                    {/* ช่องขวา */}
                    <div className="flex justify-end">
                      {reportCustomization.rightLogo.visible && (() => {
                        const isSwapped = reportCustomization.logosSwapped;
                        const src = reportCustomization.rightLogo.customDataUrl
                          ?? (isSwapped ? siteBrandLogoSrc : utilityLogo);
                        const alt = isSwapped ? (siteLogoUrl ? "Site logo" : "Brand") : (utilityCode ?? "Utility");
                        return (
                          <img src={src} alt={alt} className="h-34 w-40 object-contain" />
                        );
                      })()}
                    </div>
                  </div>
                  <div
                    className="h-[2px] w-full"
                    style={{ backgroundColor: reportCustomization.lineColor }}
                  />
                </div>
                <div className="grid gap-40 px-1 text-sm text-black md:grid-cols-2">
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
                    <SummaryRow
                      label="CO2 Reduction"
                      value={`${formatValue(co2Reduction)} kg`}
                    />
                    <SummaryRow
                      label="Tree Saving"
                      value={`${formatValue(treeSaving)} Trees`}
                    />
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
                    <SummaryRow
                      label="Financial Saving"
                      value={`${formatValue(financialSaving)} THB`}
                    />
                    <SummaryRow
                      label="Financial Saving (FT)"
                      value={`${formatValue(ftSaving)} THB`}
                    />
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
                  <div
                    className={
                      exporting ? "overflow-visible" : "overflow-x-auto"
                    }
                  >
                    <table className="w-full text-sm text-black">
                      <thead className="text-xs uppercase tracking-wide text-black">
                        <tr className="text-center">
                          <th className="py-2 px-2 border">
                            {reportMode === "monthly" ? "Date" : "Time"}
                          </th>
                          <th className="py-2 px-2 border">
                            Energy Production (<span className="normal-case">kWh</span>)
                          </th>
                          <th className="py-2 px-2 border">
                            Energy On Peak (<span className="normal-case">kWh</span>)
                          </th>
                          <th className="py-2 px-2 border">
                            Energy Off Peak (<span className="normal-case">kWh</span>)
                          </th>
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
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <div
                className="rounded-3xl py-4 w-full"
                data-export-section="page"
              >
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
    </>
  );
};

export default BillPdfPreview;

function formatValue(value: number) {
  return Number(value ?? 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

function formatThaiDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { dateStyle: "long" });
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_max-content] items-baseline gap-4 text-[15px]">
      <span className="whitespace-nowrap font-medium text-black">{label}</span>
      <span className="whitespace-nowrap text-right tabular-nums text-black">
        {value}
      </span>
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

function buildDailyTableRowsFromQuarter(rows: TableDataRow[]): TableDataRow[] {
  const byHour = new Map<string, TableDataRow>();
  rows.forEach((row) => {
    const hourRaw = String(row.time || "").split(":")[0];
    const hourNum = Number.parseInt(hourRaw, 10);
    if (!Number.isFinite(hourNum) || hourNum < 0 || hourNum > 23) return;
    const hour = String(hourNum).padStart(2, "0");
    const label = `${hour}:00`;
    const target = byHour.get(label) ?? createEmptyRow(label);
    byHour.set(
      label,
      mergeRowValues(target, {
        energyProduction: row.energyProduction,
        energyOnPeak: row.energyOnPeak,
        energyOffPeak: row.energyOffPeak,
        energyPurchased: row.energyPurchased,
        irradiance: row.irradiance,
        ambientTemp: row.ambientTemp,
        moduleTemp: row.moduleTemp,
      })
    );
  });

  const result: TableDataRow[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const label = `${hour.toString().padStart(2, "0")}:00`;
    result.push(byHour.get(label) ?? createEmptyRow(label));
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
