import React from "react";
import Dropdown from "../Dropdown";
import DatePicker from "../DateInput";
import { useFilters } from "../../context/FiltersContext";
import { useUserPath } from "../../routes/useUserPath";
import { useNavigate, useParams } from "react-router-dom";

type Props = {
  page?: "devices" | "alert" | "facerec" | "dashboard";
  className?: string;
};

export default function MiniFiltersBar({ page, className = "" }: Props) {
  const { date, setDate, selectedSite, setSelectedSite, siteOptions } =
    useFilters();

  const { abs, absSite } = useUserPath();
  const navigate = useNavigate();
  const params = useParams();

  // Sync context with current route param if present
  React.useEffect(() => {
    const routeSite = params.siteCode ? String(params.siteCode) : null;
    if (routeSite && routeSite !== selectedSite) {
      setSelectedSite(routeSite);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.siteCode]);

  const onChangeSite = (val: string) => {
    setSelectedSite(val);
    // Navigate for pages that support :siteCode in URL
    if (!page) return;
    if (page === "devices" || page === "alert" || page === "dashboard" || page === "facerec") {
      const siteCode = val && val !== "all" ? val : undefined;
      const path = `/${page}`;
      const to = siteCode ? absSite(path, siteCode) : abs(path);
      navigate(to);
    }
  };

  return (
    <div className={["flex items-center gap-2 flex-wrap", className].join(" ")}>
      <Dropdown
        options={siteOptions as any}
        value={selectedSite}
        onChange={onChangeSite}
      >
        {({
          open,
          selected,
          options,
          getButtonProps,
          getMenuProps,
          getItemProps,
        }) => (
          <div className="relative">
            <button
              {...getButtonProps({
                className:
                  "inline-flex h-10 min-w-[105px] items-center justify-around rounded-md border border-gray-300 px-1 text-sm hover:cursor-pointer focus:bg-gray-50",
              })}
            >
              <span className="truncate">
                {selected?.label ?? options[0]?.label ?? ""}
              </span>
              <i className="material-icons leading-none">
                {open ? "arrow_drop_up" : "arrow_drop_down"}
              </i>
            </button>
            <div
              {...getMenuProps({
                className: [
                  "absolute z-50 mt-2 min-w-[200px] whitespace-nowrap rounded-md border border-gray-300 bg-white p-1 shadow-md",
                  "transition-all duration-150",
                  open
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 -translate-y-1 pointer-events-none",
                  "max-h-80 overflow-y-auto",
                ].join(" "),
              })}
            >
              {(options as any[]).map((opt) => (
                <button
                  key={opt.value}
                  {...getItemProps(opt, {
                    className:
                      "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer",
                  })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Dropdown>

      <DatePicker value={date} onChange={setDate} />
    </div>
  );
}
