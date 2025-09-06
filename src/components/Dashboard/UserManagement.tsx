// src/components/Dashboard/UserManagement.tsx
import StatsDonut from "../StatsDonut";
import DonutLegend from "../DonutLegend";
import {
  regionSeries,
  regionLabels,
  regionColors,
  roleSeries,
  roleLabels,
  roleColors,
} from "../Dashboard/dashboard.constants";
import { useTranslation } from "react-i18next";

/**
 * Desktop (>= lg):
 *   - วาง 2 บล็อก "ข้างกัน" (legend ใต้โดนัท — คง UI เดิม)
 * Tablet/Mobile (< lg):
 *   - หล่นเป็นคอลัมน์ (flex-col)
 *   - ภายในแต่ละบล็อก: โดนัทเล็กลง และ legend อยู่ "ขวา" ของโดนัท
 */
function DonutBlock({
  scope, // "region" | "role" ใช้ชี้ตำแหน่งคีย์แปล
  title,
  series,
  labels,
  colors,
}: {
  scope: "region" | "role";
  title: string;
  series: number[];
  labels: string[];
  colors: string[];
}) {
  const { t } = useTranslation(["dashboard"]);

  // แปลชื่อบล็อก + ป้าย total (fallback เป็นค่าเดิม)
  const titleI18n = t(`userMgmt.${scope}.title`, { defaultValue: title });
  const totalI18n = t("userMgmt.total", { defaultValue: "total" });

  // แปล labels แบบ index-based: userMgmt.region.labels.0, .1, ...
  const labelsI18n = labels.map((label, i) =>
    t(`userMgmt.${scope}.labels.${i}`, { defaultValue: label })
  );

  return (
    <div className="w-full">
      <div className="hidden lg:block">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <StatsDonut
              title={titleI18n}
              series={series}
              labels={labelsI18n}
              colors={colors}
              height={160}
              donutSize="45%"
              separatorWidth={0}
              showLegend={false}
              center={{
                mode: "sum",
                label: totalI18n,
                showDataLabelsAround: true,
                offsets: {
                  labelOffsetX: -14,
                  labelOffsetY: 10,
                  valueOffsetY: -6,
                  valueOffsetX: 15,
                },
              }}
            />
          </div>
          <div className="grow **:text-[12px]">
            <DonutLegend
              items={labelsI18n.map((label, i) => ({ label, color: colors[i] }))}
              className=""
              itemClassName="lg-1399:whitespace-nowrap lg-1389:w-[140px] min-w-[100px]"
              labelClassName=""
            />
          </div>
        </div>
      </div>

      {/* Tablet/Mobile: หล่นเป็นคอลัมน์ + legend อยู่ "ขวา" + donut เล็กลง */}
      <div className="lg:hidden">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <StatsDonut
              title={titleI18n}
              series={series}
              labels={labelsI18n}
              colors={colors}
              height={140}
              donutSize="45%"
              separatorWidth={0}
              showLegend={false}
              center={{
                mode: "sum",
                label: "",
                showDataLabelsAround: true,
                offsets: {
                  labelOffsetX: -10,
                  valueOffsetY: 0,
                  valueOffsetX: 0,
                },
              }}
            />
          </div>
          <div className="grow **:text-[12px]">
            <DonutLegend
              items={labelsI18n.map((label, i) => ({ label, color: colors[i] }))}
              className=""
              itemClassName="lg-1399:whitespace-nowrap lg-1389:w-[140px] min-w-[100px]"
              labelClassName=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { t } = useTranslation(["dashboard"]);

  return (
    <form className="flex flex-col justify-center py-2  gap-4">
      <h1 className="text-[22px] font-semibold">
        {t("userMgmt.title", { defaultValue: "USER MANAGEMENT" })}
      </h1>

      {/* Desktop: วางซ้อนกันเหมือนเดิม (component เดิมใช้ flex-col อยู่แล้ว) */}
      <div className="flex gap-1 flex-col lg:flex-col justify-center">
        <div className="w-full lg:w-1/2">
          <DonutBlock
            scope="region"
            title={t("userMgmt.region.title", { defaultValue: "จำนวนไซต์" })}
            series={regionSeries}
            labels={regionLabels}
            colors={regionColors}
          />
        </div>

        <div className="w-full lg:w-1/2">
          <DonutBlock
            scope="role"
            title={t("userMgmt.role.title", {
              defaultValue: "จำนวน user ที่ใช้งาน",
            })}
            series={roleSeries}
            labels={roleLabels}
            colors={roleColors}
          />
        </div>
      </div>
    </form>
  );
}
