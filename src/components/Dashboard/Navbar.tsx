import React from "react";
import { brandImage, exportImage } from "../../assets/index";
import SearchInput from "../../components/SearchInput";
import Dropdown from "../../components/Dropdown";
import DatePicker from "../../components/DateInput";
import type { DateValue } from "../../components/DateInput";
import { exportFile } from "./dashboard.constants";
import { allSites } from "../../data/Dashboard/notis";
import searchIcon from "../../assets/search.png";
import { useTranslation } from "react-i18next";

type Props = {
  searchSite: string;
  setSearchSite: (v: string) => void;
  site: string;
  setSite: (v: string) => void;
  date: DateValue;
  setDate: (v: DateValue) => void;
};

type SiteOption = {
  label: string;
  value: string;
  i18nKey?: string; // ← ถ้ามี key ก็จะใช้แปลโดยตรง
};

export default function Navbar({
  searchSite,
  setSearchSite,
  site,
  setSite,
  date,
  setDate,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const [mobilePanelOpen, setMobilePanelOpen] = React.useState(false);

  // รวม logic แปล label ของ "ไซต์" ไว้ที่เดียว (ไม่ทำลาย workflow ของ Dropdown)
  const getSiteLabel = React.useCallback(
    (opt?: Partial<SiteOption> | null) => {
      if (!opt) return "";
      const val = String(opt.value ?? "").trim();
      // 1) ให้สิทธิ์ i18nKey มาก่อน ถ้าฝั่ง data ตั้งมา
      if (opt.i18nKey) {
        return t(opt.i18nKey, { defaultValue: opt.label as string });
      }
      // 2) ค่า 'all' ให้แมปเป็นคีย์ navbar.allSites
      if (val.toLowerCase() === "all") {
        return t("navbar.allSites");
      }
      // 3) พยายามหาใน dashboard.json ที่ 'sites.<value>' แล้ว fallback เป็น label เดิม
      return t(`sites.${val}`, { defaultValue: opt.label as string });
    },
    [t, i18n.language]
  );

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
          <SearchInput
            value={searchSite}
            placeholder={t("navbar.searchPlaceholder")}
            onChange={setSearchSite}
            className="min-w-[140px]"
          />

          <Dropdown options={allSites as any} value={site} onChange={setSite}>
            {({
              open,
              selected,
              options,
              getButtonProps,
              getMenuProps,
              getItemProps,
            }) => {
              // ป้ายบนปุ่ม: แปลจาก selected (หรือใช้ All Sites ถ้าไม่มี)
              const selectedLabel =
                (selected && getSiteLabel(selected)) || t("navbar.allSites");

              return (
                <>
                  <button
                    {...getButtonProps({
                      className:
                        "inline-flex h-10 w-[105px] items-center justify-around rounded-md border border-gray-300 px-1 text-sm hover:cursor-pointer focus:bg-gray-50",
                    })}
                  >
                    <span className="truncate">{selectedLabel}</span>
                    <i className="material-icons leading-none">
                      {open ? "arrow_drop_up" : "arrow_drop_down"}
                    </i>
                  </button>

                  <div
                    {...getMenuProps({
                      className: [
                        "absolute z-10 mt-12 min-w-[110px] rounded-md border border-gray-300 bg-white p-1 shadow-md",
                        "transition-all duration-150",
                        open
                          ? "opacity-100 translate-y-0 pointer-events-auto"
                          : "opacity-0 -translate-y-1 pointer-events-none",
                        "max-h-80 overflow-y-auto",
                      ].join(" "),
                    })}
                  >
                    {(options as SiteOption[]).map((opt) => {
                      const active = opt.value === selected?.value;
                      return (
                        <button
                          key={opt.value}
                          {...getItemProps(opt, {
                            className: [
                              "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer",
                              active
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-800",
                            ].join(" "),
                          })}
                        >
                          {getSiteLabel(opt)}
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            }}
          </Dropdown>

          <DatePicker value={date} onChange={setDate} />

          <Dropdown options={exportFile}>
            {({
              open,
              options,
              getButtonProps,
              getMenuProps,
              getItemProps,
            }) => (
              <>
                <button
                  {...getButtonProps({
                    className:
                      "inline-flex h-10 w-[105px] items-center justify-center rounded-md border border-gray-300 px-3 text-sm text-[#414651] font-inter font-bold hover:cursor-pointer focus:bg-gray-50",
                  })}
                >
                  <span className="truncate flex items-center gap-2">
                    <img src={exportImage} alt="" /> {t("navbar.export")}
                  </span>
                </button>

                <div
                  {...getMenuProps({
                    className: [
                      "absolute z-10 mt-12 right-[-11px] min-w-[128px] rounded-md border border-gray-300 bg-white p-1 shadow-md",
                      "transition-all duration-150",
                      open
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 -translate-y-1 pointer-events-none",
                      "max-h-80 overflow-y-auto",
                    ].join(" "),
                  })}
                >
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      {...getItemProps(opt, {
                        className:
                          "flex w-full items-center rounded-lg px-3 py-2 text-left text-[14px] hover:bg-gray-100 hover:cursor-pointer",
                      })}
                    >
                      {t(`navbar.exportOptions.${opt.value}`, {
                        defaultValue: opt.label,
                      })}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Dropdown>
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
                {/* Search */}
                <div className="col-span-1">
                  <SearchInput
                    value={searchSite}
                    placeholder="ช่องค้นหา Sites"
                    onChange={setSearchSite}
                  />
                </div>

                {/* Site dropdown */}
                <div className="col-span-1">
                  <Dropdown
                    options={allSites as any}
                    value={site}
                    onChange={setSite}
                  >
                    {({
                      open,
                      selected,
                      options,
                      getButtonProps,
                      getMenuProps,
                      getItemProps,
                    }) => {
                      const selectedLabel =
                        (selected && getSiteLabel(selected)) ||
                        t("navbar.allSites");
                      return (
                        <div className="relative inline-block w-full">
                          <button
                            {...getButtonProps({
                              className:
                                "inline-flex h-10 w-full items-center justify-between rounded-md border border-gray-300 px-3 text-sm hover:cursor-pointer focus:bg-gray-50",
                            })}
                          >
                            <span className="truncate">{selectedLabel}</span>
                            <i className="material-icons leading-none">
                              {open ? "arrow_drop_up" : "arrow_drop_down"}
                            </i>
                          </button>

                          <div
                            {...getMenuProps({
                              className: [
                                "absolute z-50 mt-2 min-w-full rounded-md border border-gray-300 bg-white p-1 shadow-md",
                                "transition-all duration-150",
                                open
                                  ? "opacity-100 translate-y-0 pointer-events-auto"
                                  : "opacity-0 -translate-y-1 pointer-events-none",
                                "max-h-80 overflow-y-auto",
                              ].join(" "),
                            })}
                          >
                            {(options as SiteOption[]).map((opt) => {
                              const active = opt.value === selected?.value;
                              return (
                                <button
                                  key={opt.value}
                                  {...getItemProps(opt, {
                                    className: [
                                      "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer",
                                      active
                                        ? "bg-gray-100 text-gray-900 font-medium"
                                        : "text-gray-800",
                                    ].join(" "),
                                  })}
                                >
                                  {getSiteLabel(opt)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }}
                  </Dropdown>
                </div>

                {/* Date picker */}
                <div className="col-span-1 w-full">
                  <DatePicker value={date} onChange={setDate} />
                </div>

                {/* Export dropdown */}
                <div className="col-span-1">
                  <Dropdown options={exportFile}>
                    {({
                      open,
                      options,
                      getButtonProps,
                      getMenuProps,
                      getItemProps,
                    }) => (
                      <div className="relative inline-block w-full">
                        <button
                          {...getButtonProps({
                            className:
                              "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm text-[#414651] font-inter font-bold hover:cursor-pointer focus:bg-gray-50",
                          })}
                        >
                          <img src={exportImage} alt="" className="w-4 h-4" />
                          <span className="truncate">{t("navbar.export")}</span>
                        </button>

                        <div
                          {...getMenuProps({
                            className: [
                              "absolute z-50 mt-2 min-w-full rounded-md border border-gray-300 bg-white p-1 shadow-md",
                              "transition-all duration-150",
                              open
                                ? "opacity-100 translate-y-0 pointer-events-auto"
                                : "opacity-0 -translate-y-1 pointer-events-none",
                              "max-h-80 overflow-y-auto",
                            ].join(" "),
                          })}
                        >
                          {options.map((opt) => (
                            <button
                              key={opt.value}
                              {...getItemProps(opt, {
                                className:
                                  "flex w-full items-center rounded-lg px-3 py-2 text-left text-[14px] hover:bg-gray-100 hover:cursor-pointer",
                              })}
                            >
                              {t(`navbar.exportOptions.${opt.value}`, {
                                defaultValue: opt.label,
                              })}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </Dropdown>
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
