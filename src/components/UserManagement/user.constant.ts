// ข้อมูลตัวอย่างสำหรับหน้า Admin Management

export type UserRole = "Admin" | "Staff";
export type AdminRow = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  addedAt: string;      // ISO
  lastAccessAt: string; // ISO
  active: boolean;
  avatar: string;
};

export const ADMIN_ROWS: AdminRow[] = [
  {
    id: "1",
    fullName: "Richard famosos",
    email: "Richard095@gmail.com",
    role: "Admin",
    addedAt: "2025-01-06T17:24:00.000Z",
    lastAccessAt: "2025-01-06T17:24:00.000Z",
    active: true,
    avatar:
      "https://i.pravatar.cc/80?img=3",
  },
  {
    id: "2",
    fullName: "Mille kittipaisarn",
    email: "Mille@gmail.com",
    role: "Staff",
    addedAt: "2025-01-06T17:24:00.000Z",
    lastAccessAt: "2025-01-06T17:24:00.000Z",
    active: false,
    avatar:
      "https://i.pravatar.cc/80?img=5",
  },
  {
    id: "3",
    fullName: "Ricky astley",
    email: "Ricky456@gmail.com",
    role: "Staff",
    addedAt: "2025-01-06T17:24:00.000Z",
    lastAccessAt: "2025-01-06T17:24:00.000Z",
    active: true,
    avatar:
      "https://i.pravatar.cc/80?img=12",
  },
];
