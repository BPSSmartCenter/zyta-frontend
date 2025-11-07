// src/components/FaceRec/faceRec.constant.ts

// กล่องสีเขียว (แทนรูป)
export const GREEN_BOX_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40" viewBox="0 0 80 40">
       <rect x="0" y="0" width="80" height="40" rx="4" fill="#16A34A"/>
     </svg>`
  );

/* ---------- License Plates: Panel + Table ---------- */
export type LicensePlateRow = {
  id: string;
  picture: string;
  platePicture: string;
  plateText: string;
  province: string;
  confidenceHeader: string[];
  cameraName: string;
  timestamp: string; // ISO
};

export type plateListType = {
  plate?: string;
  province?: string;
  timestamp?: string;
};

export type faceListType = {
  fullName?: string;
  gender?: string;
  timestamp?: string;
};

// รายการด้านขวาใน LicensePlatePanel
export const plateList = [
  // {
  //   plate: "",
  //   province: "",
  //   timestamp: "",
  // },
  // {
  //   plate: "2มศ2550",
  //   province: "กรุงเทพมหานคร",
  //   timestamp: "2022-05-13 08:03:33",
  // },
  // {
  //   plate: "9กข2164",
  //   province: "กรุงเทพมหานคร",
  //   timestamp: "2022-05-13 08:03:33",
  // },
  // {
  //   plate: "000000",
  //   province: "กรุงเทพมหานคร",
  //   timestamp: "2022-05-13 08:03:33",
  // },
  // {
  //   plate: "ภษ1331",
  //   province: "กรุงเทพมหานคร",
  //   timestamp: "2022-05-13 08:03:33",
  // },
];

export const plateDetail = {
  plate: "—",
  province: "—",
  type: "—",
  owner: "—",
  color: "—",
  camera: "—",
  timestamp: "—",
};

export const confidenceHeader = ["—", "—", "—", "—", "—", "—"];

// ✅ ตาราง License Plates (ต้องมีชื่อนี้!)
export const FACE_REC_ROWS: LicensePlateRow[] = [
  // {
  //   id: "lp-1",
  //   picture: GREEN_BOX_SVG,
  //   platePicture: GREEN_BOX_SVG,
  //   plateText: "9รถ2019",
  //   province: "กรุงเทพมหานคร",
  //   confidenceHeader,
  //   cameraName: "hikvision",
  //   timestamp: "2025-01-06T17:24:55Z",
  // },
  // {
  //   id: "lp-2",
  //   picture: GREEN_BOX_SVG,
  //   platePicture: GREEN_BOX_SVG,
  //   plateText: "9รถ2019",
  //   province: "กรุงเทพมหานคร",
  //   confidenceHeader,
  //   cameraName: "hikvision",
  //   timestamp: "2025-01-06T17:24:55Z",
  // },
  // {
  //   id: "lp-3",
  //   picture: GREEN_BOX_SVG,
  //   platePicture: GREEN_BOX_SVG,
  //   plateText: "9รถ2019",
  //   province: "กรุงเทพมหานคร",
  //   confidenceHeader,
  //   cameraName: "hikvision",
  //   timestamp: "2025-01-06T17:24:55Z",
  // },
];

/* ---------- Face Scan: Panel + Table ---------- */
export type FaceScanRow = {
  id: string;
  picture: string; // cropped avatar
  fullFrame?: string; // full screenshot
  fullName: string;
  gender: "MALE" | "FEMALE";
  province: string;
  inout: string; // อนุญาต/ไม่อนุญาต/เข้าแล้ว/ออกแล้ว
  timeInISO: string;
  timeOutISO: string;
  cameraName?: string;
};

// รายการฝั่งขวาใน FaceScanPanel (5 แถว + มี gender บรรทัดกลาง)
export const faceList = [
  // {
  //   fullName: "",
  //   gender: "",
  //   timestamp: "",
  // },
  // {
  //   fullName: "jordan ramoss",
  //   gender: "MALE",
  //   timestamp: "2025-01-06 09:03:33",
  // },
  // {
  //   fullName: "oxford campos",
  //   gender: "MALE",
  //   timestamp: "2025-01-06 08:59:12",
  // },
  // {
  //   fullName: "robert parsons",
  //   gender: "MALE",
  //   timestamp: "2025-01-06 08:40:03",
  // },
  // {
  //   fullName: "albert moreau",
  //   gender: "MALE",
  //   timestamp: "2025-01-06 08:15:01",
  // },
];

export const faceDetail = {
  fullName: "—",
  gender: "—",
  province: "—",
  status: "—",
  timeIn: "—",
  timeOut: "—",
};

// ✅ ตาราง Face Scan
export const FACE_SCAN_ROWS: FaceScanRow[] = [
  // {
  //   id: "fs-1",
  //   picture: GREEN_BOX_SVG,
  //   fullName: "richard farmosos",
  //   gender: "MALE",
  //   province: "กรุงเทพมหานคร",
  //   inout: "อนุญาต",
  //   timeInISO: "2025-01-06T17:24:55Z",
  //   timeOutISO: "2025-01-06T17:24:55Z",
  // },
  // {
  //   id: "fs-2",
  //   picture: GREEN_BOX_SVG,
  //   fullName: "richard farmosos",
  //   gender: "MALE",
  //   province: "กรุงเทพมหานคร",
  //   inout: "ไม่อนุญาต",
  //   timeInISO: "2025-01-06T17:24:55Z",
  //   timeOutISO: "2025-01-06T17:24:55Z",
  // },
  // {
  //   id: "fs-3",
  //   picture: GREEN_BOX_SVG,
  //   fullName: "richard farmosos",
  //   gender: "MALE",
  //   province: "กรุงเทพมหานคร",
  //   inout: "เข้าแล้ว",
  //   timeInISO: "2025-01-06T17:24:55Z",
  //   timeOutISO: "2025-01-06T17:24:55Z",
  // },
  // {
  //   id: "fs-4",
  //   picture: GREEN_BOX_SVG,
  //   fullName: "richard farmosos",
  //   gender: "MALE",
  //   province: "กรุงเทพมหานคร",
  //   inout: "ออกแล้ว",
  //   timeInISO: "2025-01-06T17:24:55Z",
  //   timeOutISO: "2025-01-06T17:24:55Z",
  // },
  // {
  //   id: "fs-5",
  //   picture: GREEN_BOX_SVG,
  //   fullName: "richard farmosos",
  //   gender: "MALE",
  //   province: "กรุงเทพมหานคร",
  //   inout: "อนุญาต",
  //   timeInISO: "2025-01-06T17:24:55Z",
  //   timeOutISO: "2025-01-06T17:24:55Z",
  // },
];
