// src/features/facerec/facerecApi.ts
import { request } from "../../lib/http";

export async function listFaceRecEvents(): Promise<{
  items: unknown[];
  plateItems?: unknown[];
}> {
  return request<{ items: unknown[]; plateItems?: unknown[] }>(
    "/facerec/events"
  );
}
