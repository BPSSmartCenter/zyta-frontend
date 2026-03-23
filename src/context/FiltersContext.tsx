import React from "react";
import { useTranslation } from "react-i18next";
import { useMatch } from "react-router-dom";
import type { DateValue } from "../components/DateInput";
import { today as defaultToday } from "../components/Dashboard/dashboard.constants";
import { me as apiMe } from "../api/user";
import { listSites, getSiteDetails } from "../api/sites";
import { listSiteGroups } from "../api/siteGroups";

export type SiteOption = {
  label: string;
  value: string;
  i18nKey?: string;
  groupLabel?: string | null;
  groupId?: string | null;
  utilityId?: string | null;
  utilityLabel?: string | null;
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

export type SelectedUtility = {
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
  selectedUtility: SelectedUtility;
  setSelectedUtility: (utility: SelectedUtility) => void;

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
  const [selectedUtility, setSelectedUtilityState] = React.useState<SelectedUtility>(null);
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
      setSelectedUtilityState(null);
      storedSiteRef.current = value;
      persistSelectedSite(value);
    },
    [persistSelectedSite]
  );
  const setSelectedGroupSite = React.useCallback((group: SelectedGroupSite) => {
    setSelectedGroupSiteState(group);
  }, []);
  const setSelectedUtility = React.useCallback((utility: SelectedUtility) => {
    setSelectedUtilityState(utility);
    setSelectedGroupSiteState(null);
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
    // Direct utility on the site takes priority; fallback to group's utility
    const utilityFromApi =
      site?.utility ??
      groupFromApi?.utility ??
      groupFromApi?.utilities ??
      null;
    const utilityId =
      utilityFromApi?.id ?? site?.utility_id ?? site?.utilityId ?? null;
    const utilityLabel = utilityFromApi?.name ?? null;
    const label = rawLabel ? String(rawLabel).trim() : "";
    const value = rawValue ? String(rawValue).trim() : "";
    if (!value) return null;
    return {
      label: label || value,
      value,
      groupLabel:
        groupFromApi?.name ??
        site?.site_group_name ??
        site?.siteGroupName ??
        site?.group_name ??
        null,
      groupId:
        groupFromApi?.id ??
        site?.site_group_id ??
        site?.siteGroupId ??
        null,
      utilityId,
      utilityLabel,
    };
  }, []);

  const fetchSitesFromApi = React.useCallback(async (): Promise<SiteOption[]> => {
    try {
      let groupsById = new Map<string, string>();
      try {
        const groups = await listSiteGroups();
        groupsById = new Map(
          (Array.isArray(groups) ? groups : [])
            .map(
              (g: any): [string, string] => [
                String(g?.id || "").trim(),
                String(g?.name || "").trim(),
              ]
            )
            .filter(([id, name]) => id.length > 0 && name.length > 0)
        );
      } catch {
        groupsById = new Map();
      }
      const sitesResp = await listSites();
      const items = Array.isArray(sitesResp?.items)
        ? sitesResp.items
        : Array.isArray(sitesResp)
        ? sitesResp
        : [];
      return items
        .map((s: any) => normalizeSiteToOption(s))
        .map((opt: SiteOption | null) => {
          if (!opt) return null;
          if (opt.groupLabel || !opt.groupId) return opt;
          const name = groupsById.get(String(opt.groupId).trim());
          return name ? { ...opt, groupLabel: name } : opt;
        })
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
        const catalogOptions = await fetchSitesFromApi();
        const catalogByValue = new Map(
          catalogOptions.map((opt) => [String(opt.value).toLowerCase(), opt] as const)
        );
        if (isAdmin) {
          baseOptions = catalogOptions;
        } else if (assignedOptions.length > 0) {
          baseOptions = assignedOptions.map((opt) => {
            const key = String(opt.value).toLowerCase();
            const catalog = catalogByValue.get(key);
            if (!catalog) return opt;
            return {
              ...opt,
              groupLabel: opt.groupLabel ?? catalog.groupLabel ?? null,
              groupId: opt.groupId ?? catalog.groupId ?? null,
              utilityId: opt.utilityId ?? catalog.utilityId ?? null,
              utilityLabel: opt.utilityLabel ?? catalog.utilityLabel ?? null,
            };
          });
        } else {
          baseOptions = catalogOptions;
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

        const includeAllOption = uniqueOptions.length > 0;
        const opts: SiteOption[] = includeAllOption
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
            ? includeAllOption
            : uniqueOptions.some((o) => o.value === stored));

        if (stored && storedIsValid) {
          setSelectedSite(stored);
          return;
        }

        // Default selected site: prefer "all" so every role can aggregate their accessible sites.
        const prev = selectedSiteRef.current;
        if (includeAllOption) {
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
      selectedUtility,
      setSelectedUtility,
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
      selectedUtility,
      siteOptions,
      searchSite,
      setSelectedSite,
      setSelectedGroupSite,
      setSelectedUtility,
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
