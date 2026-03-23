import React from "react";
import SiteDropdownGrouped from "./SiteDropdownGrouped";
import DatePicker from "../DateInput";
import { useFilters } from "../../context/FiltersContext";
import { useUserPath } from "../../routes/useUserPath";
import { useNavigate, useParams, useLocation } from "react-router-dom";

type Props = {
  page?: "devices" | "alert" | "facerec" | "dashboard";
  className?: string;
};

export default function MiniFiltersBar({ page, className = "" }: Props) {
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

  // Sync context with current route param if present
  React.useEffect(() => {
    const routeSite = params.siteCode ? String(params.siteCode) : null;
    if (routeSite && routeSite !== selectedSite) {
      setSelectedSite(routeSite);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.siteCode]);

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

  return (
    <div className={["flex items-center gap-2 flex-wrap", className].join(" ")}>
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
        buttonClassName="inline-flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-md border border-gray-300 px-3 text-sm hover:cursor-pointer focus:bg-gray-50"
        menuClassName="absolute left-0 top-full z-[1200] mt-2 min-w-[280px] max-w-[420px] max-h-[420px] overflow-auto whitespace-nowrap rounded-md border border-gray-300 bg-white p-1 shadow-md"
      />

      <DatePicker value={date} onChange={setDate} />
    </div>
  );
}
