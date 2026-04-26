import React from "react";
import { useTranslation } from "react-i18next";
import DatePicker from "../DateInput";
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
  const { t, i18n } = useTranslation(["dashboard"]);
  const dispatch = useAppDispatch();
  const sites = useAppSelector(selectAccessibleSites);
  const hasHydrated = useAppSelector(selectHasHydrated);
  const { date, setDate, selectedSite, siteOptions } = useFilters();
  const [pendingLng, setPendingLng] = React.useState<"th" | "en" | null>(null);

  const siteLabel = React.useMemo(() => {
    if (!selectedSite || selectedSite === "all") {
      return t("navbar.allSites", { defaultValue: "All Sites" });
    }
    return (
      siteOptions.find((option) => option.value === selectedSite)?.label ??
      selectedSite
    );
  }, [selectedSite, siteOptions, t]);

  const setLng = (lng: "th" | "en") => {
    if (i18n.language === lng || pendingLng) return;
    setPendingLng(lng);
    void i18n
      .changeLanguage(lng)
      .catch(() => undefined)
      .finally(() => setPendingLng(null));
  };

  const isActive = (lng: "th" | "en") =>
    pendingLng ? pendingLng === lng : i18n.language === lng;

  return (
    <div className="flex min-w-0 items-center gap-3 pl-8">
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

      <fieldset
        aria-label="Language switcher"
        aria-busy={pendingLng ? "true" : "false"}
        className="inline-flex h-11 items-center rounded-[18px] border border-[#CDEFFF] bg-white p-1 shadow-[0_12px_30px_rgba(57,184,238,0.12)]"
      >
        <input
          id="dashboard-lng-th"
          type="radio"
          name="dashboard-lng"
          className="sr-only"
          checked={isActive("th")}
          disabled={Boolean(pendingLng)}
          onChange={() => setLng("th")}
        />
        <label
          htmlFor="dashboard-lng-th"
          className={[
            "inline-flex h-9 items-center rounded-[14px] px-3 text-sm font-semibold transition",
            isActive("th")
              ? "bg-[#39B8EE] text-white"
              : "text-[#5B6B7F] hover:bg-[#E9F9FF] hover:text-[#1689BC]",
          ].join(" ")}
        >
          ไทย
        </label>

        <input
          id="dashboard-lng-en"
          type="radio"
          name="dashboard-lng"
          className="sr-only"
          checked={isActive("en")}
          disabled={Boolean(pendingLng)}
          onChange={() => setLng("en")}
        />
        <label
          htmlFor="dashboard-lng-en"
          className={[
            "inline-flex h-9 items-center rounded-[14px] px-3 text-sm font-semibold transition",
            isActive("en")
              ? "bg-[#39B8EE] text-white"
              : "text-[#5B6B7F] hover:bg-[#E9F9FF] hover:text-[#1689BC]",
          ].join(" ")}
        >
          EN
        </label>
      </fieldset>
    </div>
  );
}
