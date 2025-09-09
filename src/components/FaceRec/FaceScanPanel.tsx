// src/components/FaceRec/FaceScanPanel.tsx
import { faceList, faceDetail } from "./faceRec.constant";
import { useTranslation } from "react-i18next";

const GREEN_BOX_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="36" viewBox="0 0 56 36"><rect x="0" y="0" width="56" height="36" rx="6" fill="#16A34A"/></svg>`
  );

export default function FaceScanPanel() {
  const { t } = useTranslation("facerec");

  return (
    <div className="mt-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* รูปใหญ่ + โปรไฟล์ลิสต์ทางขวา */}
        <div className="relative flex lg-1024:flex-row flex-col">
          <div className="flex-1">
            <img
              src={GREEN_BOX_SVG}
              alt="camera-main"
              className="w-full h-[385px] object-cover"
            />
            <div className="absolute flex top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded gap-3 select-none">
              <span className="flex gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="white"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-cctv-icon lucide-cctv"
                >
                  <path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97" />
                  <path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z" />
                  <path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15" />
                  <path d="M2 21v-4" />
                  <path d="M7 9h.01" />
                </svg>
                hikvision
              </span>
              <span className="flex gap-1">
                <div className="flex justify-center items-center w-[15px] h-[14.5px] bg-white rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-clock-icon lucide-clock"
                  >
                    <path d="M12 6v6l4 2" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                2022-05-13 08:37:55
              </span>
            </div>
          </div>

          {/* รายการใบหน้าด้านขวา */}
          <div className="lg-1024:w-[300px] w-full bg-black text-white text-sm overflow-y-auto">
            <div className="flex flex-col">
              {faceList.slice(0, 5).map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 border-b border-gray-600 px-2 py-3 hover:bg-gray-700 cursor-pointer"
                >
                  <div className="flex gap-3 items-center justify-center ">
                    <img
                      src={GREEN_BOX_SVG}
                      alt=""
                      className="w-10 h-10 object-cover rounded-full"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">{f.fullName}</span>
                      <span className="text-[11px] text-gray-300 uppercase">
                        {f.gender}
                      </span>
                      <span className="text-xs text-gray-400">
                        {f.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ล่าง: ภาพใบหน้า (crop) + รายละเอียด */}
        <div className="grid md:grid-cols-12 gap-4 p-4">
          <div className="md:col-span-3 flex justify-center items-start">
            <img
              src={GREEN_BOX_SVG}
              alt="face-crop"
              className="w-[120px] h-[120px] object-cover rounded-full"
            />
          </div>
          <div className="md:col-span-5 text-sm space-y-2 **:w-full **:flex **:whitespace-nowrap">
            <p>
              <strong>
                {t("table.fullName", { defaultValue: "FULL NAME" })}:
              </strong>{" "}
              {faceDetail.fullName}
            </p>
            <p>
              <strong>{t("table.gender", { defaultValue: "GENDER" })}:</strong>{" "}
              {faceDetail.gender}
            </p>
            <p>
              <strong>
                {t("table.province", { defaultValue: "PROVINCE" })}:
              </strong>{" "}
              {faceDetail.province}
            </p>
            <p>
              <strong>
                {t("filters.status", { defaultValue: "Status" })}:
              </strong>{" "}
              {faceDetail.status}
            </p>
            <p>
              <strong>{t("table.timeIn", { defaultValue: "TIME IN" })}:</strong>{" "}
              {faceDetail.timeIn}
            </p>
            <p>
              <strong>
                {t("table.timeOut", { defaultValue: "TIME OUT" })}:
              </strong>{" "}
              {faceDetail.timeOut}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
