// src/components/FaceRec/Content.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import StatCard, { StatCardGroup } from "../StatCard";
import FaceRecNav from "./FaceRecNav";
import LicensePlatePanel from "./LicensePlatePanel";
import FaceScanPanel from "./FaceScanPanel";
import TableFaceScan from "./TableFace";
import Table from "./Table";

const GREEN_BOX_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="36" viewBox="0 0 56 36"><rect x="0" y="0" width="56" height="36" rx="6" fill="#16A34A"/></svg>`
  );

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

  // ถ้าไม่ส่ง stats มา ใช้ข้อความจาก i18n
  const defaultStats = stats ?? [
    { key: "licensePlates", label: t("stats.licensePlates"), val: 0 },
    { key: "faceScan", label: t("stats.faceScan"), val: 0 },
  ];

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
          {defaultStats.map((it) => (
            <StatCard
              key={it.key}
              id={it.key}
              val={it.val}
              label={it.label}
              img={GREEN_BOX_SVG}
              activeImg={GREEN_BOX_SVG}
              reverseLayout
              inactiveBg="bg-white"
              activeBg="bg-cyan-500"
              className="w-full md:max-w-full rounded-xl lg-1024:max-w-full"
            />
          ))}
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
