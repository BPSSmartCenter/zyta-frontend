import React from "react";
import { useTranslation } from "react-i18next";
import type { DateValue } from "../components/DateInput";
import { today as defaultToday } from "../components/Dashboard/dashboard.constants";
import { me as apiMe } from "../api/user";
import { listSites } from "../api/sites";

export type SiteOption = { label: string; value: string; i18nKey?: string };

type FiltersState = {
  date: DateValue;
  setDate: (v: DateValue) => void;
  dateTouched: boolean;
  resetDateTouched: () => void;

  selectedSite: string;
  setSelectedSite: (v: string) => void;

  siteOptions: SiteOption[];
  setSiteOptions: (opts: SiteOption[]) => void;

  searchSite: string;
  setSearchSite: (v: string) => void;
};

const FiltersContext = React.createContext<FiltersState | undefined>(undefined);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation(["dashboard"]);

  const [date, setDateState] = React.useState<DateValue>(defaultToday);
  const [dateTouched, setDateTouched] = React.useState<boolean>(false);
  const [selectedSite, setSelectedSite] = React.useState<string>("all");
  const [siteOptions, setSiteOptions] = React.useState<SiteOption[]>([
    { label: t("navbar.allSites"), value: "all", i18nKey: "navbar.allSites" },
  ]);
  const [searchSite, setSearchSite] = React.useState("");

  const normalizeSiteToOption = React.useCallback((site: any): SiteOption | null => {
    if (!site || typeof site !== "object") return null;
    const rawLabel = site.name ?? site.code ?? site.id ?? "";
    const rawValue = site.code ?? site.id ?? site.name ?? "";
    const label = rawLabel ? String(rawLabel).trim() : "";
    const value = rawValue ? String(rawValue).trim() : "";
    if (!value) return null;
    return { label: label || value, value };
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

        // Default selected site: admin → all, others → first available
        setSelectedSite((prev) => {
          if (isAdmin) return "all";
          if (!uniqueOptions.length) {
            return prev && prev !== "all" ? prev : "";
          }
          if (!prev || prev === "all") {
            return uniqueOptions[0]?.value ?? prev;
          }
          // keep previous if still exists
          return uniqueOptions.some((o) => o.value === prev)
            ? prev
            : uniqueOptions[0]?.value ?? prev;
        });
      } catch (e) {
        // fallback to only "all" if any failure
        setSiteOptions([
          { label: t("navbar.allSites"), value: "all", i18nKey: "navbar.allSites" },
        ]);
        setSelectedSite("all");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, i18n.language, fetchSitesFromApi, normalizeSiteToOption]);

  const value = React.useMemo<FiltersState>(
    () => ({
      date,
      setDate,
      dateTouched,
      resetDateTouched,
      selectedSite,
      setSelectedSite,
      siteOptions,
      setSiteOptions,
      searchSite,
      setSearchSite,
    }),
    [date, setDate, dateTouched, resetDateTouched, selectedSite, siteOptions, searchSite]
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = React.useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}
