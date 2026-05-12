// src/features/notifications/NotificationStreamGate.tsx
//
// Empty-body component that wires up the notification SSE stream while it is
// mounted. Drop it inside any tree that should receive realtime notifications
// (currently mounted in AuthedProviders, so the stream only runs after the
// user is authenticated).

import { useNotificationStream } from "./useNotificationStream";

export function NotificationStreamGate() {
  useNotificationStream();
  return null;
}
