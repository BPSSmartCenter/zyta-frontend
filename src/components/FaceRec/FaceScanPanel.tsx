import React from "react";
import { useTranslation } from "react-i18next";
import { faceDetail as FACE_DETAIL_CONST, type FaceScanRow } from "./faceRec.constant";
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

const statusTone = (value: string | undefined) => {
  const raw = String(value ?? "").trim();
  const lowered = raw.toLowerCase();
  if (
    raw.includes("ไม่") ||
    lowered.includes("deny") ||
    lowered.includes("reject") ||
    lowered.includes("not allow")
  ) {
    return "bg-[#FFF0F0] text-[#FB3F3F]";
  }
  if (raw.includes("ออก") || lowered.includes("out")) {
    return "bg-[#FFF6E7] text-[#F59E0B]";
  }
  return "bg-[#EAFBF2] text-[#10B981]";
};

function PreviewPlaceholder({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative flex h-full min-h-[460px] items-center justify-center overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#E7EEF7_0%,#DCE6F4_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.5),transparent_40%)]" />
      <div className="relative text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          No face frame
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

export default function FaceScanPanel() {
  const { t } = useTranslation("facerec");
  const faceRec = useFaceRec();
  const { date: globalDate, dateTouched, selectedSite } = useFilters();
  const [selectedIdx, setSelectedIdx] = React.useState(0);

  const allRows = (faceRec?.faceRows as FaceScanRow[]) || [];
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
    return rowsBySite.filter((row) => toDateKey(row.timeInISO) === selectedDateKey);
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
  const fallbackDetail = faceRec?.faceDetail ?? (FACE_DETAIL_CONST as any);
  const detail = selRow
    ? {
        fullName: selRow.fullName,
        gender: selRow.gender,
        province: selRow.province,
        status: selRow.inout,
        timeIn: formatDateTime(selRow.timeInISO),
        timeOut: formatDateTime(selRow.timeOutISO),
      }
    : fallbackDetail;
  const mainImg = selRow?.fullFrame || selRow?.picture || "";
  const mainCamera = selRow?.cameraName || "-";
  const mainTime = selRow?.timeInISO ? formatDateTime(selRow.timeInISO) : "-";
  const subtitle = [detail.province, mainCamera, mainTime].filter(Boolean).join(" • ");

  return (
    <UtilitySurface className="overflow-hidden p-0">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative min-h-[460px] overflow-hidden bg-slate-950">
          {mainImg ? (
            <img
              src={mainImg}
              alt={detail.fullName || "Face frame"}
              className="h-full w-full object-cover"
            />
          ) : (
            <PreviewPlaceholder
              title={detail.fullName || "No face detection"}
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
            <span className={cx("rounded-full px-3 py-1.5 text-sm font-semibold", statusTone(detail.status))}>
              {detail.status || "-"}
            </span>
          </div>

          <div className="absolute bottom-5 left-5 right-5">
            <div className="max-w-3xl text-white">
              <div className="truncate text-[34px] font-semibold leading-none">
                {detail.fullName || t("nav.faceRecognize", { defaultValue: "Face Recognize" })}
              </div>
              <div className="mt-2 text-sm text-slate-200">{subtitle || "No recent face frame"}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-[#F8FBFE] xl:border-l xl:border-t-0">
          <div className="p-5 pb-4">
            <UtilitySectionTitle
              title={t("recentDetections", { defaultValue: "Recent detections" })}
              subtitle={t("showingCount", {
                count: visibleRows.length,
                defaultValue: "{{count}} latest face events",
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
                        ? "border-[#A8DEFF] bg-[#EEF8FF] shadow-[0_10px_24px_rgba(57,184,238,0.10)]"
                        : "border-slate-200 bg-white hover:border-[#CFE6F8] hover:bg-slate-50"
                    )}
                  >
                    <img
                      src={row.picture || ""}
                      alt={row.fullName}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-semibold text-slate-900">
                        {row.fullName}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{row.gender}</span>
                        <span className="text-slate-300">•</span>
                        <span>{row.province}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {formatDateTime(row.timeInISO)}
                      </div>
                    </div>
                    <span className={cx("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusTone(row.inout))}>
                      {row.inout}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-400">
                {t("empty.face", { defaultValue: "No face recognition events for this filter" })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 p-5">
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
          <div className="rounded-[24px] border border-slate-200 bg-[#F8FBFE] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Face Crop
            </div>
            <div className="mt-5 flex justify-center">
              {selRow?.picture ? (
                <img
                  src={selRow.picture}
                  alt={detail.fullName || "Face crop"}
                  className="h-[136px] w-[136px] rounded-full object-cover ring-4 ring-white shadow-[0_14px_34px_rgba(15,23,42,0.12)]"
                />
              ) : (
                <div className="grid h-[136px] w-[136px] place-items-center rounded-full bg-slate-200 text-sm font-medium text-slate-500">
                  No image
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailTile
              label={t("table.fullName", { defaultValue: "FULL NAME" })}
              value={detail.fullName}
            />
            <DetailTile
              label={t("table.gender", { defaultValue: "GENDER" })}
              value={detail.gender}
            />
            <DetailTile
              label={t("table.site", { defaultValue: "SITE" })}
              value={detail.province}
            />
            <DetailTile
              label={t("filters.status", { defaultValue: "STATUS" })}
              value={detail.status}
            />
            <DetailTile
              label={t("timeIn", { defaultValue: "TIME IN" })}
              value={detail.timeIn}
            />
            <DetailTile
              label={t("timeOut", { defaultValue: "TIME OUT" })}
              value={detail.timeOut}
            />
          </div>

          <div className="rounded-[24px] border border-[#D5F1E6] bg-[linear-gradient(135deg,#F5FFFB_0%,#E8FFF3_100%)] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500">
              Live Snapshot
            </div>
            <div className="mt-4 text-[26px] font-semibold leading-tight text-slate-950">
              {detail.fullName || "-"}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={cx("rounded-full px-3 py-1 text-xs font-semibold", statusTone(detail.status))}>
                {detail.status || "-"}
              </span>
              <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-600">
                {detail.gender || "-"}
              </span>
            </div>
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <div>
                <span className="font-semibold text-slate-900">Camera:</span> {mainCamera}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Site:</span> {detail.province || "-"}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Last seen:</span> {mainTime}
              </div>
            </div>
          </div>
        </div>
      </div>
    </UtilitySurface>
  );
}
