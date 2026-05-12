// src/features/notifications/notificationsTypes.ts
//
// TypeScript types for the v2 notification API + SSE stream.
// Discriminated union on `payload.feKey` makes consumers exhaustively switchable
// without keyword matching.

export type NotiType = "alert" | "warning" | "info" | "normal" | "offline" | "success";
export type Severity = "low" | "medium" | "critical";

// ---------------------------------------------------------------------------
// FeKey — exhaustive list of event discriminators. Add new keys here when the
// backend extends the catalog. Backend will emit `feKey: "unknown"` for
// uncatalogued title keys; FE renders a generic fallback in that case.
// ---------------------------------------------------------------------------
export type FeKey =
  | "face"
  | "plate"
  | "motion"
  | "fire"
  | "offline"
  | "online"
  | "electric_low"
  | "fall"
  | "sleep"
  | "bp_critical"
  | "bp_warning"
  | "medical"
  | "sos"
  | "assistant"
  | "water_leak"
  | "water_backflow"
  | "air_pm25"
  | "unknown";

// ---------------------------------------------------------------------------
// Payload — discriminated by feKey.
// `extra` is a DEBUG SURFACE (vendor unmodeled fields). Components MUST NOT
// consume `extra.*` directly in production code — file a backend ticket to
// promote needed fields to typed payload instead.
// ---------------------------------------------------------------------------

type ExtraBag = { extra?: Record<string, unknown> };

export type FacePayload = ExtraBag & {
  feKey: "face";
  person?: { fullName?: string; gender?: string };
  cameraName?: string;
  cropImg?: string;
  fullFrame?: string;
  province?: string;
  timeInISO?: string;
  timeOutISO?: string;
};

export type PlatePayload = ExtraBag & {
  feKey: "plate";
  plateText?: string;
  confidence?: number[];
  cameraName?: string;
  platePicture?: string;
  province?: string;
  timestamp?: string;
};

export type MotionPayload = ExtraBag & {
  feKey: "motion";
  cameraName?: string;
  durationSec?: number;
};

export type FirePayload = ExtraBag & {
  feKey: "fire";
  cameraName?: string;
  intensity?: number;
};

export type OfflinePayload = ExtraBag & { feKey: "offline"; lastSeenAt?: string };
export type OnlinePayload = ExtraBag & { feKey: "online" };

export type ElectricLowPayload = ExtraBag & {
  feKey: "electric_low";
  observedW?: number;
  thresholdW?: number;
};

export type FallPayload = ExtraBag & {
  feKey: "fall";
  location?: string;
  cameraName?: string;
};

export type SleepPayload = ExtraBag & { feKey: "sleep"; durationMin?: number };

export type BpCriticalPayload = ExtraBag & {
  feKey: "bp_critical";
  systolic?: number;
  diastolic?: number;
};
export type BpWarningPayload = ExtraBag & {
  feKey: "bp_warning";
  systolic?: number;
  diastolic?: number;
};
export type MedicalPayload = ExtraBag & { feKey: "medical" };

export type SosPayload = ExtraBag & { feKey: "sos"; triggeredBy?: string };
export type AssistantPayload = ExtraBag & {
  feKey: "assistant";
  intent?: string;
  transcript?: string;
};

export type WaterLeakPayload = ExtraBag & {
  feKey: "water_leak";
  flowLpm?: number;
  estimatedLossLiters?: number;
};
export type WaterBackflowPayload = ExtraBag & { feKey: "water_backflow" };

export type AirPm25Payload = ExtraBag & {
  feKey: "air_pm25";
  pm25?: number;
  pm10?: number;
};

export type UnknownPayload = ExtraBag & {
  feKey: "unknown";
  titleKey?: string | null;
};

export type NotificationPayload =
  | FacePayload
  | PlatePayload
  | MotionPayload
  | FirePayload
  | OfflinePayload
  | OnlinePayload
  | ElectricLowPayload
  | FallPayload
  | SleepPayload
  | BpCriticalPayload
  | BpWarningPayload
  | MedicalPayload
  | SosPayload
  | AssistantPayload
  | WaterLeakPayload
  | WaterBackflowPayload
  | AirPm25Payload
  | UnknownPayload;

// ---------------------------------------------------------------------------
// DTO
// ---------------------------------------------------------------------------

export type NotificationSiteRef = {
  id: string;
  code: string;
  name: string;
  coords?: { lat: number; lng: number } | null;
};

export type NotificationDeviceRef = {
  id: string;
  model?: string;
  type?: string;
};

export type NotificationImageRef = { url: string } | null;

export type NotificationReadState = {
  isRead: boolean;
  readAt: string | null;
};

export type NotificationDTO = {
  id: string;
  titleKey: string | null;
  feKey: FeKey;
  type: NotiType;
  severity: Severity;
  title: string;
  icon: string | null;
  occurredAt: string;
  site: NotificationSiteRef | null;
  device: NotificationDeviceRef | null;
  image: NotificationImageRef;
  payload: NotificationPayload;
  read: NotificationReadState;
};

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export type NotificationListResponse = {
  items: NotificationDTO[];
  lastSeenAt: string | null;
  nextSince: string | null;
};

export type UnreadCountResponse = {
  count: number;
  lastSeenAt: string | null;
};

export type MarkReadResponse = {
  id: string;
  readAt: string;
};

export type MarkSeenResponse = {
  lastSeenAt: string;
};

export type MarkAllReadResponse = {
  count: number;
  hasMore: boolean;
};

// ---------------------------------------------------------------------------
// SSE event types
// ---------------------------------------------------------------------------

export type StreamHelloEvent = {
  type: "hello";
  ok: boolean;
  role: string;
  scope: number;
};

export type StreamPingEvent = {
  type: "ping";
  ts: number;
};

export type StreamNotificationEvent = {
  type: "notification";
  feKey: FeKey;
  dto: NotificationDTO;
};

export type StreamStatus =
  | "idle"
  | "connecting"
  | "open"
  | "fallback-polling"
  | "error";

export type StreamScope = { role: string; scope: number };
