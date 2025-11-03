import React from "react";
// src/components/FaceRec/FaceScanPanel.tsx
import { faceDetail as FACE_DETAIL_CONST } from "./faceRec.constant";
import { useTranslation } from "react-i18next";
import { useFaceRec } from "../../context/FaceRecContext";
import { useFilters } from "../../context/FiltersContext";

// no static green placeholder; show real previews when available

export default function FaceScanPanel() {
  const { t } = useTranslation("facerec");
  const faceRec = useFaceRec();
  const { date: globalDate } = useFilters();
  const [selectedIdx, setSelectedIdx] = React.useState(0);

  const allRows = (faceRec?.faceRows as any[]) || [];
  const rows = React.useMemo(() => {
    if (!globalDate) return allRows;
    return allRows.filter((r: any) => {
      const d = new Date(r?.timeInISO);
      return (
        d.getFullYear() === (globalDate as any).y &&
        d.getMonth() + 1 === (globalDate as any).m &&
        d.getDate() === (globalDate as any).d
      );
    });
  }, [allRows.length, (globalDate as any)?.y, (globalDate as any)?.m, (globalDate as any)?.d]);
  const getRowForListIndex = (i: number) => {
    if (!rows.length) return null;
    const idx = rows.length - 1 - i; // faceList is last 5 reversed
    return rows[idx] ?? null;
  };

  const selRow = getRowForListIndex(selectedIdx) || (rows.length ? rows[rows.length - 1] : null);
  const fallbackDetail = (faceRec?.faceDetail ?? (FACE_DETAIL_CONST as any)) as any;
  const detail = selRow
    ? { fullName: selRow.fullName, gender: selRow.gender, province: selRow.province, status: selRow.inout, timeIn: new Date(selRow.timeInISO).toLocaleString(), timeOut: new Date(selRow.timeOutISO).toLocaleString() }
    : fallbackDetail;
  const mainImg = selRow?.picture || "";
  const mainCamera = selRow?.cameraName || "-";
  const mainTime = selRow?.timeInISO ? new Date(selRow.timeInISO).toLocaleString() : "-";

  return (
    <div className="mt-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* ภาพใหญ่ + รายการขวา */}
        <div className="relative flex lg-1024:flex-row flex-col">
          <div className="flex-1">
            <img src={mainImg} alt="camera-main" className="w-full h-[385px] object-cover" />
            <div className="absolute flex top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded gap-3 select-none">
              <span className="flex gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cctv-icon lucide-cctv">
                  <path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97" />
                  <path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z" />
                  <path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15" />
                  <path d="M2 21v-4" />
                  <path d="M7 9h.01" />
                </svg>
                {mainCamera}
              </span>
              <span className="flex gap-1">
                <div className="flex justify-center items-center w-[15px] h-[14.5px] bg-white rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock-icon lucide-clock">
                    <path d="M12 6v6l4 2" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                {mainTime}
              </span>
            </div>
          </div>

          <div className="lg-1024:w-[300px] w-full bg-black text-white text-sm overflow-y-auto">
            <div className="flex flex-col">
              {(rows.slice(-5).reverse()).map((f: any, i: number) => (
                <div key={i} onClick={() => setSelectedIdx(i)} className={["flex items-center justify-between gap-2 border-b border-gray-600 px-2 py-3 hover:bg-gray-700 cursor-pointer", selectedIdx === i ? "bg-gray-700" : ""].join(" ")}>
                  <div className="flex gap-3 items-center justify-center ">
                    <img src={getRowForListIndex(i)?.picture || ""} alt="" className="w-10 h-10 object-cover rounded-full" />
                    <div className="flex flex-col">
                      <span className="font-semibold">{f.fullName}</span>
                      <span className="text-[11px] text-gray-300 uppercase">{f.gender}</span>
                      <span className="text-xs text-gray-400">{new Date(f.timeInISO).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ล่าง: รูป (crop) + รายละเอียด */}
        <div className="grid md:grid-cols-12 gap-4 p-4">
          <div className="md:col-span-3 flex justify-center items-center">
            <img src={mainImg} alt="face-crop" className="w-[120px] h-[120px] object-cover rounded-full" />
          </div>
          <div className="md:col-span-5 text-sm space-y-2 **:w-full **:flex **:whitespace-nowrap">
            <p>
              <strong>{t("table.fullName", { defaultValue: "FULL NAME" })}:</strong> {detail.fullName}
            </p>
            <p>
              <strong>{t("table.gender", { defaultValue: "GENDER" })}:</strong> {detail.gender}
            </p>
            <p>
              <strong>{t("table.province", { defaultValue: "PROVINCE" })}:</strong> {detail.province}
            </p>
            <p>
              <strong>{t("filters.status", { defaultValue: "Status" })}:</strong> {detail.status}
            </p>
            <p>
              <strong>{t("table.timestamp", { defaultValue: "Timestamp" })}:</strong> {detail.timeIn}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
