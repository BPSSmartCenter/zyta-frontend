// src/api/sites.ts
import { api } from "./axios";

export async function listSites() {
  const { data } = await api.get("/sites");
  return data; // ถ้า admin ได้ทั้งหมด, role อื่นได้เฉพาะของตัวเอง
}

export async function getSiteInventory(siteId: string) {
  // Primary route (plural)
  try {
    const { data } = await api.get(`/sites/${encodeURIComponent(siteId)}/inventory`);
    return data;
  } catch (e) {
    // Fallback to singular route if backend uses /site/:id/inventory
    const { data } = await api.get(`/site/${encodeURIComponent(siteId)}/inventory`);
    return data;
  }
}
