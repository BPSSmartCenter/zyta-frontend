// src/api/facerec.ts
import { API_BASE_URL, api } from "./axios";

export type FaceRecWebhookPayload = {
  id: string;
  picture: string; // base64 (no prefix required)
  fullName: string;
  gender: "MALE" | "FEMALE" | string;
  province: string;
  dateTimestamp: string; // ISO
  siteCode?: string;
  site?: string;
  siteName?: string;
  siteId?: string;
  cameraName?: string;
};

export type PlateWebhookPayload = {
  id: string;
  picture?: string; // base64
  platePicture?: string; // base64
  plateText: string;
  province: string;
  confidenceHeader?: string[];
  cameraName?: string;
  dateTimestamp: string; // ISO
  siteCode?: string;
  site?: string;
  siteName?: string;
  siteId?: string;
};

export async function listFaceRecEvents(): Promise<{ items: any[]; plateItems?: any[] }> {
  // baseURL in axios already includes "/api"; use relative path here
  const { data } = await api.get(`/facerec/events`);
  return data;
}

export function faceRecStreamUrl(): string {
  return `${API_BASE_URL}/facerec/stream`;
}
