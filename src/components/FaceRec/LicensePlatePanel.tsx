import React from "react";
// src/components/FaceRec/LicensePlatePanel.tsx
import { plateDetail as PL_DETAIL_CONST, confidenceHeader as PL_CONF_CONST } from "./faceRec.constant";
import { useFaceRec } from "../../context/FaceRecContext";
import { useFilters } from "../../context/FiltersContext";
import { useTranslation } from "react-i18next";

// no static green placeholder; show real previews when available

export default function LicensePlatePanel() {
  const faceRec = useFaceRec();
  const { date: globalDate } = useFilters();
  // build list from filtered rows instead of static list
  const detail = (faceRec?.plateDetail ?? (PL_DETAIL_CONST as any)) as any;
  const conf = (faceRec?.plateConfidenceHeader?.length ? faceRec.plateConfidenceHeader : (PL_CONF_CONST as any)) as any[];

  const allRows = (faceRec?.plateRows as any[]) || [];
  const rows = React.useMemo(() => {
    if (!globalDate) return allRows;
    return allRows.filter((r: any) => {
      const d = new Date(r?.timestamp);
      return (
        d.getFullYear() === (globalDate as any).y &&
        d.getMonth() + 1 === (globalDate as any).m &&
        d.getDate() === (globalDate as any).d
      );
    });
  }, [allRows.length, (globalDate as any)?.y, (globalDate as any)?.m, (globalDate as any)?.d]);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const getRowForListIndex = (i: number) => {
    if (!rows.length) return null;
    const idx = rows.length - 1 - i; // list is last 5 reversed
    return rows[idx] ?? null;
  };
  const selRow = getRowForListIndex(selectedIdx) || (rows.length ? rows[rows.length - 1] : null);
  const mainImg = selRow?.picture || "";
  const cropImg = selRow?.platePicture || mainImg;
  const mainCamera = selRow?.cameraName || "-";
  const mainTime = selRow?.timestamp ? new Date(selRow.timestamp).toLocaleString() : "-";

  const { t } = useTranslation("facerec");

  return (
    <div className="mt-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* รูปใหญ่ + list ขวา */}
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
              {(rows.slice(-5).reverse()).map((r: any, i: number) => (
                <div key={i} onClick={() => setSelectedIdx(i)} className={["flex items-center justify-between gap-2 border-b border-gray-600 px-2 py-3 hover:bg-gray-700 cursor-pointer", selectedIdx === i ? "bg-gray-700" : ""].join(" ")}>
                  <div className="flex gap-3 items-center justify-center ">
                    <img src={getRowForListIndex(i)?.platePicture || getRowForListIndex(i)?.picture || ""} alt="" className="w-16 h-10 object-cover rounded" />
                    <div className="flex flex-col">
                      <span>{r.plateText}</span>
                      <span className="text-xs text-gray-300">{r.province}</span>
                      <span className="text-xs text-gray-400">{new Date(r.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ล่าง: crop + รายละเอียด + confident */}
        <div className="grid lg-1399:grid-cols-3 md:grid-cols-2 gap-4 p-4">
          <div className="flex justify-center items-center col-span-2 md:col-span-1">
            <img src={cropImg} alt="plate-crop" className="w-[120px] h-[60px] object-cover rounded" />
          </div>

          <div className="flex flex-col text-sm space-y-2 **:w-full **:flex **:whitespace-nowrap col-span-2 md:col-span-1 ">
            <p>
              <strong>{t("plate")}:</strong> {detail.plate}
            </p>
            <p>
              <strong>{t("province")}:</strong> {detail.province}
            </p>
            <p>
              <strong>{t("type")}:</strong> {detail.type}
            </p>
            <p>
              <strong>{t("owner")}:</strong> {detail.owner}
            </p>
            <p>
              <strong>{t("color")}:</strong> {detail.color}
            </p>
            <p>
              <strong>{t("camera")}:</strong> {detail.camera}
            </p>
            <p>
              <strong>{t("timestamp")}:</strong> {detail.timestamp}
            </p>
          </div>

          <div className="flex lg-1399:col-span-1 col-span-2 flex-col justify-center">
            <div className="font-semibold text-[13px]">{t("confident")}</div>
            <table className="w-full border text-center text-sm">
              <thead>
                <tr>
                  {conf.map((ch, i) => (
                    <th key={i} className="text-[18px] border px-5 py-4 font-bold">
                      {ch}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

