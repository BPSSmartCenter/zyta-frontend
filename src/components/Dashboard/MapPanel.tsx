import Dropdown from "../Dropdown";
import Map from "../Map";
import {
  EVENT_OPTIONS,
  SEVERITY_OPTIONS,
  LOCATION_OPTIONS,
} from "../Dashboard/dashboard.constants";
import { notis } from "../../data/Dashboard/notis";

type Props = {
  selectedEvents: string[];
  buttonLabel: string;
  toggleEvent: (v: string) => void;
  site: string;
  setSite: (v: string) => void;
  province: string;
  setProvince: (v: string) => void;
};

export default function MapPanel({
  selectedEvents,
  buttonLabel,
  toggleEvent,
  site,
  setSite,
  province,
  setProvince,
}: Props) {
  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-3">
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        MAP
      </h1>
      <div className="flex items-center flex-wrap gap-5">
        {/* All Event Map */}
        <Dropdown options={EVENT_OPTIONS} value="__multi__" onChange={() => {}}>
          {({ open, getButtonProps, getMenuProps }) => (
            <div className="relative inline-block">
              <button
                {...getButtonProps({
                  type: "button",
                  className:
                    "inline-flex h-8 w-[120px] items-center justify-around rounded-md border border-cyan-500 px-2 text-sm hover:cursor-pointer focus:bg-gray-50",
                })}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="truncate text-cyan-500">{buttonLabel}</span>
                <i className="material-icons arrow-icon leading-none text-cyan-500">
                  {open ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                </i>
              </button>
              <div
                {...getMenuProps({
                  className: [
                    "absolute left-0 top-full mt-2 min-w-[220px] rounded-md",
                    "border border-gray-300 bg-white p-2 shadow-md",
                    "max-h-80 overflow-y-auto z-50",
                    "transition-all duration-150",
                    open
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 -translate-y-1 pointer-events-none",
                  ].join(" "),
                })}
                onMouseDown={(e) => e.preventDefault()}
              >
                {EVENT_OPTIONS.map((opt) => {
                  const checked = selectedEvents.includes("all")
                    ? opt.value === "all"
                    : selectedEvents.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={[
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-gray-50 hover:cursor-pointer",
                        checked ? "bg-gray-50" : "",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 checked:bg-cyan !ring-0 !ring-offset-0 hover:cursor-pointer"
                        checked={checked}
                        onChange={() => toggleEvent(opt.value)}
                        onMouseDown={(e) => e.preventDefault()}
                      />
                      <span className="text-gray-800">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </Dropdown>
        {/* Any Severity */}
        <Dropdown options={SEVERITY_OPTIONS} value={site} onChange={setSite}>
          {({
            open,
            selected,
            options,
            getButtonProps,
            getMenuProps,
            getItemProps,
          }) => (
            <>
              <button
                {...getButtonProps({
                  type: "button",
                  className:
                    "inline-flex h-8 w-[120px] items-center justify-around rounded-md border border-cyan-500 px-2 text-sm hover:cursor-pointer focus:bg-gray-50 text-cyan-500",
                })}
              >
                <span className="truncate">
                  {selected?.label || "Any Severity"}
                </span>
                <i className="material-icons arrow-icon leading-none text-cyan-500">
                  {open ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                </i>
              </button>
              <div
                {...getMenuProps({
                  className: [
                    "absolute z-10 mt-9 min-w-[142px] rounded-md border border-gray-300 bg-white p-1 shadow-md",
                    "transition-all duration-150",
                    open
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 -translate-y-1 pointer-events-none",
                    "max-h-80 overflow-y-auto",
                  ].join(" "),
                })}
              >
                {options.map((opt) => {
                  const active = opt.value === selected?.value;
                  return (
                    <button
                      key={opt.value}
                      {...getItemProps(opt, {
                        type: "button",
                        className: [
                          "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer",
                          active
                            ? "bg-gray-100 text-gray-900 font-medium"
                            : "text-gray-800",
                        ].join(" "),
                      })}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Dropdown>

        {/* All Location */}
        <Dropdown
          options={LOCATION_OPTIONS}
          value={province}
          onChange={setProvince}
        >
          {({
            open,
            selected,
            options,
            getButtonProps,
            getMenuProps,
            getItemProps,
          }) => (
            <div className="relative inline-block">
              <button
                {...getButtonProps({
                  type: "button",
                  className:
                    "inline-flex h-8 w-[110px] items-center justify-between rounded-md border border-cyan-500 px-2 text-sm hover:cursor-pointer focus:bg-gray-50",
                })}
              >
                <span className="truncate text-cyan-500">
                  {selected?.label || "All Location"}
                </span>
                <i className="material-icons arrow-icon leading-none text-cyan-500">
                  {open ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                </i>
              </button>
              <div
                {...getMenuProps({
                  className: [
                    "absolute left-0 top-full mt-2 min-w-[115px] rounded-xl",
                    "border border-gray-300 bg-white p-1 shadow-md",
                    "max-h-80 overflow-y-auto z-50",
                    "transition-all duration-150",
                    open
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 -translate-y-1 pointer-events-none",
                  ].join(" "),
                })}
              >
                {options.map((opt) => {
                  const active = opt.value === selected?.value;
                  return (
                    <button
                      key={opt.value}
                      {...getItemProps(opt, {
                        type: "button",
                        className: [
                          "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer",
                          active
                            ? "bg-gray-100 text-gray-900 font-medium"
                            : "text-gray-800",
                        ].join(" "),
                      })}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Dropdown>
      </div>
      <div className="h-[680px] sm:h-[680px] lg:h-[680px] w-full bg-gray-200 rounded-lg flex items-center justify-center">
        <Map notis={notis} />
      </div>
    </form>
  );
}
