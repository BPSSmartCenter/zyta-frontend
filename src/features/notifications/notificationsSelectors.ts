// src/features/notifications/notificationsSelectors.ts
import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../store/store";
import type { FeKey, NotificationDTO } from "./notificationsTypes";

// ---- Raw input selectors ----
const selectById = (state: RootState) => state.notifications.byId;
const selectAllIds = (state: RootState) => state.notifications.allIds;

export const selectUnreadCount = (state: RootState) =>
  state.notifications.unreadCount;

export const selectLastSeenAt = (state: RootState) =>
  state.notifications.lastSeenAt;

export const selectStreamStatus = (state: RootState) =>
  state.notifications.streamStatus;

export const selectStreamScope = (state: RootState) =>
  state.notifications.streamScope;

export const selectNextSince = (state: RootState) =>
  state.notifications.nextSince;

export const selectNotificationListStatus = (state: RootState) =>
  state.notifications.listStatus;

// ---- Memoized derived selectors ----

/** All notifications in newest-first order. */
export const selectAllNotifications = createSelector(
  [selectAllIds, selectById],
  (ids, byId): NotificationDTO[] =>
    ids.map((id) => byId[id]).filter((d): d is NotificationDTO => Boolean(d))
);

/**
 * Filter notifications by one or more feKeys. The returned array reference
 * is stable across renders when the filter result is unchanged.
 */
export const selectByFeKeys = (feKeys: readonly FeKey[]) =>
  createSelector(
    [selectAllNotifications],
    (list) => list.filter((n) => feKeys.includes(n.feKey))
  );

/** Notifications that have lat/lng coordinates (for map markers). */
export const selectNotificationsWithCoords = createSelector(
  [selectAllNotifications],
  (list) => list.filter((n) => Boolean(n.site?.coords))
);

/** Most recent N notifications (default 20) — for dropdown/bell preview. */
export const selectRecentNotifications = (limit: number = 20) =>
  createSelector([selectAllNotifications], (list) => list.slice(0, limit));

/** Count of notifications grouped by feKey — useful for DetectionSummaryBar. */
export const selectCountsByFeKey = createSelector(
  [selectAllNotifications],
  (list) => {
    const counts: Partial<Record<FeKey, number>> = {};
    for (const n of list) {
      counts[n.feKey] = (counts[n.feKey] ?? 0) + 1;
    }
    return counts;
  }
);

/** Find a single notification by id (used by detail panels / deep links). */
export const selectNotificationById = (id: string | null | undefined) =>
  (state: RootState): NotificationDTO | undefined => {
    if (!id) return undefined;
    return state.notifications.byId[id];
  };
