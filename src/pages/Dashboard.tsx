import React from "react";
import {
  brandImage,
  exportImage,
  fireImage,
  motionImage,
  deviceImage,
  fallImage,
  sleepImage,
  fallImageSelected,
  sleepImageSelected,
  motionImageSelected,
  deviceImageSelected,
  fireImageSelected,
  cctvImage,
  intercomeImage,
  solarImage,
  windImage,
  waterTapImage,
  fireCamera,
  motionCamera,
  sleepCamera,
  offlineDeviceCamera,
  fallCamera,
} from "../assets/index";
import SearchInput from "../components/SearchInput";
import Dropdown from "../components/Dropdown";
import DatePicker from "../components/DateInput";
import type { DateValue } from "../components/DateInput";
import StatCard, { StatCardGroup } from "../components/StatCard";
import CameraTile from "../components/CameraTile";
import NotiCard from "../components/notiCard";
import Map from "../components/Map";
import StatsDonut from "../components/StatsDonut";
import DonutLegend from "../components/DonutLegend";
import RadialBar from "../components/RadialBar";
import WeeklySnapshotChart from "../components/Chart";
import {
  notis,
  wellBeingNotis,
  recognizeNotis,
  allSites,
  TH_PROVINCES,
} from "../data/Dashboard/notis";

const CAMERA_ITEMS = [
  { ringColor: "ring-transparent", imgSrc: fireCamera }, // Fire
  { ringColor: "ring-transparent", imgSrc: motionCamera }, // Walk
  { ringColor: "ring-transparent", imgSrc: offlineDeviceCamera }, // Parking
  { ringColor: "ring-transparent", imgSrc: fallCamera }, // Fall
  { ringColor: "ring-transparent", imgSrc: sleepCamera }, // Sleep
];

export const statItems = [
  {
    key: "fire",
    label: "Fire detected",
    val: 12,
    img: fireImage,
    activeImg: fireImageSelected,
  },
  {
    key: "motion",
    label: "Motion detected",
    val: 9,
    img: motionImage,
    activeImg: motionImageSelected,
  },
  {
    key: "device",
    label: "จำนวนกล้องออฟไลน์ / ออนไลน์",
    val: "8 / 50",
    img: deviceImage,
    activeImg: deviceImageSelected,
  },
  {
    key: "fall",
    label: "Fall detected",
    val: 15,
    img: fallImage,
    activeImg: fallImageSelected,
  },
  {
    key: "sleeping",
    label: "Sleep detected",
    val: 13,
    img: sleepImage,
    activeImg: sleepImageSelected,
  },
];

const today = (() => {
  const d = new Date();
  return {
    y: d.getFullYear(),
    m: d.getMonth() + 1,
    d: d.getDate(),
  } as DateValue;
})();

const exportFile = [
  { label: "Export to PDF", value: "pdf" },
  { label: "Export to Word", value: "word" },
  { label: "Export to Excel", value: "excel" },
];

const EVENT_OPTIONS = [
  { label: "All Events", value: "all" },
  { label: "Fire detection", value: "fire" },
  { label: "Motion detection", value: "motion" },
  { label: "กล้องออฟไลน์", value: "offline" },
];

const SEVERITY_OPTIONS = [
  { label: "Any Severity", value: "all" },
  { label: "Fire detection", value: "fire" },
  { label: "Motion detection", value: "motion" },
  { label: "กล้องออฟไลน์", value: "offline" },
];

const LOCATION_OPTIONS = [
  { label: "All Location", value: "all" },
  ...TH_PROVINCES.map((p) => ({ label: p, value: p })),
];

const chartSeries = [
  { name: "08–16", data: [13, 6, 12, 1, 5, 68, 55] },
  { name: "16–24", data: [11, 2, 46, 5, 7, 32, 40] },
  { name: "24–08", data: [7, 1, 67, 14, 9, 13, 13] },
];

const avgOfSeriesMax = Math.ceil(
  chartSeries.reduce((sum, s) => sum + Math.max(...s.data), 0) /
    chartSeries.length
);

const niceUp = (v: number, step = 5) => Math.ceil(v / step) * step;

const regionSeries = [20, 47, 20, 47];
const regionLabels = ["ภาคเหนือ", "ภาคตะวันออกเฉียงเหนือ", "ภาคใต้", "ภาคกลาง"];
const regionColors = ["#0077B6", "#4D80F4", "#FBBB50", "#98D1E4"];

const roleSeries = [34, 46, 54];
const roleLabels = ["officers", "User", "Admin"];
const roleColors = ["#4D80F4", "#98D1E4", "#FBBB50"];

const Dashboard = () => {
  const [date, setDate] = React.useState<DateValue>(today); // เริ่มต้น = วันที่วันนี้

  const [site, setSite] = React.useState("all");
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>(["all"]);

  const [searchSite, setSearchSite] = React.useState("");
  const [searchEvent, setSearchEvent] = React.useState("");
  const [searchWB, setSearchWB] = React.useState("");
  const [searchFR, setSearchFR] = React.useState("");
  const [province, setProvince] = React.useState("all");

  {
    /* กรอง notis ตาม searchEvent (ถ้าไม่มี searchEvent ก็แสดงทั้งหมด) */
  }

  const filteredNotis = React.useMemo(() => {
    const q = searchEvent.trim().toLowerCase();
    if (!q) return notis;

    return notis.filter((n) => {
      const formattedDate = new Date(n.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const haystack = [
        n.title,
        n.site,
        n.type, // ค้นด้วยคำว่า fire / motion / device ก็ได้
        n.date, // "2025-01-06"
        formattedDate, // "06 Jan 2025"
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [searchEvent]);

  const filteredWellBeginNotis = React.useMemo(() => {
    const q = searchWB.trim().toLowerCase();
    if (!q) return wellBeingNotis;
    return wellBeingNotis.filter((n) => {
      const formattedDate = new Date(n.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return [n.title, n.site, n.type, n.date, formattedDate]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [searchWB]);

  const filteredRecognize = React.useMemo(() => {
    const q = searchFR.trim().toLowerCase();
    if (!q) return recognizeNotis;

    return recognizeNotis.filter((n) => {
      const formattedDate = new Date(n.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const haystack = [
        n.title,
        n.site,
        n.type,
        n.detail,
        n.date,
        formattedDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [searchFR]);

  {
    /* กรอง All Events ของ MAP */
  }

  const toggleEvent = (v: string) => {
    setSelectedEvents((prev) => {
      if (v === "all") return ["all"];

      const set = new Set(prev.filter((x) => x !== "all"));
      set.has(v) ? set.delete(v) : set.add(v);

      if (set.size === 0 || set.size === NON_ALL_COUNT) {
        return ["all"]; // ครบ 5 หรือว่าง -> All Events
      }
      return Array.from(set);
    });
  };

  const NON_ALL_COUNT = EVENT_OPTIONS.length - 1; // 5
  const nonAllSelected = selectedEvents.filter((v) => v !== "all");
  const selectedCount = selectedEvents.includes("all")
    ? NON_ALL_COUNT
    : nonAllSelected.length;

  const buttonLabel =
    selectedCount === NON_ALL_COUNT ? "All Events" : `Select ${selectedCount}`;

  return (
    <>
      <div className="min-h-screen bg-[#F8FBFE] gap-6 flex flex-col">
        {/* Navbar */}
        <div className="bg-[#FFFFFF] flex-wrap flex w-full justify-between items-center px-6 rounded-lg border-b border-none">
          <div className="flex items-center gap-10">
            <img className="w-[143px]" src={brandImage} alt="" />
            <h1 className="font-inter tracking-[.03em] text-[26px] font-[600] ">
              Welcome My Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <SearchInput value={searchSite} onChange={setSearchSite} />
            <Dropdown options={allSites} value={site} onChange={setSite}>
              {({
                open,
                selected,
                options,
                getButtonProps,
                getMenuProps,
                getItemProps,
              }) => (
                <>
                  {/* Custom Button */}
                  <button
                    {...getButtonProps({
                      className:
                        "inline-flex h-10 w-[105px] items-center justify-around rounded-md border border-gray-300 px-1 text-sm hover:cursor-pointer focus:bg-gray-50",
                    })}
                  >
                    <span className="truncate">
                      {selected?.label || "All Sites"}
                    </span>
                    <i className="material-icons leading-none">
                      {open ? "arrow_drop_up" : "arrow_drop_down"}
                    </i>
                  </button>

                  {/* Custom Menu */}
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
                    {options.map((opt) => {
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
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </Dropdown>
            <DatePicker value={date} onChange={(v) => setDate(v)} />
            <Dropdown options={exportFile}>
              {({
                open,
                selected,
                options,
                getButtonProps,
                getMenuProps,
                getItemProps,
              }) => (
                <>
                  {/* Custom Button */}
                  <button
                    {...getButtonProps({
                      className:
                        "inline-flex h-10 w-[105px] items-center justify-center rounded-md border border-gray-300 px-3 text-sm text-[#414651] font-inter font-bold hover:cursor-pointer focus:bg-gray-50",
                    })}
                  >
                    <span className="truncate flex items-center gap-2">
                      <img src={exportImage} alt="" /> {"Export"}
                    </span>
                  </button>

                  {/* Custom Menu */}
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
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Dropdown>
          </div>
        </div>
        {/* Navbar */}

        {/* Header */}
        <div>
          <StatCardGroup
            selectionMode="single"
            className="flex flex-wrap flex-6 gap-2 px-6"
          >
            {statItems.map((it) => (
              <StatCard
                id={it.key}
                key={it.key}
                label={it.label}
                val={it.val}
                img={it.img}
                activeImg={it.activeImg}
                inactiveBg="bg-white"
                activeBg="bg-cyan-500"
                className="flex-1"
              />
            ))}
            <StatCard className="flex-1" />
          </StatCardGroup>

          <div className="flex justify-between flex-5 gap-5 px-6 mt-4">
            {CAMERA_ITEMS.map((c, i) => (
              <CameraTile key={i} ringColor={c.ringColor} imgSrc={c.imgSrc} />
            ))}
          </div>
        </div>
        {/* Header */}

        {/* Content */}
        <div className="flex flex-col px-6 gap-3">
          <div className="flex gap-3">
            <div className="p-6 flex w-[400px] rounded-xl flex-col gap-3 bg-white">
              {/* Alert Events */}
              <form className="flex flex-col justify-center py-2 px-3 gap-3">
                <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
                  All-TIME ALERTS
                </h1>
                <SearchInput
                  value={searchEvent}
                  placeholder="ช่องค้นหาเหตุการณ์"
                  onChange={setSearchEvent}
                  className="font-poppins"
                />

                <div className="h-[590px] overflow-y-auto px-2">
                  <div className="space-y-2">
                    {filteredNotis.length === 0 ? (
                      <div className="rounded-md px-3 py-2 text-sm text-gray-500">
                        ไม่พบเหตุการณ์
                      </div>
                    ) : (
                      filteredNotis.map((n, i) => (
                        <NotiCard
                          key={i}
                          type={n.type as any}
                          title={n.title}
                          site={n.site}
                          date={n.date}
                        />
                      ))
                    )}
                  </div>
                </div>
              </form>
              {/* Alert Events end */}
              {/* Well-being Events */}
              <form className="flex flex-col justify-center py-2 px-3 gap-3">
                <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
                  WELL-BEING ALERTS
                </h1>
                <SearchInput
                  value={searchWB}
                  placeholder="ช่องค้นหาเหตุการณ์"
                  onChange={setSearchWB}
                  className="font-poppins"
                />

                <div className="h-[420px] overflow-y-auto px-2">
                  <div className="space-y-2">
                    {filteredWellBeginNotis.length === 0 ? (
                      <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
                        ไม่พบเหตุการณ์
                      </div>
                    ) : (
                      filteredWellBeginNotis.map((n, i) => (
                        <NotiCard
                          key={i}
                          type={n.type as any}
                          title={n.title}
                          img={n.img as any}
                          site={n.site}
                          date={n.date}
                        />
                      ))
                    )}
                  </div>
                </div>
              </form>
              {/* Well-being Events end*/}
            </div>
            <div className="p-6 flex w-[700px] rounded-xl flex-col gap-3 bg-white">
              {/* Map */}
              <form className="flex flex-col justify-center py-2 px-3 gap-3">
                <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
                  MAP
                </h1>
                <div className="flex items-center gap-5">
                  {/* All Event Map  */}
                  <Dropdown
                    options={EVENT_OPTIONS}
                    value="__multi__"
                    onChange={() => {}}
                  >
                    {({ open, getButtonProps, getMenuProps }) => (
                      <div className="relative inline-block">
                        {" "}
                        {/* ⬅️ anchor ให้ absolute เมนู */}
                        {/* Toggle Button */}
                        <button
                          {...getButtonProps({
                            type: "button",
                            className:
                              "inline-flex h-8 w-[120px] items-center justify-around rounded-md border border-cyan-500 px-2 text-sm hover:cursor-pointer focus:bg-gray-50",
                          })}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <span className="truncate text-cyan-500">
                            {buttonLabel}
                          </span>
                          <i className="material-icons arrow-icon leading-none text-cyan-500">
                            {open ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                          </i>
                        </button>
                        {/* Menu */}
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
                                <span className="text-gray-800">
                                  {opt.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Dropdown>

                  {/* Any Severity Map  */}
                  <Dropdown
                    options={SEVERITY_OPTIONS}
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
                    }) => (
                      <>
                        {/* Custom Button */}
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

                        {/* Custom Menu */}
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

                  {/* All Location Map  */}
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
                        {/* Toggle Button */}
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

                        {/* Menu */}
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

                {/* Map here */}
                <div className="h-[679px] w-full bg-gray-200 rounded-lg flex items-center justify-center">
                  <Map notis={notis} />
                </div>
              </form>

              {/* USER MANAGEMENT */}
              <form className="flex flex-col justify-center py-2 px-3 gap-3">
                <h1 className="text-[30px] font-semibold">USER MANAGEMENT</h1>
                <div className="flex flex-2 justify-between gap-10">
                  <div className="w-full flex-1">
                    <StatsDonut
                      title="จำนวนไซต์"
                      series={regionSeries}
                      labels={regionLabels}
                      colors={regionColors}
                      height={170}
                      donutSize="50%"
                      separatorWidth={0}
                      showLegend={false}
                      center={{
                        mode: "sum",
                        label: "Total",
                        showDataLabelsAround: true,
                        offsets: {
                          labelOffsetX: -15,
                          valueOffsetY: -6,
                          valueOffsetX: 15,
                        },
                      }}
                    />

                    <DonutLegend
                      items={regionLabels.map((label, i) => ({
                        label,
                        color: regionColors[i],
                      }))}
                    />
                  </div>
                  <div className="w-full flex-1">
                    <StatsDonut
                      title="จำนวน user ที่ใช้งาน"
                      series={roleSeries}
                      labels={roleLabels}
                      colors={roleColors}
                      height={170}
                      donutSize="50%"
                      separatorWidth={0}
                      showLegend={false}
                      center={{
                        mode: "sum",
                        label: "Total",
                        showDataLabelsAround: true,
                        offsets: {
                          labelOffsetX: -15,
                          valueOffsetY: -6,
                          valueOffsetX: 15,
                        },
                      }}
                    />
                    <DonutLegend
                      items={roleLabels.map((label, i) => ({
                        label,
                        color: roleColors[i],
                      }))}
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 flex w-[400px] rounded-xl flex-col gap-3 bg-white">
              {/* DEVICES COUNT */}
              <form className="flex flex-col py-2 px-3 gap-3 hover:cursor-default">
                <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
                  DEVICES
                </h1>
                <div className="flex">
                  <RadialBar
                    value={(45 / (45 + 89)) * 100} // 33.58...
                    label="Offline"
                    mainColor="#FB3F3F" // วง progress = แดง
                    primaryColor="#A9DB4E" // track = เขียว
                    bg="#FFFFFF"
                    height={170}
                    width={170}
                    hollowSize="65%"
                    rounded
                    // จัดวางให้เหมือนภาพตัวอย่าง (label บน, ค่าใหญ่ตรงกลาง)
                    offsets={{ labelOffsetY: -6, valueOffsetY: 8 }}
                    valueStyle={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                    // วาง % ไว้ท้ายเลข (ภายในคอมโพเนนต์จะจัดเป็น "33.58%")
                    prefix="%"
                  />
                  <div className="flex flex-col gap-3">
                    <h1 className="text-[24px] font-semibold">Cameras</h1>
                    <div className="flex gap-2">
                      <div className="flex flex-col w-[85px] h-[60px]] bg-[#F8FBFE] text-[#39B8EE] rounded-[10px] justify-center items-center gap-1">
                        <DonutLegend
                          items={[{ label: "Offline", color: "#FB3F3F" }]}
                          labelClassName="text-[#39B8EE] text-[15px]"
                        />
                        <h1 className="text-[25px] font-semibold">45</h1>
                      </div>
                      <div className="flex flex-col w-[85px] h-[60px]] bg-[#F8FBFE] text-[#39B8EE] rounded-[10px] justify-center items-center gap-1">
                        <DonutLegend
                          items={[{ label: "Online", color: "#A9DB4E" }]}
                          labelClassName="text-[#39B8EE] text-[15px]"
                        />
                        <h1 className="text-[25px] font-semibold">89</h1>
                      </div>
                    </div>
                    <h1 className="mt-2 text-[24px] font-semibold text-[#1E1E1E]">
                      Total <span>134</span>
                    </h1>
                  </div>
                </div>

                <ul className="flex flex-col gap-7 font-inter text-[16px] text-cyan-500">
                  <li className="flex gap-4 justify-around">
                    <div className="flex items-center gap-4">
                      <img src={cctvImage} alt="" width={36} />
                      <span>
                        จำนวนกล้อง{" "}
                        <span className="text-red-500 font-semibold">24</span>
                      </span>
                    </div>
                    <li className="flex items-center gap-4 ">
                      <img src={intercomeImage} alt="" width={36} />
                      <span>
                        intercome{" "}
                        <span className="text-red-500 font-semibold">45</span>
                      </span>
                    </li>
                  </li>
                  <li className="flex gap-4 justify-around">
                    <div className="flex items-center gap-4">
                      <img src={waterTapImage} alt="" width={36} />
                      <span>
                        มิเตอร์น้ำ{" "}
                        <span className="text-red-500 font-semibold">45</span>
                      </span>
                    </div>
                    <li className="flex items-center gap-4">
                      <img src={solarImage} alt="" width={36} />
                      <span>
                        มิเตอร์ไฟ{" "}
                        <span className="text-red-500 font-semibold">34</span>
                      </span>
                    </li>
                  </li>
                  <li className="flex gap-4 justify-around">
                    <div className="flex items-center gap-4">
                      <img src={windImage} alt="" width={36} />
                      <span>
                        อากาศ{" "}
                        <span className="text-red-500 font-semibold">87</span>
                      </span>
                    </div>
                    <div className=" w-[155px]"></div>
                  </li>
                </ul>
              </form>
              <form className="flex flex-col justify-center py-2 px-3 gap-3">
                <h1 className="text-[22px] whitespace-nowrap font-inter font-semibold text-[#1E1E1E]">
                  Face Recognize / License Plates
                </h1>
                <SearchInput
                  value={searchFR}
                  placeholder="ช่องค้นหาเหตุการณ์เเจ้งเตือนใบหน้าและทะเบียนรถ"
                  onChange={setSearchFR}
                  className="font-poppins"
                  inputClassName="placeholder:text-[13px]!"
                />

                <div className="h-[680px] overflow-y-auto px-2">
                  <div className="space-y-2">
                    {filteredRecognize.length === 0 ? (
                      <div className="rounded-md px-3 py-2 text-sm text-gray-500">
                        ไม่พบเหตุการณ์
                      </div>
                    ) : (
                      filteredRecognize.map((n, i) => (
                        <NotiCard
                          key={i}
                          type={n.type}
                          img={n.img}
                          title={n.title}
                          detail={n.detail}
                          site={n.site}
                          date={n.date}
                        />
                      ))
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className="px-6 flex w-full h-[800px] rounded-md flex-col gap-3 bg-white">
            {/* Chart User */}
            <form action="" className="flex flex-12 p-6">
              <div className="flex flex-col flex-7">
                <div className="flex justify-between flex-1">
                  <div className="flex flex-col gap-2">
                    <h1 className="text-gray-400 text-[20px]">Statistics</h1>
                    <h1 className="text-[25px] font-bold">
                      Total summary of snapshot{" "}
                      <Dropdown
                        options={EVENT_OPTIONS}
                        value="__multi__"
                        onChange={() => {}}
                      >
                        {({ open, getButtonProps, getMenuProps }) => (
                          <div className="relative inline-block">
                            {" "}
                            {/* ⬅️ anchor ให้ absolute เมนู */}
                            {/* Toggle Button */}
                            <button
                              {...getButtonProps({
                                type: "button",
                                className:
                                  "inline-flex h-10 w-[120px] items-center justify-around rounded-md border border-gray-300 px-2 text-sm hover:cursor-pointer focus:bg-gray-50 ml-3",
                              })}
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              <span className="truncate">{buttonLabel}</span>
                              <i className="material-icons leading-none">
                                {open ? "arrow_drop_up" : "arrow_drop_down"}
                              </i>
                            </button>
                            {/* Menu */}
                            <div
                              {...getMenuProps({
                                className: [
                                  "absolute left-0 top-full mt-2 min-w-[100px] rounded-md",
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
                                      "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-gray-50 hover:cursor-pointer whitespace-nowrap",
                                      checked ? "bg-gray-50" : "",
                                    ].join(" ")}
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 !ring-0 !ring-offset-0 hover:cursor-pointer"
                                      checked={checked}
                                      onChange={() => toggleEvent(opt.value)}
                                      onMouseDown={(e) => e.preventDefault()}
                                    />
                                    <span className="text-gray-800">
                                      {opt.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </Dropdown>{" "}
                    </h1>
                  </div>
                  <div className="flex justify-center items-center w-[350px] mr-10">
                    <div className="bg-[#F8F8FF] rounded-2xl">
                      <div className="p-4 gap-4 inline-flex rounded-lg ">
                        <button
                          type="button"
                          className="py-2 px-4 inline-flex items-center gap-x-2 -ms-px rounded-2xl first:ms-0 text-sm font-medium focus:z-10 bg-[#F8F8FF] text-gray-800  hover:bg-[#D1CEE8] hover:cursor-pointer focus:text-white focus:bg-[#1E1B39] disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          className="py-2 px-4 inline-flex items-center gap-x-2 -ms-px rounded-2xl first:ms-0 text-sm font-medium focus:z-10 bg-[#F8F8FF] text-gray-800  hover:bg-[#D1CEE8] hover:cursor-pointer  focus:text-white focus:bg-[#1E1B39] disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Weekly
                        </button>
                        <button
                          type="button"
                          className="py-2 px-4 inline-flex items-center gap-x-2 -ms-px rounded-2xl first:ms-0 text-sm font-medium focus:z-10 bg-[#F8F8FF] text-gray-800  hover:bg-[#D1CEE8] hover:cursor-pointer  focus:text-white focus:bg-[#1E1B39] disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Monthly
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-8">
                  <WeeklySnapshotChart
                    title=""
                    subtitle=""
                    height={600}
                    categories={[
                      "MON",
                      "TUE",
                      "WED",
                      "THU",
                      "FRI",
                      "SAT",
                      "SUN",
                    ]}
                    series={chartSeries}
                    colors={["#4A3AFF", "#39B8EE", "#D3F7FF"]} // ปรับได้
                    legendPosition="right"
                    legendAlign="center"
                    showGridY={true}
                    showGridX={false}
                    columnWidthPercent={38}
                    showDataLabels={false}
                    tooltipValueFormatter={(v) => `${v} ครั้ง`}
                    optionsOverride={{
                      // override ลึก ๆ ได้ตาม ApexOptions (เช่นฟอนต์, label style, responsive ฯลฯ)
                      chart: { dropShadow: { enabled: false } },
                      yaxis: {
                        tickAmount: 5,
                        max: niceUp(avgOfSeriesMax * 1.1, 10),
                      },
                      legend: { show: false },
                      stroke: { width: 0 },
                      tooltip: {
                        enabled: true,
                        shared: false,
                      },
                    }}
                  />
                </div>
              </div>
              <div className="flex-2 flex justify-center items-center">
                <ul className="flex flex-col gap-8">
                  <li className="flex gap-2 items-center">
                    <div className="rounded-full bg-[#4A3AFF] w-[20px] h-[20px]"></div>
                    <span className="min-w-[60px] font-stretch-expanded">
                      08:00 - 16:00 น.
                    </span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <div className="rounded-full bg-[#39B8EE] w-[20px] h-[20px]"></div>
                    <span>16:00 - 24:00 น.</span>
                  </li>
                  <li className="flex gap-2 items-center">
                    <div className="rounded-full bg-[#D3F7FF] w-[20px] h-[20px]"></div>
                    <span>24:00 - 08:00 น.</span>
                  </li>
                </ul>
              </div>
            </form>
          </div>
        </div>

        {/* Content */}
      </div>
    </>
  );
};

export default Dashboard;
