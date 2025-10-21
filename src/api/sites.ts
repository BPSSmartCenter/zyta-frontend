// src/api/sites.ts
import { api } from "./axios";

export async function listSites() {
  const { data } = await api.get("/sites");
  return data; // ถ้า admin ได้ทั้งหมด, role อื่นได้เฉพาะของตัวเอง
}
