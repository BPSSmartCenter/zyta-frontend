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
  const [dateTouched, setDateTouched] = React.useState<boolean>(true);
  const [selectedSite, setSelectedSite] = React.useState<string>("all");
  const [siteOptions, setSiteOptions] = React.useState<SiteOption[]>([
    { label: t("navbar.allSites"), value: "all", i18nKey: "navbar.allSites" },
  ]);
  const [searchSite, setSearchSite] = React.useState("");

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
        let sitesResp: any = null;
        try {
          sitesResp = await listSites();
        } catch (e) {
          sitesResp = null;
        }

        const items = Array.isArray(sitesResp?.items)
          ? sitesResp.items
          : Array.isArray(sitesResp)
          ? sitesResp
          : [];

        const baseOptions: SiteOption[] = items.map((s: any) => ({
          label: String(s?.name ?? s?.code ?? ""),
          value: String(s?.code ?? s?.id ?? s?.name ?? ""),
        }));

        const isAdmin = String(currentUser?.role || "").toLowerCase() === "admin";
        const opts: SiteOption[] = isAdmin
          ? [
              {
                label: t("navbar.allSites"),
                value: "all",
                i18nKey: "navbar.allSites",
              },
              ...baseOptions,
            ]
          : baseOptions;

        setSiteOptions(opts);

        // Default selected site: admin → all, others → first available
        setSelectedSite((prev) => {
          if (isAdmin) return "all";
          if (!prev || prev === "all") {
            return baseOptions[0]?.value ?? prev;
          }
          // keep previous if still exists
          return baseOptions.some((o) => o.value === prev)
            ? prev
            : baseOptions[0]?.value ?? prev;
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
  }, [t, i18n.language]);

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
