import React from "react";
import { useTranslation } from "react-i18next";
import { useMatch } from "react-router-dom";
import type { DateValue } from "../components/DateInput";
import { today as defaultToday } from "../components/Dashboard/dashboard.constants";
import { me as apiMe } from "../api/user";
import { listSites, getSiteDetails } from "../api/sites";

export type SiteOption = {
  label: string;
  value: string;
  i18nKey?: string;
  groupLabel?: string | null;
  groupId?: string | null;
};

const SELECTED_SITE_STORAGE_PREFIX = "filters:selectedSite";
const SELECTED_SITE_TTL_MS = 1000 * 60 * 15; // 15 นาทีพอให้ refresh แล้วยังจำได้ แต่ไม่ค้างนานเกินไป

type BillingPermissionState = {
  siteCode: string | null;
  loading: boolean;
  allowElectricBilling: boolean | null;
};

export type SelectedGroupSite = {
  id: string;
  label: string;
} | null;

type FiltersState = {
  date: DateValue;
  setDate: (v: DateValue) => void;
  dateTouched: boolean;
  resetDateTouched: () => void;

  selectedSite: string;
  setSelectedSite: (v: string) => void;
  selectedGroupSite: SelectedGroupSite;
  setSelectedGroupSite: (group: SelectedGroupSite) => void;

  siteOptions: SiteOption[];
  setSiteOptions: (opts: SiteOption[]) => void;

  searchSite: string;
  setSearchSite: (v: string) => void;

  billingGuard: BillingPermissionState;
};

const FiltersContext = React.createContext<FiltersState | undefined>(undefined);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const matchScopedUid = useMatch("/u/:uid/*");
  const matchRootUid = useMatch("/u/:uid");
  const activeUid = matchScopedUid?.params?.uid ?? matchRootUid?.params?.uid ?? null;
  const storageKey = activeUid
    ? `${SELECTED_SITE_STORAGE_PREFIX}:${activeUid}`
    : null;

  const [date, setDateState] = React.useState<DateValue>(defaultToday);
  const [dateTouched, setDateTouched] = React.useState<boolean>(false);
  const [selectedSite, setSelectedSiteState] = React.useState<string>("all");
  const [selectedGroupSite, setSelectedGroupSiteState] = React.useState<SelectedGroupSite>(null);
  const [siteOptions, setSiteOptions] = React.useState<SiteOption[]>([
    { label: t("navbar.allSites"), value: "all", i18nKey: "navbar.allSites" },
  ]);
  const [searchSite, setSearchSite] = React.useState("");
  const [billingGuard, setBillingGuard] = React.useState<BillingPermissionState>({
    siteCode: null,
    loading: false,
    allowElectricBilling: null,
  });
  const storedSiteRef = React.useRef<string | null>(null);
  const selectedSiteRef = React.useRef<string>("all");
  const billingPermissionCacheRef = React.useRef<Map<string, boolean>>(new Map());

  React.useEffect(() => {
    selectedSiteRef.current = selectedSite;
  }, [selectedSite]);

  const readStoredSite = React.useCallback((): string | null => {
    if (!storageKey || typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.value !== "string") return null;
      if (
        typeof parsed.expiresAt === "number" &&
        parsed.expiresAt < Date.now()
      ) {
        window.sessionStorage.removeItem(storageKey);
        return null;
      }
      return parsed.value;
    } catch {
      return null;
    }
  }, [storageKey]);

  const persistSelectedSite = React.useCallback(
    (value: string) => {
      if (!storageKey || typeof window === "undefined") return;
      try {
        const payload = {
          value,
          expiresAt: Date.now() + SELECTED_SITE_TTL_MS,
        };
        window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // เงียบไว้ (เช่น quota เต็ม)
      }
    },
    [storageKey]
  );

  React.useEffect(() => {
    storedSiteRef.current = readStoredSite();
  }, [readStoredSite]);

  React.useEffect(() => {
    if (!selectedSite || selectedSite === "all") {
      setBillingGuard({
        siteCode: null,
        loading: false,
        allowElectricBilling: null,
      });
      return;
    }
    const code = selectedSite.trim();
    const cached = billingPermissionCacheRef.current.get(code);
    if (typeof cached === "boolean") {
      setBillingGuard({
        siteCode: code,
        loading: false,
        allowElectricBilling: cached,
      });
      return;
    }
    let cancelled = false;
    setBillingGuard({
      siteCode: code,
      loading: true,
      allowElectricBilling: null,
    });
    getSiteDetails(code)
      .then((resp) => {
        if (cancelled) return;
        const raw = (resp as any)?.data ?? resp;
        const site = raw?.site ?? raw ?? {};
        const allowed = Boolean(
          site.allowElectricBilling ?? site.allow_electric_billing
        );
        billingPermissionCacheRef.current.set(code, allowed);
        setBillingGuard({
          siteCode: code,
          loading: false,
          allowElectricBilling: allowed,
        });
      })
      .catch(() => {
        if (cancelled) return;
        billingPermissionCacheRef.current.set(code, false);
        setBillingGuard({
          siteCode: code,
          loading: false,
          allowElectricBilling: false,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSite]);

  const setSelectedSite = React.useCallback(
    (value: string) => {
      setSelectedSiteState(value);
      setSelectedGroupSiteState(null);
      storedSiteRef.current = value;
      persistSelectedSite(value);
    },
    [persistSelectedSite]
  );
  const setSelectedGroupSite = React.useCallback((group: SelectedGroupSite) => {
    setSelectedGroupSiteState(group);
  }, []);

  const normalizeSiteToOption = React.useCallback((site: any): SiteOption | null => {
    if (!site || typeof site !== "object") return null;
    const rawLabel = site.name ?? site.code ?? site.id ?? "";
    const rawValue = site.code ?? site.id ?? site.name ?? "";
    const groupFromApi =
      site?.site_group ??
      site?.site_groups ??
      site?.siteGroup ??
      site?.group ??
      null;
    const label = rawLabel ? String(rawLabel).trim() : "";
    const value = rawValue ? String(rawValue).trim() : "";
    if (!value) return null;
    return {
      label: label || value,
      value,
      groupLabel: groupFromApi?.name ?? null,
      groupId: groupFromApi?.id ?? null,
    };
  }, []);

  const fetchSitesFromApi = React.useCallback(async (): Promise<SiteOption[]> => {
    try {
      const sitesResp = await listSites();
      const items = Array.isArray(sitesResp?.items)
        ? sitesResp.items
        : Array.isArray(sitesResp)
        ? sitesResp
        : [];
      return items
        .map((s: any) => normalizeSiteToOption(s))
        .filter((opt: SiteOption | null): opt is SiteOption => Boolean(opt));
    } catch {
      return [];
    }
  }, [normalizeSiteToOption]);

  const setDate = React.useCallback((v: DateValue) => {
    setDateState(v);
    setDateTouched(true);
  }, []);

  const resetDateTouched = React.useCallback(() => {
    setDateTouched(false);
  }, []);

  // Fetch role + sites to build dropdown options; include "All" for admin
  React.useEffect(() => {
    if (!activeUid) {
      setSiteOptions([
        { label: t("navbar.allSites"), value: "all", i18nKey: "navbar.allSites" },
      ]);
      storedSiteRef.current = null;
      setSelectedSite("all");
      return;
    }

    (async () => {
      try {
        const currentUser = await apiMe();
        const isAdmin = String(currentUser?.role || "").toLowerCase() === "admin";
        const assignedOptions = Array.isArray(currentUser?.sites)
          ? currentUser.sites
              .map((s: any) => normalizeSiteToOption(s))
              .filter((opt: SiteOption | null): opt is SiteOption => Boolean(opt))
          : [];

        let baseOptions: SiteOption[] = [];
        if (isAdmin) {
          baseOptions = await fetchSitesFromApi();
        } else if (assignedOptions.length > 0) {
          baseOptions = assignedOptions;
        } else {
          baseOptions = await fetchSitesFromApi();
        }

        const uniqueOptions = (() => {
          const seen = new Set<string>();
          const list: SiteOption[] = [];
          for (const opt of baseOptions) {
            const key = opt.value.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            list.push(opt);
          }
          return list;
        })();

        const opts: SiteOption[] = isAdmin
          ? [
              {
                label: t("navbar.allSites"),
                value: "all",
                i18nKey: "navbar.allSites",
              },
              ...uniqueOptions,
            ]
          : uniqueOptions;

        setSiteOptions(opts);

        const stored = storedSiteRef.current;
        const storedIsValid =
          !!stored &&
          (stored === "all"
            ? isAdmin
            : uniqueOptions.some((o) => o.value === stored));

        if (stored && storedIsValid) {
          setSelectedSite(stored);
          return;
        }

        // Default selected site: admin → all, others → first available
        const prev = selectedSiteRef.current;
        if (isAdmin) {
          setSelectedSite("all");
          return;
        }
        if (!uniqueOptions.length) {
          setSelectedSite(prev && prev !== "all" ? prev : "");
          return;
        }
        if (!prev || prev === "all") {
          setSelectedSite(uniqueOptions[0]?.value ?? prev);
          return;
        }
        if (!uniqueOptions.some((o) => o.value === prev)) {
          setSelectedSite(uniqueOptions[0]?.value ?? prev);
          return;
        }
        // keep previous
        setSelectedSite(prev);
      } catch (e) {
        // fallback to only "all" if any failure
        setSiteOptions([
          { label: t("navbar.allSites"), value: "all", i18nKey: "navbar.allSites" },
        ]);
        setSelectedSite("all");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, i18n.language, fetchSitesFromApi, normalizeSiteToOption, activeUid]);

  const value = React.useMemo<FiltersState>(
    () => ({
      date,
      setDate,
      dateTouched,
      resetDateTouched,
      selectedSite,
      setSelectedSite,
      selectedGroupSite,
      setSelectedGroupSite,
      siteOptions,
      setSiteOptions,
      searchSite,
      setSearchSite,
      billingGuard,
    }),
    [
      date,
      setDate,
      dateTouched,
      resetDateTouched,
      selectedSite,
      selectedGroupSite,
      siteOptions,
      searchSite,
      setSelectedSite,
      setSelectedGroupSite,
      billingGuard,
    ]
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = React.useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}
