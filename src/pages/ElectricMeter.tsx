// src/pages/ElectricMeter.tsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Dashboard/Navbar";
import { useFilters } from "../context/FiltersContext";
import Table from "../components/TotalAlert/Table";

const C = {
  cardBg: "#01162b",
  num: "#01faf8",
  headFactory: "#0bb1f4",
  thisMonth: "#18d1ad",
  lastMonth: "#51707f",
  energyCost: "#eec824",
};

export const ElectricMeter: React.FC = () => {
  const {
    searchSite,
    setSearchSite,
    siteOptions,
    selectedSite,
    setSelectedSite,
    date,
    setDate,
  } = useFilters();

  return (
    <Sidebar>
      <div className="min-h-screen bg-[#F8FBFE]">
        {/* NAVBAR */}
        <Navbar
          searchSite={searchSite}
          setSearchSite={setSearchSite}
          siteOptions={siteOptions}
          selectedSite={selectedSite}
          setSelectedSite={setSelectedSite}
          date={date as any}
          setDate={setDate as any}
        />

        {/* MAIN CONTAINER */}
        <div className="mx-auto w-full max-w-[1240px] px-6">
          {/* TITLE */}
          <h2 className="mt-4 mb-4 text-[18px] font-semibold text-[#0F172A]">
            Electric Meter Dashboard
          </h2>

          {/* ===== TOP SUMMARY (2 CARDS) ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TOTAL ENERGY USAGE */}
            <div
              className="relative flex h-[138px] rounded-xl px-7 py-6 text-white"
              style={{ backgroundColor: C.cardBg }}
            >
              <div className="flex flex-col justify-between">
                <div className="text-[12px] uppercase opacity-80 tracking-wide">
                  TOTAL ENERGY USAGE
                </div>

                {/* number row */}
                <div className="flex items-end gap-3">
                  <div
                    className="font-extrabold leading-[1]"
                    style={{ color: C.num, fontSize: "56px" }}
                  >
                    3,472
                  </div>
                  <div className="pb-[6px] text-[22px] opacity-85">kWh</div>
                </div>

                {/* footer row */}
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="inline-flex items-center gap-1" style={{ color: C.thisMonth }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.thisMonth} strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                    This Month
                  </span>
                  <span className="opacity-60">vs</span>
                  <span className="opacity-90" style={{ color: C.lastMonth }}>
                    Last Month
                  </span>
                </div>
              </div>

              {/* icon right */}
              <div className="ml-auto grid place-items-center">
                <div className="size-[82px] rounded-full border border-[#2b4d66] grid place-items-center">
                  <svg
                    width="38"
                    height="38"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={C.num}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* TOTAL COST */}
            <div
              className="relative flex h-[138px] rounded-xl px-7 py-6 text-white"
              style={{ backgroundColor: C.cardBg }}
            >
              <div className="flex flex-col justify-between">
                <div className="text-[12px] uppercase opacity-80 tracking-wide">
                  TOTAL COST
                </div>

                <div className="flex items-end gap-3">
                  <div className="text-[32px] leading-[1] font-bold">฿</div>
                  <div
                    className="font-extrabold leading-[1]"
                    style={{ color: C.num, fontSize: "56px" }}
                  >
                    12,150
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[13px]">
                  <span className="inline-flex items-center gap-1" style={{ color: C.thisMonth }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.thisMonth} strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                    This Month
                  </span>
                  <span className="opacity-60">vs</span>
                  <span className="opacity-90" style={{ color: C.lastMonth }}>
                    Last Month
                  </span>
                </div>
              </div>

              {/* warning icon + badge */}
              <div className="ml-auto grid place-items-center gap-3">
                <div className="size-[82px] rounded-full border border-[#2b4d66] grid place-items-center">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={C.energyCost}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div
                  className="text-[12px] font-semibold leading-none"
                  style={{ color: C.energyCost }}
                >
                  ENERGY COST
                </div>
              </div>
            </div>
          </div>

          {/* ===== FACTORY CARD ===== */}
          <div className="mt-6">
            <div
              className="rounded-xl px-7 py-6 text-white"
              style={{ backgroundColor: C.cardBg }}
            >
              <div
                className="text-[22px] font-bold"
                style={{ color: C.headFactory }}
              >
                Factory-1
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Left: ENERGY USAGE */}
                <div className="md:col-span-2">
                  <div className="text-[12px] uppercase opacity-80 tracking-wide">
                    ENERGY USAGE
                  </div>

                  <div className="mt-2 flex items-end gap-3">
                    <div
                      className="font-extrabold leading-[1]"
                      style={{ color: C.num, fontSize: "60px" }}
                    >
                      920
                    </div>
                    <div className="pb-[8px] text-[22px] opacity-85">kWh</div>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[13px]">
                    <span className="inline-flex items-center gap-1" style={{ color: C.thisMonth }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.thisMonth} strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                      This Month
                    </span>
                    <span className="opacity-60">vs</span>
                    <span className="opacity-90" style={{ color: C.lastMonth }}>
                      Last Month
                    </span>
                  </div>

                  {/* barcode-ish line */}
                  <div className="mt-6 h-[2px] w-full bg-[#163651] opacity-60" />
                  <div className="mt-2 text-[12px] tracking-[0.4em] opacity-70 select-none">
                    0123456789
                  </div>
                </div>

                {/* Right: POWER block */}
                <div className="md:col-span-1 flex flex-col items-end">
                  <div className="text-[12px] uppercase opacity-80 tracking-wide">
                    POWER
                  </div>

                  <div className="mt-2 flex items-end gap-3">
                    <div
                      className="font-extrabold leading-[1]"
                      style={{ color: C.num, fontSize: "60px" }}
                    >
                      136,5
                    </div>
                    <div className="pb-[8px] text-[22px] opacity-85">kW</div>
                  </div>

                  <div className="mt-4 size-[92px] rounded-full border border-[#2b4d66] grid place-items-center">
                    <svg
                      width="44"
                      height="44"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.num}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8z" />
                    </svg>
                  </div>

                  <div className="mt-4 text-right">
                    <div className="text-[12px] uppercase opacity-80 tracking-wide">
                      POWER
                    </div>
                    <div className="mt-1 flex items-end gap-2 justify-end">
                      <div
                        className="font-extrabold leading-[1]"
                        style={{ color: C.num, fontSize: "34px" }}
                      >
                        136,5
                      </div>
                      <div className="pb-[3px] text-[16px] opacity-85">kW</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== ENERGY USAGE CHART (placeholder) ===== */}
          <div className="mt-6">
            <div
              className="rounded-xl p-6 text-white"
              style={{ backgroundColor: C.cardBg }}
            >
              <div className="text-[12px] uppercase opacity-80 tracking-wide">
                ENERGY USAGE
              </div>
              <div className="mt-4 h-[240px] w-full rounded-md bg-gradient-to-b from-[#072136] to-[#061728] overflow-hidden">
                <svg viewBox="0 0 100 30" className="w-full h-full">
                  <polyline
                    fill="none"
                    stroke={C.num}
                    strokeWidth="1.6"
                    points="0,20 5,18 10,22 15,14 20,19 25,16 30,21 35,17 40,19 45,16 50,18 55,17 60,19 65,18 70,20 75,19 80,21 85,20 90,22 95,21 100,22"
                  />
                </svg>
              </div>
              <div className="mt-3 flex justify-between text-[11px] tracking-wide text-white/60">
                <span>1</span><span>5</span><span>10</span><span>15</span>
                <span>20</span><span>23</span>
              </div>
            </div>
          </div>

          {/* ===== CONSOLIDATED ALERT LOG ===== */}
          <div className="mt-8 mb-12">
            <h3 className="text-[16px] font-semibold mb-3">
              ตารางการแจ้งเตือนแบบรวม (Consolidated Alert Log)
            </h3>
            <div className="rounded-xl border border-gray-200 bg-white">
              <Table />
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
};

export default ElectricMeter;
