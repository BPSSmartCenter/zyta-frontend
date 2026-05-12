import React from "react";
import AirPanel from "../../components/Devices/Air Sensor/AirPanel";
import ElectricMeterPanel from "../../components/Devices/Electric Meter/electricMeterPanel";
import WaterMeterPanel from "../../components/Devices/Water Meter/waterMeterPanel";
import { useAppSelector } from "../../store/hooks";
import { selectSandboxFilterGroupForCard } from "./cardSandboxSelectors";

type Props = {
  variant: "electric_meter" | "water_meter" | "air_sensor";
  cardId: string;
};

function toIsoRangeForDate(date: { y: number; m: number; d: number }) {
  const from = new Date(date.y, date.m - 1, date.d, 0, 0, 0, 0);
  const to = new Date(date.y, date.m - 1, date.d, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function todayValue() {
  const date = new Date();
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

export default function SandboxUtilityPanelCard({ variant, cardId }: Props) {
  const filterGroup = useAppSelector((state) =>
    selectSandboxFilterGroupForCard(state, cardId)
  );
  const fallbackDate = React.useMemo(() => todayValue(), []);
  const selectedDate = filterGroup?.date ?? fallbackDate;
  const selectedSite = filterGroup?.selectedSite ?? "all";
  const siteCode =
    !selectedSite || selectedSite === "all" ? undefined : selectedSite;
  const timeRange = React.useMemo(
    () => toIsoRangeForDate(selectedDate),
    [selectedDate]
  );

  if (variant === "electric_meter") {
    return <ElectricMeterPanel siteCode={siteCode} timeRange={timeRange} />;
  }
  if (variant === "water_meter") {
    return <WaterMeterPanel siteCode={siteCode} timeRange={timeRange} />;
  }
  return <AirPanel siteCode={siteCode} timeRange={timeRange} />;
}
