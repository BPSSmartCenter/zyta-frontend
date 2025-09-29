// src/mocks/data.ts
// ---- Mock ERD Data (USERS, SITES, USER_SITES) ----

export type Role = "admin" | "officer" | "user";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password_hash: string; // mock plain for demo
  role: Role;
  profile?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Site = {
  id: string;
  name: string;
  code: string;
  province_code: string; // ใช้กับ Map
  lat: number;
  lng: number;

  // counters (mock)
  devices_total?: number;
  devices_camera?: number;
  devices_intercom?: number;
  devices_water?: number;
  devices_electric?: number;
  devices_air?: number;

  notis_total?: number;
  notis_alert?: number;
  notis_warning?: number;
  notis_info?: number;
  notis_normal?: number;

  users_count?: number;
};

export type UserSite = {
  user_id: string;
  site_id: string;
  assignedAt: string;
};

// ----- USERS -----
export const USERS: User[] = [
  {
    id: "u_1",
    firstName: "Super",
    lastName: "Admin",
    email: "admin@bps.com",
    password_hash: "Admin098765",
    role: "admin",
    emailVerified: true,
  },
  {
    id: "u_2",
    firstName: "Ops",
    lastName: "Officer",
    email: "officer@bps.com",
    password_hash: "Admin098765",
    role: "officer",
    emailVerified: true,
  },
  {
    id: "u_3",
    firstName: "End",
    lastName: "User",
    email: "user@bps.com",
    password_hash: "Admin098765",
    role: "user",
    emailVerified: true,
  },
];

// ----- SITES (ตัวอย่างใน กทม. และนครปฐม) -----
export const SITES: Site[] = [
  {
    id: "s_1",
    name: "Site A",
    code: "A001",
    province_code: "10", // กรุงเทพมหานคร
    lat: 13.7563,
    lng: 100.5018,
    devices_total: 10,
    notis_total: 5,
  },
  {
    id: "s_2",
    name: "Site B",
    code: "B001",
    province_code: "73", // นครปฐม
    lat: 13.8199,
    lng: 100.062,
    devices_total: 6,
    notis_total: 2,
  },
  {
    id: "s_3",
    name: "Site C",
    code: "C001",
    province_code: "73",
    lat: 13.72,
    lng: 100.06,
    devices_total: 4,
    notis_total: 3,
  },
];

// ----- USER_SITES -----
export const USER_SITES: UserSite[] = [
  { user_id: "u_2", site_id: "s_1", assignedAt: new Date().toISOString() }, // officer เห็น s_1, s_2
  { user_id: "u_2", site_id: "s_2", assignedAt: new Date().toISOString() },

  { user_id: "u_3", site_id: "s_2", assignedAt: new Date().toISOString() }, // user เห็นเฉพาะ s_2
];

// ----- Utilities -----
export const COUNTRY_BBOX_TH: [[number, number], [number, number]] = [
  [5.61, 97.35],
  [20.46, 105.65],
];

// province code -> ชื่อไทย (ให้ MapPanel ใช้ focus ได้ ถ้าต้อง)
export const PROVINCE_CODE_TO_TH: Record<string, string> = {
  "10": "กรุงเทพมหานคร",
  "73": "นครปฐม",
};
