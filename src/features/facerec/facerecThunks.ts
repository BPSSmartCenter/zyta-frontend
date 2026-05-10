// src/features/facerec/facerecThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { request, LEGACY_API_BASE_URL } from "../../lib/http";

export type FaceRecWebhookPayload = {
  id: string;
  picture: string;
  fullName: string;
  gender: "MALE" | "FEMALE" | string;
  province: string;
  dateTimestamp: string;
  siteCode?: string;
  site?: string;
  siteName?: string;
  siteId?: string;
  cameraName?: string;
};

export type PlateWebhookPayload = {
  id: string;
  picture?: string;
  platePicture?: string;
  plateText: string;
  province: string;
  confidenceHeader?: string[];
  cameraName?: string;
  dateTimestamp: string;
  siteCode?: string;
  site?: string;
  siteName?: string;
  siteId?: string;
};

export type FaceRecEventsPayload = {
  items: unknown[];
  plateItems?: unknown[];
};

export const fetchFaceRecEvents = createAsyncThunk<FaceRecEventsPayload>(
  "facerec/fetchEvents",
  async () => {
    return request<FaceRecEventsPayload>("/facerec/events");
  }
);

/**
 * SSE stream is NOT migrated to /api/v1 yet. Pin to legacy /api regardless of
 * the configured base URL.
 */
export function faceRecStreamUrl(): string {
  return `${LEGACY_API_BASE_URL}/facerec/stream`;
}
