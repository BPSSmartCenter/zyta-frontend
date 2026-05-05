import React from "react";
import { useTranslation } from "react-i18next";
import DatePicker from "../DateInput";
import LanguagePillSwitcher from "../LanguagePillSwitcher";
import { useFilters } from "../../context/FiltersContext";
import {
  selectAccessibleSites,
  selectHasHydrated,
  siteSelectionActions,
} from "../../features/siteSelection";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

const pillButtonClass =
  "inline-flex h-11 items-center gap-2 rounded-[18px] border border-[#CDEFFF] bg-white px-4 text-sm font-semibold text-[#2F3E56] shadow-[0_12px_30px_rgba(57,184,238,0.12)] transition hover:border-[#8CDEFF] hover:text-[#16324A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#39B8EE]/15";

export default function DashboardTopBar() {
  const { t } = useTranslation(["dashboard"]);
  const dispatch = useAppDispatch();
  const sites = useAppSelector(selectAccessibleSites);
  const hasHydrated = useAppSelector(selectHasHydrated);
  const { date, setDate, selectedSite, siteOptions } = useFilters();

  const siteLabel = React.useMemo(() => {
    if (!selectedSite || selectedSite === "all") {
      return t("navbar.allSites", { defaultValue: "All Sites" });
    }
    return (
      siteOptions.find((option) => option.value === selectedSite)?.label ??
      selectedSite
    );
  }, [selectedSite, siteOptions, t]);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        disabled={!hasHydrated || sites.length <= 1}
        onClick={() =>
          dispatch(siteSelectionActions.openPicker({ reason: "manual" }))
        }
        className={[
          pillButtonClass,
          "min-w-0 max-w-[340px] flex-1",
          (!hasHydrated || sites.length <= 1) &&
            "cursor-default opacity-80 hover:border-[#CDEFFF] hover:text-[#2F3E56]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#E9F9FF] text-[#39B8EE]"
          aria-hidden="true"
        >
          <span className="material-icons-outlined text-[18px]">apartment</span>
        </span>
        <span className="max-w-[220px] truncate">{siteLabel}</span>
      </button>

      <DatePicker
        value={date}
        onChange={setDate}
        textAlign="left"
        className="!h-11 !w-[164px] !rounded-[18px] !border-[#CDEFFF] !bg-white !pl-4 !pr-11 !text-sm !font-semibold !text-[#2F3E56] shadow-[0_12px_30px_rgba(57,184,238,0.12)] lg:!w-[176px]"
        iconClassName="!text-[#39B8EE]"
        buttonTitle={t("date.selectDate", {
          defaultValue: "เลือกวันที่",
        })}
        buttonAriaLabel={t("date.selectDate", {
          defaultValue: "เลือกวันที่",
        })}
      />

      <LanguagePillSwitcher name="dashboard-lng" />
    </div>
  );
}
