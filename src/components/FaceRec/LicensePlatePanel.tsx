import React from "react";
import { useTranslation } from "react-i18next";
import {
  confidenceHeader as PL_CONF_CONST,
  plateDetail as PL_DETAIL_CONST,
  type LicensePlateRow,
} from "./faceRec.constant";
import { useFaceRec } from "../../context/FaceRecContext";
import { useFilters } from "../../context/FiltersContext";
import { matchesSiteInfo, toDateKey } from "../../utils/notis";
import {
  UtilitySectionTitle,
  UtilitySurface,
} from "../UtilityDashboard/UtilityDashboardLayout";

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

function PreviewPlaceholder({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative flex h-full min-h-[460px] items-center justify-center overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#EEEAFB_0%,#E4DEFA_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.54),transparent_38%)]" />
      <div className="relative text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          No plate frame
        </div>
        <div className="mt-3 text-2xl font-semibold text-slate-700">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-[#F8FBFE] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 break-words text-[17px] font-semibold text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

export default function LicensePlatePanel() {
  const faceRec = useFaceRec();
  const { t } = useTranslation("facerec");
  const { date: globalDate, dateTouched, selectedSite } = useFilters();
  const [selectedIdx, setSelectedIdx] = React.useState(0);

  const allRows = (faceRec?.plateRows as LicensePlateRow[]) || [];
  const rowsBySite = React.useMemo(
    () => allRows.filter((row) => matchesSiteInfo(row ?? {}, selectedSite)),
    [allRows, selectedSite]
  );
  const selectedDateKey = React.useMemo(
    () => (dateTouched ? toDateKey(globalDate) : null),
    [dateTouched, globalDate]
  );
  const rows = React.useMemo(() => {
    if (!selectedDateKey) return rowsBySite;
    return rowsBySite.filter((row) => toDateKey(row.timestamp) === selectedDateKey);
  }, [rowsBySite, selectedDateKey]);
  const visibleRows = React.useMemo(() => rows.slice(0, 6), [rows]);

  React.useEffect(() => {
    if (!visibleRows.length) {
      if (selectedIdx !== 0) setSelectedIdx(0);
      return;
    }
    if (selectedIdx >= visibleRows.length) {
      setSelectedIdx(0);
    }
  }, [selectedIdx, visibleRows.length]);

  const selRow =
    visibleRows[selectedIdx] ?? visibleRows[0] ?? (rows.length ? rows[0] : null);
  const fallbackDetail = faceRec?.plateDetail ?? (PL_DETAIL_CONST as any);
  const detail = selRow
    ? {
        plate: selRow.plateText,
        province: selRow.province,
        type: "-",
        owner: "-",
        color: "-",
        camera: selRow.cameraName,
        timestamp: formatDateTime(selRow.timestamp),
      }
    : fallbackDetail;
  const conf: string[] =
    Array.isArray(selRow?.confidenceHeader) && selRow.confidenceHeader.length
      ? selRow.confidenceHeader
      : (PL_CONF_CONST as string[]);
  const mainImg = selRow?.picture || "";
  const cropImg = selRow?.platePicture || mainImg;
  const mainCamera = selRow?.cameraName || "-";
  const mainTime = selRow?.timestamp ? formatDateTime(selRow.timestamp) : "-";
  const subtitle = [detail.province, mainCamera, mainTime].filter(Boolean).join(" • ");

  return (
    <UtilitySurface className="overflow-hidden p-0">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative min-h-[460px] overflow-hidden bg-slate-950">
          {mainImg ? (
            <img
              src={mainImg}
              alt={detail.plate || "License plate frame"}
              className="h-full w-full object-cover"
            />
          ) : (
            <PreviewPlaceholder
              title={detail.plate || "No plate detection"}
              subtitle={subtitle || "Waiting for detections"}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/25" />

          <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900/70 px-3 py-1.5 text-sm font-semibold text-white">
              {mainCamera}
            </span>
            <span className="rounded-full bg-slate-900/70 px-3 py-1.5 text-sm font-semibold text-white">
              {mainTime}
            </span>
          </div>
          <div className="absolute right-5 top-5">
            <span className="rounded-full bg-[#F1EDFF]/95 px-3 py-1.5 text-sm font-semibold text-[#6C63FF]">
              Plate Match
            </span>
          </div>

          <div className="absolute bottom-5 left-5 right-5">
            <div className="max-w-3xl text-white">
              <div className="truncate text-[34px] font-semibold leading-none">
                {detail.plate || t("nav.licensePlates", { defaultValue: "License Plates" })}
              </div>
              <div className="mt-2 text-sm text-slate-200">{subtitle || "No recent plate frame"}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-[#F8FBFE] xl:border-l xl:border-t-0">
          <div className="p-5 pb-4">
            <UtilitySectionTitle
              title={t("recentPlateReads", { defaultValue: "Recent plate reads" })}
              subtitle={t("showingCount", {
                count: visibleRows.length,
                defaultValue: "{{count}} latest plate events",
              })}
            />
          </div>
          <div className="max-h-[460px] space-y-3 overflow-y-auto px-4 pb-4">
            {visibleRows.length ? (
              visibleRows.map((row, index) => {
                const active = index === selectedIdx;
                return (
                  <button
                    key={row.id || index}
                    type="button"
                    onClick={() => setSelectedIdx(index)}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-[20px] border p-3 text-left transition",
                      active
                        ? "border-[#D4CCFF] bg-[#F4F1FF] shadow-[0_10px_24px_rgba(108,99,255,0.10)]"
                        : "border-slate-200 bg-white hover:border-[#DCD6FF] hover:bg-slate-50"
                    )}
                  >
                    <img
                      src={row.platePicture || row.picture || ""}
                      alt={row.plateText}
                      className="h-12 w-20 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-semibold text-slate-900">
                        {row.plateText}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{row.province}</span>
                        <span className="text-slate-300">•</span>
                        <span>{row.cameraName}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {formatDateTime(row.timestamp)}
                      </div>
                    </div>
                    <span className="rounded-full bg-[#F1EDFF] px-2.5 py-1 text-[11px] font-semibold text-[#6C63FF]">
                      {row.confidenceHeader.filter((value) => value && value !== "—").length || 0} chars
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-400">
                {t("empty.plate", { defaultValue: "No license plate events for this filter" })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 p-5">
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
          <div className="rounded-[24px] border border-slate-200 bg-[#F8FBFE] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Plate Crop
            </div>
            <div className="mt-6 flex min-h-[124px] items-center justify-center rounded-[18px] bg-white px-4 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)]">
              {cropImg ? (
                <img
                  src={cropImg}
                  alt={detail.plate || "Plate crop"}
                  className="max-h-[90px] w-full rounded object-contain"
                />
              ) : (
                <div className="text-sm font-medium text-slate-500">No image</div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailTile label={t("plate", { defaultValue: "Plate" })} value={detail.plate} />
            <DetailTile
              label={t("province", { defaultValue: "Province" })}
              value={detail.province}
            />
            <DetailTile label={t("type", { defaultValue: "Type" })} value={detail.type} />
            <DetailTile label={t("owner", { defaultValue: "Owner" })} value={detail.owner} />
            <DetailTile label={t("color", { defaultValue: "Color" })} value={detail.color} />
            <DetailTile label={t("camera", { defaultValue: "Camera" })} value={detail.camera} />
          </div>

          <div className="rounded-[24px] border border-[#E7E0FF] bg-[linear-gradient(135deg,#FBF9FF_0%,#F2EEFF_100%)] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6C63FF]">
              Confidence Header
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {conf.map((char, index) => (
                <div
                  key={`${char}-${index}`}
                  className="grid h-11 w-11 place-items-center rounded-[14px] bg-white text-sm font-semibold text-slate-900 shadow-[0_8px_18px_rgba(108,99,255,0.08)]"
                >
                  {char}
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <div>
                <span className="font-semibold text-slate-900">Camera:</span> {mainCamera}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Detected at:</span> {detail.timestamp}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Region:</span> {detail.province || "-"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </UtilitySurface>
  );
}
