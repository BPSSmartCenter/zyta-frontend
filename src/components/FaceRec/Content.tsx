// src/components/FaceRec/Content.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import StatCard, { StatCardGroup } from "../StatCard";
import FaceRecNav from "./FaceRecNav";
import LicensePlatePanel from "./LicensePlatePanel";
import FaceScanPanel from "./FaceScanPanel";
import TableFaceScan from "./TableFace";
import Table from "./Table";
import { useFaceRec } from "../../context/FaceRecContext";
import { useFilters } from "../../context/FiltersContext";
import { toDateKey } from "../../utils/notis";

// no static placeholder; show latest preview image instead

type Props = {
  stats?: Array<{ key: string; label: string; val: number | string }>;
  defaultActive?: "licensePlates" | "faceScan" | "picture";
  rowsOverride?: unknown; // เผื่อใช้ทีหลัง
};

const Content: React.FC<Props> = ({
  stats,
  defaultActive = "licensePlates",
}) => {
  const { t } = useTranslation("facerec");
  const faceRec = useFaceRec();
  const { date: globalDate, dateTouched } = useFilters();

  const selectedDateKey = React.useMemo(
    () => (dateTouched ? toDateKey(globalDate) : null),
    [dateTouched, globalDate]
  );

  const matchDate = React.useCallback(
    (iso: string) => {
      if (!selectedDateKey) return true;
      return toDateKey(iso) === selectedDateKey;
    },
    [selectedDateKey]
  );

  const filteredFaceRows = React.useMemo(() => {
    const rows = (faceRec?.faceRows as any[]) || [];
    return rows.filter((r) => matchDate(r.timeInISO));
  }, [faceRec?.faceRows?.length, matchDate]);

  const filteredPlateRows = React.useMemo(() => {
    const rows = (faceRec?.plateRows as any[]) || [];
    return rows.filter((r) => matchDate(r.timestamp));
  }, [faceRec?.plateRows?.length, matchDate]);

  // ถ้าไม่ส่ง stats มา ใช้ข้อความจาก i18n
  const defaultStats = stats ?? [
    { key: "licensePlates", label: t("stats.licensePlates"), val: filteredPlateRows.length },
    { key: "faceScan", label: t("stats.faceScan"), val: filteredFaceRows.length },
  ];

  const latestPlate = filteredPlateRows[filteredPlateRows.length - 1];
  const latestFace = filteredFaceRows[filteredFaceRows.length - 1];
  const plateImg = latestPlate?.platePicture || latestPlate?.picture || "";
  const faceImg = latestFace?.picture || "";

  const [active, setActive] = React.useState<string>(defaultActive);

  const navTitle =
    active === "faceScan" ? t("nav.faceRecognize") : t("nav.licensePlates");

  return (
    <>
      <FaceRecNav title={navTitle} />

      {/* STATCARDS */}
      <div className="mt-6">
        <StatCardGroup
          selectionMode="single"
          activeIds={[active]}
          onChange={(ids) => setActive(ids[0] ?? active)}
          className="grid grid-cols-1 md:grid-cols-2 md:gap-8 sm:gap-2 "
        >
          {defaultStats.map((it) => {
            const img = it.key === "licensePlates" ? plateImg : faceImg;
            return (
              <StatCard
                key={it.key}
                id={it.key}
                val={it.val}
                label={it.label}
                img={img}
                activeImg={img}
                reverseLayout
                inactiveBg="bg-white"
                activeBg="bg-cyan-500"
                className="w-full md:max-w-full rounded-xl lg-1024:max-w-full"
              />
            );
          })}
        </StatCardGroup>
      </div>

      {/* PANEL + TABLE SWITCH */}
      {active === "licensePlates" && (
        <>
          <LicensePlatePanel />
          <div className="mt-6">
            <Table />
          </div>
        </>
      )}
      {active === "faceScan" && (
        <>
          <FaceScanPanel />
          <div className="mt-6">
            <TableFaceScan />
          </div>
        </>
      )}
    </>
  );
};

export default Content;
