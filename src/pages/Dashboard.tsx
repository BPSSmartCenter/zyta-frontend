import React from "react";
import Navbar from "../components/Dashboard/Navbar";
import Header from "../components/Dashboard/Header";
import ContentLayout from "../components/Dashboard/";
import SnapshotChartSection from "../components/Dashboard/snapshotChart";

import { notis, wellBeingNotis, recognizeNotis } from "../data/Dashboard/notis";
import {
  today,
  statItems,
  CAMERA_ITEMS,
  EVENT_OPTIONS,
} from "../components/Dashboard/dashboard.constants";
import type { DateValue } from "../components/DateInput";

const NON_ALL_COUNT = EVENT_OPTIONS.length - 1;

export default function Dashboard() {
  const [date, setDate] = React.useState<DateValue>(today);
  const [site, setSite] = React.useState("all");
  const [province, setProvince] = React.useState("all");
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>(["all"]);

  const [searchSite, setSearchSite] = React.useState("");
  const [searchEvent, setSearchEvent] = React.useState("");
  const [searchWB, setSearchWB] = React.useState("");
  const [searchFR, setSearchFR] = React.useState("");

  const filteredNotis = React.useMemo(() => {
    const q = searchEvent.trim().toLowerCase();
    if (!q) return notis;
    return notis.filter((n) => {
      const formattedDate = new Date(n.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const haystack = [n.title, n.site, n.type, n.date, formattedDate]
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

  const nonAllSelected = selectedEvents.filter((v) => v !== "all");
  const selectedCount = selectedEvents.includes("all")
    ? NON_ALL_COUNT
    : nonAllSelected.length;
  const buttonLabel =
    selectedCount === NON_ALL_COUNT ? "All Events" : `Select ${selectedCount}`;

  const toggleEvent = (v: string) => {
    setSelectedEvents((prev) => {
      if (v === "all") return ["all"];
      const set = new Set(prev.filter((x) => x !== "all"));
      set.has(v) ? set.delete(v) : set.add(v);
      return set.size === 0 || set.size === NON_ALL_COUNT
        ? ["all"]
        : Array.from(set);
    });
  };
  return (
    <div className="min-h-screen bg-[#F8FBFE] gap-6 flex flex-col">
      <Navbar
        searchSite={searchSite}
        setSearchSite={setSearchSite}
        site={site}
        setSite={setSite}
        date={date}
        setDate={setDate}
      />

      <Header statItems={statItems} cameraItems={CAMERA_ITEMS} />

      <ContentLayout
        searchEvent={searchEvent}
        setSearchEvent={setSearchEvent}
        filteredNotis={filteredNotis}
        searchWB={searchWB}
        setSearchWB={setSearchWB}
        filteredWellBeginNotis={filteredWellBeginNotis}
        selectedEvents={selectedEvents}
        buttonLabel={buttonLabel}
        toggleEvent={toggleEvent}
        site={site}
        setSite={setSite}
        province={province}
        setProvince={setProvince}
        searchFR={searchFR}
        setSearchFR={setSearchFR}
        filteredRecognize={[...filteredRecognize]}
      />

      <SnapshotChartSection
        buttonLabel={buttonLabel}
        selectedEvents={selectedEvents}
        toggleEvent={toggleEvent}
      />
    </div>
  );
}
