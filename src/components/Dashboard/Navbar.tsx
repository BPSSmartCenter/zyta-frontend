import React from "react";
import { brandImage } from "../../assets/index";
import SearchInput from "../../components/SearchInput";
import SiteDropdownGrouped from "../../components/Shared/SiteDropdownGrouped";
import DatePicker from "../../components/DateInput";
import type { DateValue } from "../../components/DateInput";
import searchIcon from "../../assets/search.png";
import { useTranslation } from "react-i18next";

type Props = {
  searchSite: string;
  setSearchSite: (v: string) => void;
  siteOptions: SiteOption[];
  selectedSite: string;
  setSelectedSite: (v: string) => void;
  date: DateValue;
  setDate: (v: DateValue) => void;
};

type SiteOption = {
  label: string;
  value: string;
  i18nKey?: string; // โ เธ–เนเธฒเธกเธต key เธเนเธเธฐเนเธเนเนเธเธฅเนเธ”เธขเธ•เธฃเธ
};

export default function Navbar({
  searchSite,
  setSearchSite,
  siteOptions,
  selectedSite,
  setSelectedSite,
  date,
  setDate,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const [mobilePanelOpen, setMobilePanelOpen] = React.useState(false);

  // เธฃเธงเธก logic เนเธเธฅ label เธเธญเธ "เนเธเธ•เน" เนเธงเนเธ—เธตเนเน€เธ”เธตเธขเธง (เนเธกเนเธ—เธณเธฅเธฒเธข workflow เธเธญเธ Dropdown)
  const getSiteLabel = React.useCallback(
    (opt?: Partial<SiteOption> | null) => {
      if (!opt) return "";
      const val = String(opt.value ?? "").trim();
      // 1) เนเธซเนเธชเธดเธ—เธเธดเน i18nKey เธกเธฒเธเนเธญเธ เธ–เนเธฒเธเธฑเนเธ data เธ•เธฑเนเธเธกเธฒ
      if (opt.i18nKey) {
        return t(opt.i18nKey, { defaultValue: opt.label as string });
      }
      // 2) เธเนเธฒ 'all' เนเธซเนเนเธกเธเน€เธเนเธเธเธตเธขเน navbar.allSites
      if (val.toLowerCase() === "all") {
        return t("navbar.allSites");
      }
      // 3) เธเธขเธฒเธขเธฒเธกเธซเธฒเนเธ dashboard.json เธ—เธตเน 'sites.<value>' เนเธฅเนเธง fallback เน€เธเนเธ label เน€เธ”เธดเธก
      return t(`sites.${val}`, { defaultValue: opt.label as string });
    },
    [t, i18n.language]
  );
  const getSiteLabelStrict = React.useCallback(
    (opt: SiteOption) => getSiteLabel(opt),
    [getSiteLabel]
  );

  const canFilterSites = siteOptions.length > 1;
  const activeSiteOption = React.useMemo(
    () =>
      siteOptions.find((opt) => opt.value === selectedSite) ??
      siteOptions[0] ??
      null,
    [siteOptions, selectedSite]
  );
  const lockedSiteLabel = React.useMemo(
    () =>
      activeSiteOption ? getSiteLabel(activeSiteOption) : t("navbar.allSites"),
    [activeSiteOption, getSiteLabel, t]
  );

  const filteredSiteMenu = React.useMemo(() => {
    const q = (searchSite || "").toLowerCase().trim();
    if (!q || !canFilterSites) return [];
    // แปลงเป็นเมนู: label แสดงชื่อ, value เก็บตัว value จริง
    return siteOptions
      .filter(
        (s) =>
          s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
      )
      .slice(0, 50) // กันยาวเกิน
      .map((s) => ({ label: s.label, value: s.value }));
  }, [searchSite, siteOptions, canFilterSites]);

  return (
    <div className="bg-[#FFFFFF] w-full rounded-lg border-b border-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Brand */}
        <div className="flex items-center gap-4 sm:gap-6 md:gap-3">
          <img
            className="w-[110px] sm:w-[125px] md:w-[146px]"
            src={brandImage}
            alt=""
          />
          <h1 className="hidden sm:block font-inter tracking-[.03em] text-[20px] font-[600]">
            {t("navbar.title")}
          </h1>
        </div>

        {/* Desktop controls */}
        <div className="hidden lg-1024:flex items-center gap-6">
          {canFilterSites ? (
            <>
              <SearchInput
                value={searchSite}
                placeholder={t("navbar.searchPlaceholder")}
                onChange={setSearchSite}
                className="min-w-[140px]"
                resultMenu={filteredSiteMenu}
                onSelect={(item) => {
                  const label = typeof item === "string" ? item : item.label;
                  const val =
                    typeof item === "string"
                      ? item
                      : String(item.value ?? item.label);
                  setSelectedSite(val);
                  setSearchSite(label);
                }}
              />
              <SiteDropdownGrouped
                options={siteOptions as any}
                value={selectedSite}
                onChange={setSelectedSite}
                getLabel={getSiteLabelStrict}
                showUngrouped={true}
                buttonClassName="inline-flex h-10 min-w-[180px] max-w-[320px] items-center justify-between gap-2 rounded-md border border-gray-300 px-3 text-sm hover:cursor-pointer focus:bg-gray-50"
                menuClassName="absolute left-0 top-full z-[1200] mt-2 min-w-[280px] max-w-[420px] max-h-[420px] overflow-auto rounded-md border border-gray-300 bg-white p-1 shadow-md whitespace-nowrap"
              />
            </>
          ) : (
            <div className="min-w-[160px] rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
              {lockedSiteLabel}
            </div>
          )}

          <DatePicker value={date} onChange={setDate} />
        </div>

        {/* Tablet/Mobile trigger */}
        <div className="flex lg-1024:hidden items-center gap-3">
          <button
            type="button"
            onClick={() => setMobilePanelOpen((v) => !v)}
            className="size-10 rounded-full border border-gray-300 bg-white flex items-center justify-center shadow-sm active:scale-[0.98]"
            aria-label={t("navbar.openQuickActions")}
          >
            <img src={searchIcon} alt="search" className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tablet/Mobile panel */}
      {mobilePanelOpen && (
        <div className="lg:hidden">
          <div className="px-4 pb-4">
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-3">
                {canFilterSites ? (
                  <>
                    {/* Search */}
                    <div className="col-span-1">
                      <SearchInput
                        value={searchSite}
                        placeholder={t("navbar.searchPlaceholder")}
                        onChange={setSearchSite}
                        className="min-w-[140px]"
                        resultMenu={filteredSiteMenu}
                        onSelect={(item) => {
                          const label = typeof item === "string" ? item : item.label;
                          const val =
                            typeof item === "string"
                              ? item
                              : String(item.value ?? item.label);
                          setSelectedSite(val);
                          setSearchSite(label);
                        }}
                      />
                    </div>

                    {/* Site dropdown */}
                    <div className="col-span-1">
                      <SiteDropdownGrouped
                        options={siteOptions as any}
                        value={selectedSite}
                        onChange={setSelectedSite}
                        getLabel={getSiteLabelStrict}
                        showUngrouped={true}
                        rootClassName="relative inline-block w-full"
                        buttonClassName="inline-flex h-10 min-w-[180px] max-w-[320px] items-center justify-between gap-2 rounded-md border border-gray-300 px-3 text-sm hover:cursor-pointer focus:bg-gray-50"
                        menuClassName="absolute left-0 top-full z-[1200] mt-2 min-w-[280px] max-w-[420px] max-h-[420px] overflow-auto whitespace-nowrap rounded-md border border-gray-300 bg-white p-1 shadow-md"
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-1 md:col-span-2">
                    <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700">
                      {lockedSiteLabel}
                    </div>
                  </div>
                )}

                {/* Date picker */}
                <div className="col-span-1 w-full">
                  <DatePicker value={date} onChange={setDate} />
                </div>

                {/* Export dropdown */}
                <div className="col-span-1">
                </div>
              </div>

              {/* Close button */}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobilePanelOpen(false)}
                  className="h-9 px-4 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
                >
                  {t("navbar.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
