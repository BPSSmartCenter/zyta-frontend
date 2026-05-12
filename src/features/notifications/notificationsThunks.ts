// src/features/notifications/notificationsThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { request } from "../../lib/http";
import type { RootState } from "../../store/store";
import {
  adaptLegacyV1Notification,
  adaptV2Notification,
} from "./notificationsAdapter";
import type {
  MarkAllReadResponse,
  MarkReadResponse,
  MarkSeenResponse,
  NotificationDTO,
  NotificationListResponse,
  UnreadCountResponse,
} from "./notificationsTypes";

export type FetchNotificationsArg = {
  since?: string;
  limit?: number;
};

/**
 * GET /api/v1/notifications?format=v2&since=&limit=
 *
 * Always requests v2. Falls back to the legacy adapter if the server still
 * returns a legacy shape (during the migration window).
 */
export const fetchNotifications = createAsyncThunk<
  NotificationListResponse,
  FetchNotificationsArg | undefined,
  { state: RootState }
>("notifications/fetch", async (arg, { getState }) => {
  const params: Record<string, string> = { format: "v2" };
  if (arg?.since) params.since = arg.since;
  if (arg?.limit) params.limit = String(arg.limit);

  const body = await request<unknown>("/notifications", { params });

  // Server returns either `{ items, lastSeenAt, nextSince }` (typical) or
  // a bare array when ok-envelope unwrap collapses the v1 shape. Handle both.
  const items: unknown[] = Array.isArray(body)
    ? body
    : ((body as { items?: unknown[] }).items ?? []);
  const lastSeenAt =
    typeof (body as { lastSeenAt?: unknown }).lastSeenAt === "string"
      ? ((body as { lastSeenAt: string }).lastSeenAt)
      : null;
  const nextSince =
    typeof (body as { nextSince?: unknown }).nextSince === "string"
      ? ((body as { nextSince: string }).nextSince)
      : null;

  const catalog = getState().catalog.byTitleKey;
  const adapted: NotificationDTO[] = items
    .map((raw) => {
      // Prefer the canonical v2 adapter; if the row looks legacy (no
      // `payload.feKey`), fall through to the legacy adapter so we still
      // populate `payload` correctly.
      const r = raw as Record<string, unknown> | null;
      const hasPayload =
        r != null &&
        typeof r === "object" &&
        r.payload != null &&
        typeof (r.payload as { feKey?: unknown }).feKey === "string";
      return hasPayload
        ? adaptV2Notification(raw)
        : adaptLegacyV1Notification(raw, catalog);
    })
    .filter((n): n is NotificationDTO => n !== null);

  return { items: adapted, lastSeenAt, nextSince };
});

export const fetchUnreadCount = createAsyncThunk<UnreadCountResponse>(
  "notifications/fetchUnreadCount",
  async () => {
    return request<UnreadCountResponse>("/notifications/unread-count");
  }
);

export const markNotificationSeen = createAsyncThunk<MarkSeenResponse>(
  "notifications/markSeen",
  async () => {
    return request<MarkSeenResponse>("/notifications/seen", { method: "POST" });
  }
);

export const markNotificationRead = createAsyncThunk<MarkReadResponse, string>(
  "notifications/markRead",
  async (id) => {
    return request<MarkReadResponse>(
      `/notifications/${encodeURIComponent(id)}/read`,
      { method: "POST" }
    );
  }
);

/**
 * Loop `POST /read-all` until backend reports no more unread (cap 1000/call).
 * Returns the total marked across all chunks.
 */
export const markAllNotificationsRead = createAsyncThunk<{ totalMarked: number }>(
  "notifications/markAllRead",
  async () => {
    let totalMarked = 0;
    // Safety net: cap iterations so a misbehaving backend can't hang the UI.
    for (let i = 0; i < 50; i++) {
      const chunk = await request<MarkAllReadResponse>(
        "/notifications/read-all",
        { method: "POST" }
      );
      totalMarked += chunk.count;
      if (!chunk.hasMore) break;
    }
    return { totalMarked };
  }
);
