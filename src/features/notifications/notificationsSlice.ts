// src/features/notifications/notificationsSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationSeen,
} from "./notificationsThunks";
import type {
  NotificationDTO,
  StreamScope,
  StreamStatus,
} from "./notificationsTypes";

type LoadStatus = "idle" | "pending" | "succeeded" | "failed";

type NotificationsState = {
  // Items keyed by id for O(1) updates; allIds preserves chronological order
  // with newest first.
  byId: Record<string, NotificationDTO>;
  allIds: string[];

  // Read/seen state
  lastSeenAt: string | null;
  unreadCount: number;

  // List fetch state
  listStatus: LoadStatus;
  listError: string | null;
  // Cursor returned by the last successful list/stream response, used as
  // `?since=` when polling resumes after an SSE drop.
  nextSince: string | null;

  // SSE stream state
  streamStatus: StreamStatus;
  streamScope: StreamScope | null;
  lastPingAt: number | null;
};

const initialState: NotificationsState = {
  byId: {},
  allIds: [],
  lastSeenAt: null,
  unreadCount: 0,
  listStatus: "idle",
  listError: null,
  nextSince: null,
  streamStatus: "idle",
  streamScope: null,
  lastPingAt: null,
};

function compareNewestFirst(
  a: NotificationDTO,
  b: NotificationDTO
): number {
  return b.occurredAt.localeCompare(a.occurredAt);
}

function insertSortedNewestFirst(
  allIds: string[],
  byId: Record<string, NotificationDTO>,
  id: string
): void {
  // Linear scan is fine for the dashboard's working set (≤ few hundred).
  // If this grows we can swap to a balanced tree / sorted set.
  for (let i = 0; i < allIds.length; i++) {
    const existing = byId[allIds[i]];
    if (!existing) continue;
    if (compareNewestFirst(byId[id], existing) <= 0) {
      allIds.splice(i, 0, id);
      return;
    }
  }
  allIds.push(id);
}

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    /** Append/replace a single notification (used by the SSE stream). */
    appendOne(state, action: PayloadAction<NotificationDTO>) {
      const dto = action.payload;
      const existed = Object.prototype.hasOwnProperty.call(state.byId, dto.id);
      state.byId[dto.id] = dto;
      if (!existed) {
        insertSortedNewestFirst(state.allIds, state.byId, dto.id);
        if (!dto.read.isRead) state.unreadCount += 1;
      }
    },

    /** Bulk merge — used by initial fetch / polling rehydrate. */
    upsertMany(state, action: PayloadAction<NotificationDTO[]>) {
      for (const dto of action.payload) {
        const existed = Object.prototype.hasOwnProperty.call(
          state.byId,
          dto.id
        );
        state.byId[dto.id] = dto;
        if (!existed) {
          insertSortedNewestFirst(state.allIds, state.byId, dto.id);
        }
      }
    },

    setStreamStatus(state, action: PayloadAction<StreamStatus>) {
      state.streamStatus = action.payload;
    },

    setStreamScope(state, action: PayloadAction<StreamScope | null>) {
      state.streamScope = action.payload;
    },

    setLastPingAt(state, action: PayloadAction<number>) {
      state.lastPingAt = action.payload;
    },

    /** Local optimistic read flag (server confirmation comes via markRead). */
    markReadLocal(state, action: PayloadAction<string>) {
      const id = action.payload;
      const noti = state.byId[id];
      if (!noti || noti.read.isRead) return;
      noti.read = { isRead: true, readAt: new Date().toISOString() };
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- fetchNotifications (initial load / fallback polling) ----
      .addCase(fetchNotifications.pending, (state) => {
        state.listStatus = "pending";
        state.listError = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        for (const dto of action.payload.items) {
          const existed = Object.prototype.hasOwnProperty.call(
            state.byId,
            dto.id
          );
          state.byId[dto.id] = dto;
          if (!existed) {
            insertSortedNewestFirst(state.allIds, state.byId, dto.id);
          }
        }
        if (action.payload.lastSeenAt != null) {
          state.lastSeenAt = action.payload.lastSeenAt;
        }
        if (action.payload.nextSince != null) {
          state.nextSince = action.payload.nextSince;
        }
        state.unreadCount = state.allIds.reduce((acc, id) => {
          const dto = state.byId[id];
          return acc + (dto && !dto.read.isRead ? 1 : 0);
        }, 0);
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.listStatus = "failed";
        state.listError = action.error.message ?? "Failed to load notifications";
      })

      // ---- unread count ----
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.count;
        if (action.payload.lastSeenAt != null) {
          state.lastSeenAt = action.payload.lastSeenAt;
        }
      })

      // ---- mark seen (bell click) ----
      .addCase(markNotificationSeen.fulfilled, (state, action) => {
        state.lastSeenAt = action.payload.lastSeenAt;
      })

      // ---- mark read per item ----
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const noti = state.byId[action.payload.id];
        if (!noti) return;
        const wasUnread = !noti.read.isRead;
        noti.read = { isRead: true, readAt: action.payload.readAt };
        if (wasUnread) state.unreadCount = Math.max(0, state.unreadCount - 1);
      })

      // ---- mark all read ----
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        const now = new Date().toISOString();
        for (const id of state.allIds) {
          const noti = state.byId[id];
          if (!noti || noti.read.isRead) continue;
          noti.read = { isRead: true, readAt: now };
        }
        state.unreadCount = 0;
      })

      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export const notificationsActions = notificationsSlice.actions;
export default notificationsSlice.reducer;
export type { NotificationsState };
