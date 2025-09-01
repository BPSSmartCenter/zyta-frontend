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

/**
 * Desktop (>= lg):
 *   - วาง 2 บล็อก "ข้างกัน" (legend ใต้โดนัท — คง UI เดิม)
 * Tablet/Mobile (< lg):
 *   - หล่นเป็นคอลัมน์ (flex-col)
 *   - ภายในแต่ละบล็อก: โดนัทเล็กลง และ legend อยู่ "ขวา" ของโดนัท
 */
function DonutBlock({
  title,
  series,
  labels,
  colors,
}: {
  title: string;
  series: number[];
  labels: string[];
  colors: string[];
}) {
  return (
    <div className="w-full">
      {/* Desktop: donut ใหญ่ + legend "ใต้โดนัท" */}
      <div className="flex hidden lg:block">
        <div className="flex gap-4">
          <div className="shrink-0">
            <StatsDonut
              title={title}
              series={series}
              labels={labels}
              colors={colors}
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
          </div>
        </div>
        <div className="mt-2 ">
          <DonutLegend
            items={labels.map((label, i) => ({ label, color: colors[i] }))}
          />
        </div>
      </div>

      {/* Tablet/Mobile: หล่นเป็นคอลัมน์ + legend อยู่ "ขวา" + donut เล็กลง */}
      <div className="lg:hidden">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <StatsDonut
              title={title}
              series={series}
              labels={labels}
              colors={colors}
              height={140}
              donutSize="45%"
              separatorWidth={0}
              showLegend={false}
              center={{
                mode: "sum",
                label: "Total",
                showDataLabelsAround: true,
                offsets: {
                  labelOffsetX: -10,
                  valueOffsetY: -6,
                  valueOffsetX: 10,
                },
              }}
            />
          </div>
          <div className="grow">
            <DonutLegend
              items={labels.map((label, i) => ({ label, color: colors[i] }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-4">
      <h1 className="text-[30px] font-semibold">USER MANAGEMENT</h1>

      {/* ⬇️ จุดที่ปรับ: เดิมเป็น flex-col เสมอ → เปลี่ยนเป็น flex-col เฉพาะจอเล็ก และ Desktop วางข้างกัน */}
      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="w-full lg:w-1/2">
          <DonutBlock
            title="จำนวนไซต์"
            series={regionSeries}
            labels={regionLabels}
            colors={regionColors}
          />
        </div>

        <div className="w-full lg:w-1/2">
          <DonutBlock
            title="จำนวน user ที่ใช้งาน"
            series={roleSeries}
            labels={roleLabels}
            colors={roleColors}
          />
        </div>
      </div>
    </form>
  );
}
