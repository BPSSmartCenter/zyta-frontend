// src/pages/GenerateBillForm.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
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
import { listSiteDevices } from "../api/devices";
import { getSiteDetails } from "../api/sites";
import {
  getMeterDashboard,
  getSiteMetersDashboard,
  type MeterDashboard,
} from "../api/meter";
import { getBillingReadingsData, getSiteBillingReadingsData } from "../api/billing";
import Dropdown from "../components/Dropdown";
import DatePicker, { type DateValue } from "../components/DateInput";
import { buildBrandingLogoSrc } from "../utils/branding";
import { brandImage } from "../assets";

type ManualFormState = {
  meterId: string;
  ereOnPeak: string;
  ereOffPeak: string;
  baseOnPeak: string;
  baseOffPeak: string;
  billingDiscountRate: string;
  billingFtRate: string;
  billingCo2Factor: string;
  billingTreeFactor: string;
  billingMonth: string;
  billingYear: string;
};

type BillingMode = "monthly" | "daily";

type SummaryTotals = {
  onPeak: number;
  offPeak: number;
  total: number;
};

const OVERVIEW_METER_ID = "overview";

const MONTH_CHOICES = [
  { value: "01", defaultLabel: "January" },
  { value: "02", defaultLabel: "February" },
  { value: "03", defaultLabel: "March" },
  { value: "04", defaultLabel: "April" },
  { value: "05", defaultLabel: "May" },
  { value: "06", defaultLabel: "June" },
  { value: "07", defaultLabel: "July" },
  { value: "08", defaultLabel: "August" },
  { value: "09", defaultLabel: "September" },
  { value: "10", defaultLabel: "October" },
  { value: "11", defaultLabel: "November" },
  { value: "12", defaultLabel: "December" },
];

const DEFAULT_FORM_STATE: ManualFormState = {
  meterId: "",
  ereOnPeak: "",
  ereOffPeak: "",
  baseOnPeak: "",
  baseOffPeak: "",
  billingDiscountRate: "",
  billingFtRate: "",
  billingCo2Factor: "",
  billingTreeFactor: "",
  billingMonth: "",
  billingYear: "",
};

const GenerateBillForm: React.FC = () => {
  const { t, i18n } = useTranslation(["billing"]);
  const locale = React.useMemo(
    () => ((i18n.language || "th").toLowerCase().startsWith("th") ? "th-TH" : "en-US"),
    [i18n.language]
  );
  const generateText = React.useMemo(
    () => ({
      back: t("generate.back", { defaultValue: "Back" }),
      title: t("generate.title", { defaultValue: "Generate electricity bill" }),
      branding: {
        previewAlt: t("generate.branding.previewAlt", {
          defaultValue: "Site branding preview",
        }),
        siteFallback: t("generate.branding.siteFallback", { defaultValue: "Site" }),
        addressLabel: t("generate.branding.addressLabel", { defaultValue: "Address:" }),
        addressUnknown: t("generate.branding.addressUnknown", { defaultValue: "Not specified" }),
        upload: t("generate.branding.upload", { defaultValue: "Upload logo" }),
        change: t("generate.branding.change", { defaultValue: "Change logo" }),
        clear: t("generate.branding.clear", { defaultValue: "Remove logo" }),
        errors: {
          invalidType: t("generate.branding.errors.invalidType", {
            defaultValue: "Please select an image file",
          }),
          fileTooLarge: t("generate.branding.errors.fileTooLarge", {
            defaultValue: "File must be smaller than 2.5MB",
          }),
          readFail: t("generate.branding.errors.readFail", {
            defaultValue: "Unable to read the file",
          }),
        },
      },
      messages: {
        loadMeters: t("generate.messages.loadMeters", {
          defaultValue: "Unable to load meters for this site",
        }),
        loadDashboard: t("generate.messages.loadDashboard", {
          defaultValue: "Unable to fetch meter data",
        }),
        loadingDashboard: t("generate.messages.loadingDashboard", {
          defaultValue: "Loading data from meter...",
        }),
        loadingMetersList: t("generate.messages.loadingMetersList", {
          defaultValue: "Loading meter list...",
        }),
        noMetersInSite: t("generate.messages.noMetersInSite", {
          defaultValue: "No meters found in this site",
        }),
        summaryError: t("generate.messages.summaryError", {
          defaultValue: "Unable to load billing data for this period",
        }),
        createBillError: t("generate.messages.createBillError", {
          defaultValue: "Unable to create bill, please try again",
        }),
        selectMeterRequired: t("generate.messages.selectMeterRequired", {
          defaultValue: "Please select a meter before creating a bill",
        }),
        selectSiteRequired: t("generate.messages.selectSiteRequired", {
          defaultValue: "Please select a site before creating a bill",
        }),
      },
      form: {
        billingType: t("generate.form.billingType", { defaultValue: "Billing type" }),
        monthly: t("generate.form.monthly", { defaultValue: "Monthly" }),
        daily: t("generate.form.daily", { defaultValue: "Daily" }),
        selectMonthYear: t("generate.form.selectMonthYear", {
          defaultValue: "Select billing month/year",
        }),
        monthPlaceholder: t("generate.form.monthPlaceholder", { defaultValue: "Select month" }),
        yearPlaceholder: t("generate.form.yearPlaceholder", { defaultValue: "Select year" }),
        billingRangeLabel: t("generate.form.billingRangeLabel", {
          defaultValue: "Billing period to generate:",
        }),
        selectDate: t("generate.form.selectDate", {
          defaultValue: "Select billing date",
        }),
        dateHint: t("generate.form.dateHint", {
          defaultValue: "System will calculate from 00:00 to the latest hour of that day.",
        }),
        selectMeter: t("generate.form.selectMeter", { defaultValue: "Select meter" }),
        meterSubtitle: t("generate.form.meterSubtitle", {
          defaultValue: "Choose the meter for billing",
        }),
        meterFallback: t("generate.form.meterFallback", { defaultValue: "Meter" }),
        meterSearchPlaceholder: t("generate.form.searchPlaceholder", {
          defaultValue: "Search meter name or serial...",
        }),
        noMeterMatch: t("generate.form.noMeterMatch", {
          defaultValue: "No meters match the search",
        }),
        baseOnPeak: t("generate.form.baseOnPeak", { defaultValue: "Base On Peak (THB/unit)" }),
        baseOffPeak: t("generate.form.baseOffPeak", { defaultValue: "Base Off Peak (THB/unit)" }),
        discountRate: t("generate.form.discountRate", { defaultValue: "Discount Rate" }),
        autoFillLabel: t("generate.form.autoFillLabel", {
          defaultValue: "Values from database (auto-fill)",
        }),
        loadingPlaceholder: t("generate.form.loadingPlaceholder", { defaultValue: "Loading..." }),
        submit: t("generate.form.submit", { defaultValue: "Calculate bill" }),
        submitting: t("generate.form.submitting", { defaultValue: "Generating bill..." }),
      },
      summary: {
        monthlyTotal: t("generate.summary.monthlyTotal", { defaultValue: "Month total" }),
        dailyTotal: t("generate.summary.dailyTotal", { defaultValue: "Day total" }),
        onPeak: t("generate.summary.onPeak", { defaultValue: "On Peak (kWh)" }),
        offPeak: t("generate.summary.offPeak", { defaultValue: "Off Peak (kWh)" }),
      },
      buttons: {
        modalClose: t("generate.modal.close", { defaultValue: "Close" }),
      },
      siteGuard: {
        blocked: {
          title: t("generate.siteGuard.blocked.title", {
            defaultValue: "Billing not allowed for this site",
          }),
          message: t("generate.siteGuard.blocked.message", {
            defaultValue:
              "The selected site is not permitted to use billing. Please switch to an allowed site.",
          }),
          close: t("generate.siteGuard.blocked.close", { defaultValue: "Go back" }),
        },
        permission: {
          title: t("generate.siteGuard.permission.title", {
            defaultValue: "Billing not allowed for this site",
          }),
          message: t("generate.siteGuard.permission.message", {
            defaultValue:
              "This site has billing disabled. Switch to another site or contact your administrator.",
          }),
          close: t("generate.siteGuard.permission.close", { defaultValue: "Go back" }),
        },
        select: {
          title: t("generate.siteGuard.select.title", { defaultValue: "Select a site first" }),
          message: t("generate.siteGuard.select.message", {
            defaultValue: "Choose a site from the navbar before generating bills.",
          }),
          close: t("generate.siteGuard.select.close", { defaultValue: "OK" }),
        },
      },
      modal: {
        errorTitle: t("generate.modal.errorTitle", { defaultValue: "Cannot proceed" }),
      },
    }),
    [t]
  );
  const loadMetersErrorText = generateText.messages.loadMeters;
  const loadDashboardErrorText = generateText.messages.loadDashboard;
  const summaryErrorText = generateText.messages.summaryError;
  const selectMeterRequiredText = generateText.messages.selectMeterRequired;
  const selectSiteRequiredText = generateText.messages.selectSiteRequired;
  const meterFallbackLabel = generateText.form.meterFallback;
  const monthOptions = React.useMemo(
    () =>
      MONTH_CHOICES.map((item) => ({
        value: item.value,
        label: t(`generate.months.${item.value}`, { defaultValue: item.defaultLabel }),
      })),
    [t]
  );
  const {
    searchSite,
    setSearchSite,
    siteOptions,
    selectedSite,
    setSelectedSite,
    date,
    setDate,
    billingGuard,
  } = useFilters();
  const defaultBillingPeriod = React.useMemo(
    () => getDefaultBillingPeriod(),
    []
  );
  const YEAR_OPTIONS = React.useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, idx) => {
      const year = current - idx;
      const displayYear = locale.startsWith("th") ? year + 543 : year;
      return { value: String(year), label: String(displayYear) };
    });
  }, [locale]);
  const [formState, setFormState] = React.useState<ManualFormState>(() => ({
    ...DEFAULT_FORM_STATE,
    billingMonth: defaultBillingPeriod.month,
    billingYear: defaultBillingPeriod.year,
  }));
  const [meterOptions, setMeterOptions] = React.useState<
    Array<{
      value: string;
      label: string;
      description?: string;
      serial?: string;
      scope?: "meter" | "overview" | "tag";
      tag?: string;
      tags?: string[];
    }>
  >([]);
  const [siteInfo, setSiteInfo] = React.useState<{
    name?: string;
    address?: string;
    brandingLogoUrl?: string | null;
  } | null>(null);
  const customLogoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [customLogoDataUrl, setCustomLogoDataUrl] = React.useState<string | null>(null);
  const [customLogoError, setCustomLogoError] = React.useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [meterDashboard, setMeterDashboard] =
    React.useState<MeterDashboard | null>(null);
  const [loadingDashboard, setLoadingDashboard] = React.useState(false);
  const [meterDashboardError, setMeterDashboardError] = React.useState<
    string | null
  >(null);
  const discountPercentLabel = React.useMemo(() => {
    if (typeof meterDashboard?.cost?.rates?.discountRate === "number") {
      const raw = meterDashboard.cost.rates.discountRate;
      // Some environments store discount as 0-1 fraction, others as 0-100 percent.
      const normalized = raw > 1 ? raw / 100 : raw;
      return `${(normalized * 100).toFixed(2)}%`;
    }
    const raw = Number(formState.billingDiscountRate);
    if (!Number.isFinite(raw)) return null;
    const normalized = raw > 1 ? raw / 100 : raw;
    return `${(normalized * 100).toFixed(2)}%`;
  }, [meterDashboard?.cost?.rates?.discountRate, formState.billingDiscountRate]);
  const lastPrefillIdRef = React.useRef<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const { counts: inventoryCounts, loading: inventoryLoading } =
    useDeviceInventory();
  const [guardType, setGuardType] = React.useState<
    "none" | "select" | "blocked" | "permission"
  >("none");
  const [errorModalMessage, setErrorModalMessage] = React.useState<
    string | null
  >(null);
  const [billingMode, setBillingMode] = React.useState<BillingMode>("monthly");
  const billingModeRef = React.useRef<BillingMode>("monthly");
  const switchBillingMode = React.useCallback((mode: BillingMode) => {
    billingModeRef.current = mode;
    setBillingMode(mode);
  }, []);
  const [dailyDate, setDailyDate] = React.useState<Date>(() => new Date());
  const [summaryTotals, setSummaryTotals] = React.useState<SummaryTotals>({
    onPeak: 0,
    offPeak: 0,
    total: 0,
  });
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [meterSearch, setMeterSearch] = React.useState("");
  const summaryLabel =
    billingMode === "monthly"
      ? formatMonthYear(formState.billingMonth, formState.billingYear, locale)
      : formatDailyLabel(dailyDate, locale);
  const location = useLocation();
  const navigate = useNavigate();
  const { abs } = useUserPath();
  const locationState = location.state as { meterId?: string | number } | null;
  const prefillMeterIdFromState =
    locationState?.meterId != null ? String(locationState.meterId) : null;
  const prefillMeterIdFromQuery = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("meterId");
  }, [location.search]);
  const prefillMeterIdRef = React.useRef<string>(
    prefillMeterIdFromState ?? prefillMeterIdFromQuery ?? ""
  );
  React.useEffect(() => {
    const next = prefillMeterIdFromState ?? prefillMeterIdFromQuery ?? "";
    if (!next) return;
    prefillMeterIdRef.current = next;
    setFormState((prev) =>
      prev.meterId === next ? prev : { ...prev, meterId: next }
    );
  }, [prefillMeterIdFromState, prefillMeterIdFromQuery]);

  const normalizedSite = (selectedSite ?? "").trim();
  const requiresSiteSelection = !normalizedSite || normalizedSite === "all";
  const guardForSite =
    billingGuard.siteCode && billingGuard.siteCode === normalizedSite
      ? billingGuard
      : null;
  const permissionBlocked =
    !requiresSiteSelection &&
    normalizedSite !== "all" &&
    guardForSite?.allowElectricBilling === false;
  React.useEffect(() => {
    setCustomLogoDataUrl(null);
    setCustomLogoError(null);
  }, [normalizedSite]);
  const inventoryEnabled = !requiresSiteSelection && !permissionBlocked;
  useDeviceInventoryLoader({
    selectedSiteCode: inventoryEnabled ? normalizedSite : undefined,
    enabled: inventoryEnabled,
  });
  React.useEffect(() => {
    setMeterSearch("");
  }, [normalizedSite]);
  const electricDeviceCount = getCountForType(
    inventoryCounts as any,
    "electricmeter" as any
  );
  const noElectricInventory =
    !requiresSiteSelection &&
    !permissionBlocked &&
    normalizedSite !== "all" &&
    !inventoryLoading &&
    electricDeviceCount <= 0;
  const meterOptionMap = React.useMemo(() => {
    const map = new Map<string, (typeof meterOptions)[number]>();
    meterOptions.forEach((opt) => map.set(opt.value, opt));
    return map;
  }, [meterOptions]);
  const filteredMeterOptions = React.useMemo(() => {
    const term = meterSearch.trim().toLowerCase();
    if (!term) return meterOptions;
    return meterOptions.filter((opt) => {
      return [opt.label, opt.description ?? "", opt.serial ?? ""].some((part) =>
        part?.toLowerCase().includes(term)
      );
    });
  }, [meterOptions, meterSearch]);
  const meterDropdownOptions = React.useMemo(
    () =>
      filteredMeterOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
      })),
    [filteredMeterOptions]
  );
  const monthlyRequestRange = React.useMemo(
    () =>
      buildMonthRangeForRequest(formState.billingMonth, formState.billingYear),
    [formState.billingMonth, formState.billingYear]
  );
  const meterId = formState.meterId;

  const noMeterOptions =
    !requiresSiteSelection &&
    !permissionBlocked &&
    !loadingOptions &&
    meterOptions.length === 0;
  const meterSelectionDisabled = loadingOptions || meterOptions.length === 0;

  React.useEffect(() => {
    if (requiresSiteSelection) setGuardType("select");
    else if (permissionBlocked) setGuardType("permission");
    else if (noElectricInventory || noMeterOptions) setGuardType("blocked");
    else setGuardType("none");
  }, [requiresSiteSelection, permissionBlocked, noElectricInventory, noMeterOptions]);
  const siteGuardOpen = guardType !== "none";

  React.useEffect(() => {
    if (requiresSiteSelection || permissionBlocked) {
      setLoadingOptions(false);
      setMeterOptions([]);
      setSiteInfo(null);
      setCustomLogoDataUrl(null);
      setCustomLogoError(null);
      setFormState((prev) => ({ ...prev, meterId: "" }));
      setMeterDashboard(null);
      setMeterDashboardError(null);
      return;
    }
    let canceled = false;
    async function fetchData() {
      setLoadingOptions(true);
      setLoadError(null);
      try {
        const [siteResp, devicesResp] = await Promise.all([
          getSiteDetails(normalizedSite),
          listSiteDevices(normalizedSite, "electric"),
        ]);
        if (canceled) return;

        const rawSite = (siteResp as any)?.data ?? siteResp;
        const siteData = rawSite?.site ?? rawSite ?? null;
        if (siteData) {
          const addressParts = [
            siteData.address_line,
            siteData.address_sub,
            siteData.address_district,
            siteData.address_province,
            siteData.zipcode,
          ]
            .map((part: any) => (typeof part === "string" ? part.trim() : ""))
            .filter(Boolean);
          setSiteInfo({
            name: siteData.name ?? siteData.code ?? "",
            address: addressParts.join(", ") || undefined,
            brandingLogoUrl: buildBrandingLogoSrc(
              siteData.brandingLogoUrl ?? siteData.brand_logo_url ?? null
            ),
          });
          const formatRateValue = (value?: number | string | null) => {
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric.toFixed(4) : "";
          };
          setFormState((prev) => ({
            ...prev,
            baseOnPeak:
              prev.baseOnPeak?.trim().length > 0
                ? prev.baseOnPeak
                : formatRateValue(siteData.billingOnPeakRate),
            baseOffPeak:
              prev.baseOffPeak?.trim().length > 0
                ? prev.baseOffPeak
                : formatRateValue(siteData.billingOffPeakRate),
            billingDiscountRate:
              prev.billingDiscountRate?.trim().length > 0
                ? prev.billingDiscountRate
                : formatRateValue(siteData.billingDiscountRate),
            billingFtRate:
              prev.billingFtRate?.trim().length > 0
                ? prev.billingFtRate
                : formatRateValue(siteData.billingFtRate),
            billingCo2Factor:
              prev.billingCo2Factor?.trim().length > 0
                ? prev.billingCo2Factor
                : formatRateValue(siteData.billingCo2Factor),
            billingTreeFactor:
              prev.billingTreeFactor?.trim().length > 0
                ? prev.billingTreeFactor
                : formatRateValue(siteData.billingTreeFactor),
          }));
        } else {
          setSiteInfo(null);
        }

        const devicePayload =
          devicesResp?.items ??
          devicesResp?.data?.items ??
          devicesResp?.data ??
          devicesResp ??
          [];
          const actualMeters = (devicePayload as any[])
            .filter((item) => item?.id ?? item?.model)
          .filter((item) => {
            const meta = (item?.meta ?? {}) as Record<string, any>;
            const details = (meta.details ?? {}) as Record<string, any>;
            const categoryRaw =
              meta.deviceCategory ??
              meta.device_type ??
              (item?.category ?? details?.category ?? "");
            if (!categoryRaw) {
              const model = String(item?.model ?? "").toUpperCase();
              return model.startsWith("METER:");
            }
            return String(categoryRaw).toLowerCase() === "meter";
          })
            .map((item) => {
              const meta = (item?.meta ?? {}) as Record<string, any>;
              const details = (meta.details ?? {}) as Record<string, any>;
              const tags = Array.isArray(meta.tags) ? meta.tags.map((t) => String(t)) : [];
              const buildingTag = tags.find((tag) =>
                String(tag).toLowerCase().startsWith("building:")
              );
              const buildingLabel = buildingTag
                ? String(buildingTag).slice("building:".length).trim()
                : "";
              const rawId = item?.id ?? item?.model ?? "";
              const normalizedId =
                typeof rawId === "string" ? rawId : String(rawId);
              return {
                value: normalizedId,
                label:
                  details.name ??
                  (typeof item.model === "string"
                    ? item.model.split(":").pop()
                    : meterFallbackLabel),
                description:
                  buildingLabel
                    ? `${locale.startsWith("th") ? "อาคาร" : "Building"}: ${buildingLabel}`
                    : details.location ?? item.siteName ?? "",
                serial:
                  details.serialNumber ??
                  meta.sn ??
                  (typeof item.model === "string"
                    ? item.model.split(":").pop()
                  : undefined),
              scope: "meter" as const,
              tags,
              };
          });
          const buildingTags = Array.from(
            new Set(
              actualMeters
                .flatMap((m) => m.tags ?? [])
                .filter((tag) => String(tag).toLowerCase().startsWith("building:"))
            )
          );
          const buildingOptions = buildingTags.map((tag) => {
            const label = tag.replace(/^building:/i, "").trim() || tag;
            const included = actualMeters.filter((m) => (m.tags ?? []).includes(tag));
            return {
              value: `tag:${tag}`,
              label: `${locale.startsWith("th") ? "อาคาร" : "Building"}: ${label}`,
              description: `${t("generate.meters.buildingDescription", {
                defaultValue: "Aggregate of all meters in this building",
              })} (${included.length} ${locale.startsWith("th") ? "มิเตอร์" : "meters"})`,
              serial: "",
              scope: "tag" as const,
              tag,
            };
          });
          const overallOption = {
            value: OVERVIEW_METER_ID,
            label: t("generate.meters.overallLabel", {
              defaultValue: "All Meters Summary",
            }),
            description: `${t("generate.meters.overallDescription", {
              defaultValue: "Aggregate of all meters in this site",
            })} (${actualMeters.length} ${locale.startsWith("th") ? "มิเตอร์" : "meters"})`,
            serial: "",
            scope: "overview" as const,
          };
        const allowedMeterIds = [
          OVERVIEW_METER_ID,
          ...buildingOptions.map((o) => o.value),
          ...actualMeters.map((m) => m.value),
        ];
        setMeterOptions([overallOption, ...buildingOptions, ...actualMeters]);
        setFormState((prev) => {
          const prefillCandidate = prefillMeterIdRef.current;
          if (prefillCandidate) {
            prefillMeterIdRef.current = "";
            if (allowedMeterIds.includes(prefillCandidate)) {
              return { ...prev, meterId: prefillCandidate };
            }
            console.warn("[GenerateBillForm] prefill id not found in options", {
              prefillCandidate,
            });
          }

          if (prev.meterId && allowedMeterIds.includes(prev.meterId)) {
            return prev;
          }

          // Default to the first real meter (not overall) to preserve prior behavior.
          const fallback = actualMeters[0]?.value ?? "";
          if (fallback) {
            return { ...prev, meterId: fallback };
          }

          return { ...prev, meterId: "" };
        });
      } catch (err) {
        console.error("[GenerateBillForm] load site/meter failed", err);
        if (!canceled) {
          setLoadError(loadMetersErrorText);
          setMeterOptions([]);
          setSiteInfo(null);
          setCustomLogoDataUrl(null);
          setCustomLogoError(null);
          setFormState((prev) => ({ ...prev, meterId: "" }));
        }
      } finally {
        if (!canceled) setLoadingOptions(false);
      }
    }
    fetchData();
    return () => {
      canceled = true;
    };
  }, [
    requiresSiteSelection,
    permissionBlocked,
    normalizedSite,
    loadMetersErrorText,
    meterFallbackLabel,
  ]);

  React.useEffect(() => {
    if (requiresSiteSelection || permissionBlocked) {
      setMeterDashboard(null);
      setMeterDashboardError(null);
      setLoadingDashboard(false);
      return;
    }
    if (!meterId) {
      setMeterDashboard(null);
      setMeterDashboardError(null);
      return;
    }
    lastPrefillIdRef.current = null;
    let canceled = false;
    setLoadingDashboard(true);
    setMeterDashboardError(null);
    let params: { startDate?: string; endDate?: string } | undefined;
    if (billingMode === "monthly" && monthlyRequestRange) {
      params = {
        startDate: monthlyRequestRange.startIso,
        endDate: monthlyRequestRange.endIso,
      };
    } else if (billingMode === "daily") {
      const range = buildDailyRange(dailyDate);
      params = { startDate: range.startDate, endDate: range.endDate };
    }
    const selectedOpt = meterOptions.find((opt) => opt.value === meterId);
    const tag =
      selectedOpt?.scope === "tag" && selectedOpt.tag
        ? selectedOpt.tag
        : meterId.toLowerCase().startsWith("tag:")
        ? meterId.slice(4)
        : undefined;
    const loader =
      meterId === OVERVIEW_METER_ID || tag
        ? getSiteMetersDashboard(normalizedSite, { ...params, tag })
        : getMeterDashboard(meterId, params);
    Promise.resolve(loader)
      .then((data) => {
        if (canceled) return;
        setMeterDashboard(data);
      })
      .catch((err) => {
        console.error("[GenerateBillForm] load meter dashboard failed", err);
        if (!canceled) {
          setMeterDashboard(null);
          setMeterDashboardError(loadDashboardErrorText);
        }
      })
      .finally(() => {
        if (!canceled) setLoadingDashboard(false);
      });
    return () => {
      canceled = true;
    };
  }, [
    requiresSiteSelection,
    permissionBlocked,
    meterId,
    meterOptions,
    normalizedSite,
    billingMode,
    monthlyRequestRange?.startIso,
    monthlyRequestRange?.endIso,
    dailyDate,
    loadDashboardErrorText,
  ]);

  React.useEffect(() => {
    if (!meterDashboard) return;
    if (lastPrefillIdRef.current === meterDashboard.device.id) return;
    lastPrefillIdRef.current = meterDashboard.device.id;
    const rateFormatter = (value?: number) => {
      if (!Number.isFinite(value ?? NaN)) return "";
      return Number(value).toFixed(4);
    };
    setFormState((prev) => ({
      ...prev,
      meterId: prev.meterId || meterDashboard.device.id,
      baseOnPeak: rateFormatter(meterDashboard.cost?.rates?.baseOnPeak),
      baseOffPeak: rateFormatter(meterDashboard.cost?.rates?.baseOffPeak),
      billingDiscountRate: rateFormatter(meterDashboard.cost?.rates?.discountRate),
      billingFtRate: rateFormatter(meterDashboard.cost?.rates?.ftRate),
      billingCo2Factor: rateFormatter(meterDashboard.cost?.rates?.co2Factor),
      billingTreeFactor: rateFormatter(meterDashboard.cost?.rates?.treeFactor),
    }));
  }, [meterDashboard]);

  React.useEffect(() => {
    if (requiresSiteSelection || permissionBlocked) {
      setSummaryTotals({ onPeak: 0, offPeak: 0, total: 0 });
      setSummaryError(null);
      setSummaryLoading(false);
      return;
    }
    if (!meterId) {
      setSummaryTotals({ onPeak: 0, offPeak: 0, total: 0 });
      setSummaryError(null);
      setSummaryLoading(false);
      return;
    }
    let canceled = false;
    setSummaryLoading(true);
    setSummaryError(null);
    let request:
      | { mode: "monthly"; month: number; year: number }
      | { mode: "daily"; date: string }
      | { mode: "quarter"; date: string }
      | null = null;
    if (billingMode === "monthly") {
      const monthNum = Number(formState.billingMonth);
      const yearNum = Number(formState.billingYear);
      if (!monthNum || !yearNum) {
        setSummaryLoading(false);
        return;
      }
      request = { mode: "monthly", month: monthNum, year: yearNum };
    } else {
      const iso = dailyDate?.toISOString?.();
      if (!iso) {
        setSummaryLoading(false);
        return;
      }
      // Use quarter-level source for daily autofill so Generate Form matches
      // preview/export values and includes current-day intraday data.
      request = { mode: "quarter", date: iso };
    }
    const selectedOpt = meterOptions.find((opt) => opt.value === meterId);
    const tag =
      selectedOpt?.scope === "tag" && selectedOpt.tag
        ? selectedOpt.tag
        : meterId.toLowerCase().startsWith("tag:")
        ? meterId.slice(4)
        : undefined;
    const loader =
      meterId === OVERVIEW_METER_ID || tag
        ? getSiteBillingReadingsData(normalizedSite, { ...(request as any), tag })
        : getBillingReadingsData(meterId, request);
    Promise.resolve(loader)
      .then((data) => {
        if (canceled) return;
        const totals = data.rows.reduce(
          (acc, row) => {
            acc.onPeak += row.onPeak;
            acc.offPeak += row.offPeak;
            acc.total += row.total;
            return acc;
          },
          { onPeak: 0, offPeak: 0, total: 0 }
        );
        setSummaryTotals(totals);
        setFormState((prev) => ({
          ...prev,
          ereOnPeak: formatInputNumber(totals.onPeak),
          ereOffPeak: formatInputNumber(totals.offPeak),
        }));
      })
      .catch((err) => {
        console.error("[GenerateBillForm] load billing readings failed", err);
        if (canceled) return;
        setSummaryTotals({ onPeak: 0, offPeak: 0, total: 0 });
        setSummaryError(summaryErrorText);
      })
      .finally(() => {
        if (!canceled) setSummaryLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [
    requiresSiteSelection,
    permissionBlocked,
    meterId,
    meterOptions,
    normalizedSite,
    billingMode,
    formState.billingMonth,
    formState.billingYear,
    dailyDate,
    summaryErrorText,
  ]);

  const handleSiteGuardClose = React.useCallback(() => {
    setGuardType("none");
    navigate(abs("/dashboard"), { replace: true });
  }, [navigate, abs]);
  const siteGuardConfig =
    guardType === "blocked"
      ? generateText.siteGuard.blocked
      : guardType === "permission"
      ? generateText.siteGuard.permission
      : generateText.siteGuard.select;

  const siteBrandingLogo = siteInfo?.brandingLogoUrl ?? null;
  const brandingPreviewSrc = React.useMemo(
    () => customLogoDataUrl ?? siteBrandingLogo ?? brandImage,
    [customLogoDataUrl, siteBrandingLogo]
  );
  const showBrandingPreview = Boolean(siteInfo || customLogoDataUrl);

  const handleCustomLogoFile = React.useCallback((file: File | null) => {
    if (!file) {
      setCustomLogoDataUrl(null);
      setCustomLogoError(null);
      if (customLogoInputRef.current) {
        customLogoInputRef.current.value = "";
      }
      return;
    }
    if (!file.type.startsWith("image/")) {
      setCustomLogoError(generateText.branding.errors.invalidType);
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setCustomLogoError(generateText.branding.errors.fileTooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setCustomLogoDataUrl(result);
      setCustomLogoError(null);
    };
    reader.onerror = () => {
      setCustomLogoError(generateText.branding.errors.readFail);
    };
    reader.readAsDataURL(file);
  }, [generateText.branding.errors.invalidType, generateText.branding.errors.fileTooLarge, generateText.branding.errors.readFail]);

  const handleRemoveCustomLogo = React.useCallback(() => {
    setCustomLogoDataUrl(null);
    setCustomLogoError(null);
    if (customLogoInputRef.current) {
      customLogoInputRef.current.value = "";
    }
  }, []);

  // const handleInputChange = React.useCallback(
  //   (field: keyof ManualFormState) =>
  //     (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  //       const value = event.target.value;
  //       setFormState((prev) => ({ ...prev, [field]: value }));
  //     },
  //   []
  // );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!formState.meterId) {
        setErrorModalMessage(selectMeterRequiredText);
        return;
      }
      if (requiresSiteSelection) {
        setErrorModalMessage(selectSiteRequiredText);
        return;
      }
      const selectedMeter = meterOptions.find(
        (m) => m.value === formState.meterId
      );
      const previewSite = siteInfo
        ? {
            ...siteInfo,
            brandingLogoUrl:
              customLogoDataUrl ?? siteInfo.brandingLogoUrl ?? null,
          }
        : customLogoDataUrl
        ? { brandingLogoUrl: customLogoDataUrl }
        : undefined;
      setSubmitting(true);
      try {
        const mode = billingModeRef.current;
        const formPayload = {
          ...formState,
          billingMode: mode,
          dailyDate: mode === "daily" ? dailyDate.toISOString() : undefined,
          customLogoDataUrl: customLogoDataUrl ?? undefined,
        };
        const params = new URLSearchParams();
        params.set("mode", mode);
        if (mode === "daily") {
          params.set("dailyDate", dailyDate.toISOString());
        } else {
          if (formState.billingMonth) {
            params.set("billingMonth", formState.billingMonth);
          }
          if (formState.billingYear) {
            params.set("billingYear", formState.billingYear);
          }
        }
        navigate(
          `${abs("/electric/generate-bill/preview")}?${params.toString()}`,
          {
            state: {
              preview: {
                site: previewSite ?? undefined,
                meter: {
                  id: selectedMeter?.value ?? formState.meterId,
                  name: selectedMeter?.label,
                  description: selectedMeter?.description,
                  serial: selectedMeter?.serial,
                },
                form: formPayload,
                dashboard: meterDashboard ?? undefined,
                siteCode: normalizedSite,
                customLogoDataUrl: customLogoDataUrl ?? undefined,
              },
            },
          }
        );
      } catch (err) {
        console.error("[GenerateBillForm] preview bill failed", err);
        setErrorModalMessage(summaryErrorText);
      } finally {
        setSubmitting(false);
      }
    },
    [
      navigate,
      abs,
      formState,
      meterOptions,
      normalizedSite,
      requiresSiteSelection,
      dailyDate,
      siteInfo,
      meterDashboard,
      customLogoDataUrl,
      selectMeterRequiredText,
      selectSiteRequiredText,
    ]
  );

  const handleBack = React.useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(abs("/electric?view=trend"));
  }, [navigate, abs]);

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

        <div className="mx-auto w-full max-w-xl px-6 py-10">
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
            {generateText.back}
          </button>

          <div className="w-full rounded-[32px] bg-slate-50/90 p-8">
            <h1 className="text-center text-2xl font-semibold text-slate-900">
              {generateText.title}
            </h1>
            {showBrandingPreview && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                    <img
                      src={brandingPreviewSrc}
                      alt={generateText.branding.previewAlt}
                      className="h-20 w-32 object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {siteInfo?.name ?? generateText.branding.siteFallback}
                    </p>
                    <p className="mt-1">
                      {generateText.branding.addressLabel}{" "}
                      {siteInfo?.address ?? generateText.branding.addressUnknown}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => customLogoInputRef.current?.click()}
                        className="rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 cursor-pointer"
                      >
                        {customLogoDataUrl
                          ? generateText.branding.change
                          : generateText.branding.upload}
                      </button>
                      {customLogoDataUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveCustomLogo}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                        >
                          {generateText.branding.clear}
                        </button>
                      )}
                    </div>
                    {customLogoError && (
                      <p className="mt-1 text-xs text-red-500">
                        {customLogoError}
                      </p>
                    )}
                  </div>
                </div>
                <input
                  ref={customLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(event) =>
                    handleCustomLogoFile(event.target.files?.[0] ?? null)
                  }
                />
              </div>
            )}
            {loadError && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </div>
            )}
            {meterDashboardError && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {meterDashboardError}
              </div>
            )}
            {loadingDashboard && (
              <div className="mt-3 text-sm text-slate-500">
                {generateText.messages.loadingDashboard}
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {generateText.form.billingType}
                <div className="inline-flex rounded-2xl border border-slate-200 p-1">
                  <button
                    type="button"
                    onClick={() => switchBillingMode("monthly")}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      billingMode === "monthly"
                        ? "bg-cyan-500 text-white shadow"
                        : "text-slate-600 hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    {generateText.form.monthly}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchBillingMode("daily")}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      billingMode === "daily"
                        ? "bg-cyan-500 text-white shadow"
                        : "text-slate-600 hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    {generateText.form.daily}
                  </button>
                </div>
              </div>

              {billingMode === "monthly" ? (
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {generateText.form.selectMonthYear}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Dropdown
                      options={monthOptions}
                      value={formState.billingMonth}
                      onChange={(value) =>
                        setFormState((prev) => ({
                          ...prev,
                          billingMonth: value,
                        }))
                      }
                    >
                      {({
                        open,
                        selected,
                        options,
                        getButtonProps,
                        getMenuProps,
                        getItemProps,
                      }) => (
                        <div className="relative w-full">
                          <button
                            {...getButtonProps({
                              className:
                                "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50 cursor-pointer",
                            })}
                          >
                            <span>{selected?.label ?? generateText.form.monthPlaceholder}</span>
                            <svg
                              className={`h-4 w-4 text-slate-500 transition ${
                                open ? "rotate-180" : ""
                              }`}
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M6 8l4 4 4-4" />
                            </svg>
                          </button>
                          {open && (
                            <div
                              {...getMenuProps({
                                className:
                                  "absolute left-0 top-full mt-2 z-50 w-full rounded-2xl border border-slate-100 bg-white py-2 shadow-lg max-h-64 overflow-y-auto",
                              })}
                            >
                              {options.map((opt) => {
                                const props = getItemProps(opt, {
                                  className: `flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                                    opt.value === formState.billingMonth
                                      ? "text-cyan-600 font-semibold"
                                      : "text-slate-700"
                                  } hover:bg-slate-50 cursor-pointer`,
                                });
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    {...props}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </Dropdown>

                    <Dropdown
                      options={YEAR_OPTIONS}
                      value={formState.billingYear}
                      onChange={(value) =>
                        setFormState((prev) => ({
                          ...prev,
                          billingYear: value,
                        }))
                      }
                    >
                      {({
                        getButtonProps,
                        open,
                        selected,
                        getMenuProps,
                        options,
                        getItemProps,
                      }) => (
                        <div className="relative w-full">
                          <button
                            {...getButtonProps({
                              className:
                                "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50 cursor-pointer",
                            })}
                          >
                            <span>{selected?.label ?? generateText.form.yearPlaceholder}</span>
                            <svg
                              className={`h-4 w-4 text-slate-500 transition ${
                                open ? "rotate-180" : ""
                              }`}
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M6 8l4 4 4-4" />
                            </svg>
                          </button>
                          {open && (
                            <div
                              {...getMenuProps({
                                className:
                                  "absolute left-0 top-full mt-2 z-50 w-full rounded-2xl border border-slate-100 bg-white py-2 shadow-lg max-h-64 overflow-y-auto",
                              })}
                            >
                              {options.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  {...getItemProps(opt, {
                                    className: `flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                                      opt.value === formState.billingYear
                                        ? "text-cyan-600 font-semibold"
                                        : "text-slate-700"
                                    } hover:bg-slate-50 cursor-pointer`,
                                  })}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Dropdown>
                  </div>
                  <p className="mt-2 text-xs font-normal text-slate-500">
                    {generateText.form.billingRangeLabel} {summaryLabel}
                  </p>
                </label>
              ) : (
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {generateText.form.selectDate}
                  <DatePicker
                    value={dateToValue(dailyDate)}
                    max={dateToValue(new Date())}
                    onChange={(next) => {
                      if (!next) return;
                      setDailyDate((prev) => {
                        const day = next.d ?? prev.getDate();
                        const daysInMonth = new Date(next.y, next.m, 0).getDate();
                        const safeDay = Math.min(Math.max(day, 1), daysInMonth);
                        return new Date(next.y, next.m - 1, safeDay);
                      });
                    }}
                  />
                  <p className="mt-2 text-xs font-normal text-slate-500">
                    {generateText.form.dateHint}
                  </p>
                </label>
              )}

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {generateText.form.selectMeter}
                <div
                  className={[
                    "w-full rounded-2xl border border-slate-200 bg-white",
                    meterSelectionDisabled
                      ? "opacity-60 pointer-events-none"
                      : "",
                  ].join(" ")}
                >
                  <Dropdown
                    className="relative block w-full"
                    options={meterDropdownOptions}
                    value={formState.meterId}
                    onChange={(value) =>
                      setFormState((prev) => ({ ...prev, meterId: value }))
                    }
                  >
                    {({
                      getButtonProps,
                      open,
                      getMenuProps,
                      options,
                      getItemProps,
                    }) => {
                      const selectedMeta = formState.meterId
                        ? meterOptionMap.get(formState.meterId)
                        : undefined;
                      return (
                        <div className="relative w-full">
                          <button
                            {...getButtonProps({
                              className:
                                "flex w-full items-center justify-betwene rounded-2xl border-0 bg-transparent px-4 py-3 text-left text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50 cursor-pointer",
                            })}
                          >
                            <div className="flex flex-1 flex-col text-left">
                              <span className="text-base font-semibold text-slate-900">
                                {selectedMeta?.label ?? generateText.form.selectMeter}
                              </span>
                              <span className="text-xs font-normal text-slate-500">
                                {selectedMeta?.description ??
                                  generateText.form.meterSubtitle}
                              </span>
                            </div>
                            <svg
                              className={`ml-3 h-4 w-4 shrink-0 text-slate-500 transition ${
                                open ? "rotate-180" : ""
                              }`}
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M6 8l4 4 4-4" />
                            </svg>
                          </button>
                          {open && (
                            <div
                              {...getMenuProps({
                                className:
                                  "absolute left-0 top-full mt-2 z-50 w-full min-w-full rounded-2xl border border-slate-100 bg-white shadow-lg",
                              })}
                            >
                              <div className="border-b border-slate-100 px-4 pb-3 pt-4">
                                <input
                                  type="text"
                                  value={meterSearch}
                                  onChange={(e) =>
                                    setMeterSearch(e.target.value)
                                  }
                                  placeholder={generateText.form.meterSearchPlaceholder}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-200"
                                />
                              </div>
                              <div className="max-h-64 overflow-y-auto py-2">
                                {options.length === 0 ? (
                                  <div className="px-4 py-3 text-sm text-slate-500">
                                    {generateText.form.noMeterMatch}
                                  </div>
                                ) : (
                                  options.map((opt) => {
                                    const meta = meterOptionMap.get(opt.value);
                                    const detailLine = [
                                      meta?.description?.trim(),
                                      meta?.serial
                                        ? `SN: ${meta.serial}`
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" • ");
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        {...getItemProps(opt, {
                                          className: [
                                            "flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left text-sm cursor-pointer",
                                            opt.value === formState.meterId
                                              ? "bg-cyan-50 text-cyan-700 font-semibold"
                                              : "text-slate-700 hover:bg-slate-50",
                                          ].join(" "),
                                        })}
                                      >
                                        <span>{meta?.label ?? opt.label}</span>
                                        {detailLine && (
                                          <span className="text-xs font-normal text-slate-500">
                                            {detailLine}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  </Dropdown>
                </div>
                {loadingOptions && (
                  <p className="mt-2 text-xs font-normal text-slate-500">
                    {generateText.messages.loadingMetersList}
                  </p>
                )}
                {!loadingOptions && meterOptions.length === 0 && (
                  <p className="mt-2 text-xs font-normal text-red-500">
                    {generateText.messages.noMetersInSite}
                  </p>
                )}
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {generateText.form.baseOnPeak}
                <input
                  type="text"
                  value={formState.baseOnPeak}
                  readOnly
                  disabled
                  placeholder={generateText.form.loadingPlaceholder}
                  className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-base font-normal text-slate-500 outline-none disabled:cursor-not-allowed"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {generateText.form.baseOffPeak}
                <input
                  type="text"
                  value={formState.baseOffPeak}
                  readOnly
                  disabled
                  placeholder={generateText.form.loadingPlaceholder}
                  className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-base font-normal text-slate-500 outline-none disabled:cursor-not-allowed"
                />
                <span className="text-xs font-normal text-slate-500">
                  {generateText.form.discountRate}: {discountPercentLabel ?? "-"}
                </span>
                <span className="text-xs font-normal text-slate-500">
                  FT: {formatOptionalRate(formState.billingFtRate)} THB/kWh
                </span>
                <span className="text-xs font-normal text-slate-500">
                  CO2: {formatOptionalRate(formState.billingCo2Factor)} kg/kWh
                </span>
                <span className="text-xs font-normal text-slate-500">
                  Tree: {formatOptionalRate(formState.billingTreeFactor)} tree/kWh
                </span>
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                  <span>{generateText.form.autoFillLabel}</span>
                  <span>{summaryLabel}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs text-slate-500">{generateText.summary.onPeak}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {summaryLoading
                        ? "..."
                        : formatDisplayNumber(summaryTotals.onPeak)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs text-slate-500">{generateText.summary.offPeak}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {summaryLoading
                        ? "..."
                        : formatDisplayNumber(summaryTotals.offPeak)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs text-slate-500">
                      {billingMode === "monthly"
                        ? generateText.summary.monthlyTotal
                        : generateText.summary.dailyTotal}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {summaryLoading
                        ? "..."
                        : formatDisplayNumber(summaryTotals.total)}
                    </p>
                  </div>
                </div>
                {summaryError && (
                  <p className="mt-3 text-xs text-red-500">{summaryError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={[
                  "mt-2 w-full rounded-2xl px-5 py-3 text-base font-semibold text-white transition",
                  submitting
                    ? "bg-[#9bdfff] cursor-not-allowed"
                    : "bg-[#1cb5ff] hover:bg-[#11a2e6] cursor-pointer",
                ].join(" ")}
              >
                {submitting ? generateText.form.submitting : generateText.form.submit}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Modal
        open={siteGuardOpen}
        id="manual-billing-site-required"
        icon="cancel"
        title={siteGuardConfig.title}
        message={siteGuardConfig.message}
        closeLabel={siteGuardConfig.close}
        onClose={handleSiteGuardClose}
      />
      <Modal
        open={Boolean(errorModalMessage)}
        id="manual-billing-error"
        icon="warning"
        title={generateText.modal.errorTitle}
        message={errorModalMessage ?? ""}
        closeLabel={generateText.buttons.modalClose}
        onClose={() => setErrorModalMessage(null)}
      />
    </Sidebar>
  );
};

export default GenerateBillForm;

function formatDisplayNumber(value: number) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatOptionalRate(value?: string) {
  if (!value || !value.trim()) return "-";
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(4) : "-";
}

function formatInputNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number(value).toFixed(2);
}

function formatMonthYear(month?: string, year?: string, locale = "th-TH") {
  if (!month || !year) return "-";
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function buildMonthRange(month?: string, year?: string) {
  if (!month || !year) return null;
  const monthNum = Number(month);
  const yearNum = Number(year);
  if (!Number.isFinite(monthNum) || !Number.isFinite(yearNum)) return null;
  const start = new Date(yearNum, monthNum - 1, 1, 0, 0, 0, 0);
  const end = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function buildMonthRangeForRequest(month?: string, year?: string) {
  const base = buildMonthRange(month, year);
  if (!base) return null;
  const today = new Date();
  const isCurrentMonth =
    Number(month) === today.getMonth() + 1 &&
    Number(year) === today.getFullYear();
  if (!isCurrentMonth) {
    return base;
  }
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999
  );
  return {
    startIso: base.startIso,
    endIso: end.toISOString(),
  };
}

function getDefaultBillingPeriod() {
  const today = new Date();
  return {
    month: String(today.getMonth() + 1).padStart(2, "0"),
    year: String(today.getFullYear()),
  };
}

function formatDailyLabel(date: Date, locale = "th-TH") {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildDailyRange(date: Date | null) {
  const target = date ? new Date(date) : new Date();
  const start = startOfDay(target);
  const now = new Date();
  const isToday =
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate();
  let end: Date;
  if (isToday) {
    end = new Date(now);
    end.setMinutes(0, 0, 0);
  } else {
    end = endOfDay(target);
  }
  if (end.getTime() < start.getTime()) {
    end = new Date(start);
  }
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
}

function dateToValue(date: Date): DateValue {
  return {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
  };
}

