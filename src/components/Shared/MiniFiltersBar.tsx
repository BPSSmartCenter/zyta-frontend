import React from "react";
import SiteDropdownGrouped from "./SiteDropdownGrouped";
import DatePicker from "../DateInput";
import { useFilters } from "../../context/FiltersContext";
import { useUserPath } from "../../routes/useUserPath";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  selectAccessibleSites,
  selectHasHydrated,
  siteSelectionActions,
} from "../../features/siteSelection";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

type Props = {
  page?: "devices" | "alert" | "facerec" | "dashboard";
  className?: string;
  variant?: "default" | "hero";
};

export default function MiniFiltersBar({
  page,
  className = "",
  variant = "default",
}: Props) {
  const { t } = useTranslation(["dashboard"]);
  const dispatch = useAppDispatch();
  const accessibleSites = useAppSelector(selectAccessibleSites);
  const hasHydrated = useAppSelector(selectHasHydrated);
  const {
    date,
    setDate,
    selectedSite,
    setSelectedSite,
    selectedGroupSite,
    setSelectedGroupSite,
    selectedUtility,
    setSelectedUtility,
    siteOptions,
  } =
    useFilters();

  const { abs, absSite } = useUserPath();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // Sync context with current route param if present — validate against allowed options
  React.useEffect(() => {
    const routeSite = params.siteCode ? String(params.siteCode) : null;
    if (!routeSite || routeSite === selectedSite) return;
    // ตรวจว่า routeSite อยู่ใน siteOptions ที่ user มีสิทธิ์เท่านั้น
    const allowed = siteOptions.some((o) => o.value === routeSite);
    if (allowed) {
      setSelectedSite(routeSite);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.siteCode, siteOptions]);

  const navigateToPage = React.useCallback(
    (siteCode?: string) => {
      if (!page) return;
      if (page === "devices" || page === "alert" || page === "dashboard" || page === "facerec") {
        const path = `/${page}`;
        const pathname = siteCode ? absSite(path, siteCode) : abs(path);
        if (page === "devices") {
          navigate({ pathname, search: location.search || "" });
        } else {
          navigate(pathname);
        }
      }
    },
    [page, abs, absSite, navigate, location.search]
  );

  const onChangeSite = (val: string) => {
    setSelectedSite(val);
    const siteCode = val && val !== "all" ? val : undefined;
    navigateToPage(siteCode);
  };

  const onSelectGroup = (group: { id: string; label: string }) => {
    setSelectedSite("all");
    setSelectedGroupSite(group);
    navigateToPage();
  };

  const onSelectUtility = (utility: { id: string; label: string }) => {
    setSelectedSite("all");
    setSelectedUtility(utility);
    navigateToPage();
  };

  const isHero = variant === "hero";
  const heroSiteLabel = React.useMemo(() => {
    if (!selectedSite || selectedSite === "all") {
      return t("navbar.allSites", { defaultValue: "All Sites" });
    }
    return (
      siteOptions.find((option) => option.value === selectedSite)?.label ??
      selectedSite
    );
  }, [selectedSite, siteOptions, t]);

  return (
    <div
      className={[
        isHero
          ? "flex w-full flex-col gap-3 xl:flex-row xl:items-stretch"
          : "flex items-center gap-2 flex-wrap",
        className,
      ].join(" ")}
    >
      {isHero ? (
        <button
          type="button"
          disabled={!hasHydrated || accessibleSites.length <= 1}
          onClick={() =>
            dispatch(siteSelectionActions.openPicker({ reason: "manual" }))
          }
          className={[
            "inline-flex h-11 w-full min-w-0 flex-1 items-center gap-2 rounded-[18px] border border-[#CDEFFF] bg-white px-4 text-left text-sm font-semibold text-[#2F3E56] shadow-[0_12px_30px_rgba(57,184,238,0.12)] transition hover:border-[#8CDEFF] hover:text-[#16324A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#39B8EE]/15",
            (!hasHydrated || accessibleSites.length <= 1) &&
              "cursor-default opacity-80 hover:border-[#CDEFFF] hover:text-[#2F3E56]",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#E9F9FF] text-[#39B8EE]"
            aria-hidden="true"
          >
            <span className="material-icons-outlined text-[18px]">
              apartment
            </span>
          </span>
          <span className="truncate">{heroSiteLabel}</span>
        </button>
      ) : (
        <SiteDropdownGrouped
          options={siteOptions as any}
          value={selectedSite}
          onChange={onChangeSite}
          selectedGroup={selectedGroupSite}
          onSelectGroup={onSelectGroup}
          selectedUtility={selectedUtility}
          onSelectUtility={onSelectUtility}
          showUngrouped={true}
          showUngroupedHeader={false}
          rootClassName={isHero ? "min-w-0 flex-1" : undefined}
          buttonClassName="inline-flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-md border border-gray-300 px-3 text-sm hover:cursor-pointer focus:bg-gray-50"
          menuClassName="absolute left-0 top-full z-[1200] mt-2 min-w-[280px] max-w-[420px] max-h-[420px] overflow-auto whitespace-nowrap rounded-md border border-gray-300 bg-white p-1 shadow-md"
        />
      )}

      <DatePicker
        value={date}
        onChange={setDate}
        className={
          isHero
            ? "!h-11 !w-full !rounded-[18px] !border-[#CDEFFF] !bg-white !pl-4 !pr-11 !text-sm !font-semibold !text-[#2F3E56] shadow-[0_12px_30px_rgba(57,184,238,0.12)] xl:!w-[176px]"
            : ""
        }
        iconClassName={isHero ? "!text-[#39B8EE]" : ""}
        textAlign={isHero ? "left" : "center"}
      />
    </div>
  );
}
