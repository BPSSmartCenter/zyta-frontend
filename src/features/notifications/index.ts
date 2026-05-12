// src/features/notifications/index.ts
export {
  default as notificationsReducer,
  notificationsActions,
} from "./notificationsSlice";
export type { NotificationsState } from "./notificationsSlice";

export {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationSeen,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notificationsThunks";

export {
  selectAllNotifications,
  selectByFeKeys,
  selectCountsByFeKey,
  selectLastSeenAt,
  selectNotificationById,
  selectNotificationListStatus,
  selectNotificationsWithCoords,
  selectNextSince,
  selectRecentNotifications,
  selectStreamScope,
  selectStreamStatus,
  selectUnreadCount,
} from "./notificationsSelectors";

export {
  adaptLegacyV1Notification,
  adaptV2Notification,
} from "./notificationsAdapter";

export { useNotificationStream } from "./useNotificationStream";
export { NotificationStreamGate } from "./NotificationStreamGate";

// Legacy compat — to be removed in a later PR (notisFeed migration).
export {
  listNotifications,
  type ListNotificationsParams,
} from "./notificationsLegacy";

export type {
  AirPm25Payload,
  AssistantPayload,
  BpCriticalPayload,
  BpWarningPayload,
  ElectricLowPayload,
  FacePayload,
  FallPayload,
  FeKey,
  FirePayload,
  MarkAllReadResponse,
  MarkReadResponse,
  MarkSeenResponse,
  MedicalPayload,
  MotionPayload,
  NotificationDTO,
  NotificationDeviceRef,
  NotificationImageRef,
  NotificationListResponse,
  NotificationPayload,
  NotificationReadState,
  NotificationSiteRef,
  NotiType,
  OfflinePayload,
  OnlinePayload,
  PlatePayload,
  Severity,
  SleepPayload,
  SosPayload,
  StreamHelloEvent,
  StreamNotificationEvent,
  StreamPingEvent,
  StreamScope,
  StreamStatus,
  UnknownPayload,
  UnreadCountResponse,
  WaterBackflowPayload,
  WaterLeakPayload,
} from "./notificationsTypes";
