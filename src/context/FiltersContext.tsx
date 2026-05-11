/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { useTranslation } from "react-i18next";
import type { DateValue } from "../components/DateInput";
import { selectAuthSites } from "../features/auth";
import {
  dateFilterActions,
  selectDateFilterTouched,
  selectDateFilterValue,
} from "../features/dateFilter";
import {
  selectAccessibleSites,
  selectIsSitePickerOpen,
  selectSelectedGroup,
  selectSelectedSite,
  selectSelectedUtility,
  selectSitePickerReason,
  siteSelectionActions,
  type SelectedGroupSite,
  type SelectedUtility,
  type SiteOption,
} from "../features/siteSelection";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export type { SelectedGroupSite, SelectedUtility, SiteOption };

type BillingPermissionState = {
  siteCode: string | null;
  loading: boolean;
  allowElectricBilling: boolean | null;
};

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
const BPS_UTILITY_ID = "__bps";
const BPS_UTILITY_LABEL = "BPS";

function withFallbackGroup(option: SiteOption): SiteOption {
  if (option.groupId || option.groupLabel) {
    return option;
  }
  if (option.utilityId || option.utilityLabel) {
    return {
      ...option,
      groupId: `__site:${option.value}`,
      groupLabel: option.label,
    };
  }
  return {
    ...option,
    utilityId: BPS_UTILITY_ID,
    utilityLabel: BPS_UTILITY_LABEL,
    groupId: `${BPS_UTILITY_ID}:${option.value}`,
    groupLabel: option.label,
  };
}

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation(["dashboard"]);
  const dispatch = useAppDispatch();
  const date = useAppSelector(selectDateFilterValue);
  const dateTouched = useAppSelector(selectDateFilterTouched);
  const accessibleSites = useAppSelector(selectAccessibleSites);
  const selectedSiteRaw = useAppSelector(selectSelectedSite);
  const selectedGroupSite = useAppSelector(selectSelectedGroup);
  const selectedUtility = useAppSelector(selectSelectedUtility);
  const isPickerOpen = useAppSelector(selectIsSitePickerOpen);
  const pickerReason = useAppSelector(selectSitePickerReason);
  const authSites = useAppSelector(selectAuthSites);

  const [searchSite, setSearchSite] = React.useState("");
  const [billingGuard, setBillingGuard] =
    React.useState<BillingPermissionState>({
      siteCode: null,
      loading: false,
      allowElectricBilling: null,
    });

  const allSitesOption = React.useMemo<SiteOption>(
    () => ({
      label: t("navbar.allSites", { defaultValue: "All Sites" }),
      value: "all",
      i18nKey: "navbar.allSites",
    }),
    [t]
  );

  const siteOptions = React.useMemo<SiteOption[]>(() => {
    if (accessibleSites.length === 0) return [];
    return [allSitesOption, ...accessibleSites.map(withFallbackGroup)];
  }, [accessibleSites, allSitesOption]);

  const selectedSite = selectedSiteRaw ?? "";

  React.useEffect(() => {
    const code = selectedSite.trim();
    if (!code || code.toLowerCase() === "all") {
      setBillingGuard({
        siteCode: null,
        loading: false,
        allowElectricBilling: null,
      });
      return;
    }

    // Read billing.allowElectricBilling from /me-derived auth slice; no fetch.
    const norm = code.toLowerCase();
    const site = authSites.find(
      (s) =>
        s.code.toLowerCase() === norm || String(s.id).toLowerCase() === norm
    );
    setBillingGuard({
      siteCode: code,
      loading: false,
      allowElectricBilling: site ? site.billing.allowElectricBilling : false,
    });
  }, [selectedSite, authSites]);

  const setDate = React.useCallback(
    (v: DateValue) => {
      dispatch(dateFilterActions.setDate(v));
    },
    [dispatch]
  );

  const resetDateTouched = React.useCallback(() => {
    dispatch(dateFilterActions.resetDateTouched());
  }, [dispatch]);

  const setSelectedSite = React.useCallback(
    (value: string) => {
      const next = value.trim();
      if (!next) return;
      dispatch(
        isPickerOpen && pickerReason === "manual"
          ? siteSelectionActions.selectSiteWithoutClosingPicker(next)
          : siteSelectionActions.selectSite(next)
      );
    },
    [dispatch, isPickerOpen, pickerReason]
  );

  const setSelectedGroupSite = React.useCallback(
    (group: SelectedGroupSite) => {
      dispatch(siteSelectionActions.selectGroup(group));
    },
    [dispatch]
  );

  const setSelectedUtility = React.useCallback(
    (utility: SelectedUtility) => {
      dispatch(siteSelectionActions.selectUtility(utility));
    },
    [dispatch]
  );

  const setSiteOptions = React.useCallback((opts: SiteOption[]) => {
    void opts;
  }, []);

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
      setSelectedSite,
      selectedGroupSite,
      setSelectedGroupSite,
      selectedUtility,
      setSelectedUtility,
      siteOptions,
      setSiteOptions,
      searchSite,
      billingGuard,
    ]
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

export function useFilters() {
  const ctx = React.useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}
