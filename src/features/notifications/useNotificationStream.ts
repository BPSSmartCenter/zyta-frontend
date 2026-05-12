// src/features/notifications/useNotificationStream.ts
//
// SSE client for /api/v1/notifications/stream.
//
// Lifecycle:
//   mount → fetch initial snapshot via REST → open EventSource
//   open  → listen for hello, ping, and one event per FeKey
//   error → exponential backoff reconnect; after MAX_ERRORS consecutive
//            failures, fall back to cursor polling at POLL_INTERVAL_MS
//   ping  watchdog: if no ping/event for PING_TIMEOUT_MS → force reconnect
//   unmount → close EventSource + clear timers
//
// The hook is dispatch-only — it doesn't return anything; consumers read
// `state.notifications` via selectors.

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectIsAuthenticated } from "../auth";
import { API_BASE_URL } from "../../lib/http";
import { adaptV2Notification } from "./notificationsAdapter";
import {
  fetchNotifications,
  notificationsActions,
} from "./";
import type { FeKey } from "./notificationsTypes";

// FeKey list mirrors the union in notificationsTypes.ts. Backend may add new
// keys in future — for forward-compat we also subscribe to an "unknown"
// generic event and the default `message` event as a safety net.
const FE_KEY_EVENTS: readonly FeKey[] = [
  "face",
  "plate",
  "motion",
  "fire",
  "offline",
  "online",
  "electric_low",
  "fall",
  "sleep",
  "bp_critical",
  "bp_warning",
  "medical",
  "sos",
  "assistant",
  "water_leak",
  "water_backflow",
  "air_pm25",
  "unknown",
];

const PING_TIMEOUT_MS = 60_000; // No ping/event for 60s → reconnect
const WATCHDOG_INTERVAL_MS = 10_000;
const MAX_ERRORS_BEFORE_FALLBACK = 3;
const POLL_INTERVAL_MS = 15_000;
const RECONNECT_BACKOFF_MAX_MS = 10_000;

export function useNotificationStream() {
  const dispatch = useAppDispatch();
  const isAuthed = useAppSelector(selectIsAuthenticated);

  // Refs so the effect doesn't need to depend on these (avoid reconnect loops).
  const esRef = useRef<EventSource | null>(null);
  const errorCountRef = useRef(0);
  const lastPingRef = useRef<number>(Date.now());
  const watchdogRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthed) return;

    let cancelled = false;

    const cleanup = () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (watchdogRef.current != null) {
        window.clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (pollTimerRef.current != null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const startPollingFallback = () => {
      cleanup();
      if (cancelled) return;
      dispatch(notificationsActions.setStreamStatus("fallback-polling"));

      const poll = async () => {
        if (cancelled) return;
        try {
          await dispatch(fetchNotifications());
        } catch {
          // swallow — keep polling
        }
        if (!cancelled) {
          pollTimerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      };
      void poll();
    };

    const handleNotificationEvent = (event: MessageEvent) => {
      if (cancelled) return;
      lastPingRef.current = Date.now();
      try {
        const raw = JSON.parse(event.data);
        const dto = adaptV2Notification(raw);
        if (dto) dispatch(notificationsActions.appendOne(dto));
      } catch {
        // Malformed event payload — skip silently. Backend metric will catch
        // serialisation drift via notis_* counters.
      }
    };

    const connect = () => {
      if (cancelled) return;
      cleanup();
      dispatch(notificationsActions.setStreamStatus("connecting"));

      // Use absolute API_BASE_URL so EventSource (which doesn't go through
      // axios/fetch) hits the correct origin. `withCredentials: true` sends
      // the session cookie.
      const url = `${API_BASE_URL}/notifications/stream`;
      let es: EventSource;
      try {
        es = new EventSource(url, { withCredentials: true } as EventSourceInit);
      } catch {
        // EventSource constructor itself failed (rare — e.g. invalid URL).
        // Treat as a hard error → go straight to polling.
        startPollingFallback();
        return;
      }
      esRef.current = es;

      es.addEventListener("open", () => {
        if (cancelled) return;
        errorCountRef.current = 0;
        lastPingRef.current = Date.now();
        dispatch(notificationsActions.setStreamStatus("open"));
      });

      es.addEventListener("hello", (event: MessageEvent) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data) as {
            role?: string;
            scope?: number;
          };
          dispatch(
            notificationsActions.setStreamScope({
              role: String(data.role ?? ""),
              scope: Number(data.scope ?? 0),
            })
          );
        } catch {
          // ignore malformed hello — connection still usable
        }
      });

      es.addEventListener("ping", (event: MessageEvent) => {
        if (cancelled) return;
        lastPingRef.current = Date.now();
        let ts = Date.now();
        try {
          const data = JSON.parse(event.data) as { ts?: number };
          if (typeof data.ts === "number") ts = data.ts;
        } catch {
          // use Date.now() fallback
        }
        dispatch(notificationsActions.setLastPingAt(ts));
      });

      // One listener per FeKey event name.
      for (const key of FE_KEY_EVENTS) {
        es.addEventListener(key, handleNotificationEvent as EventListener);
      }
      // Safety net for events the backend may add in future without us
      // updating this list — default `message` handler fires for unnamed
      // events.
      es.addEventListener("message", handleNotificationEvent);

      es.addEventListener("error", () => {
        if (cancelled) return;
        errorCountRef.current += 1;
        dispatch(notificationsActions.setStreamStatus("error"));

        // Close the dead connection before scheduling next action.
        es.close();
        esRef.current = null;

        if (errorCountRef.current >= MAX_ERRORS_BEFORE_FALLBACK) {
          startPollingFallback();
          return;
        }

        const delay = Math.min(
          1000 * Math.pow(2, errorCountRef.current),
          RECONNECT_BACKOFF_MAX_MS
        );
        reconnectTimerRef.current = window.setTimeout(() => {
          if (!cancelled) connect();
        }, delay);
      });

      // Watchdog: if no ping/event for longer than the timeout, force a
      // reconnect. Catches half-open TCP sockets, proxy buffering bugs, etc.
      watchdogRef.current = window.setInterval(() => {
        if (cancelled) return;
        if (Date.now() - lastPingRef.current > PING_TIMEOUT_MS) {
          // Treat as an error: bump counter, reconnect (or fallback if too many).
          errorCountRef.current += 1;
          if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
          }
          if (errorCountRef.current >= MAX_ERRORS_BEFORE_FALLBACK) {
            startPollingFallback();
            return;
          }
          connect();
        }
      }, WATCHDOG_INTERVAL_MS);
    };

    // Fetch initial snapshot via REST so the UI has something to render before
    // the first SSE event arrives. Then open the stream.
    void dispatch(fetchNotifications());
    connect();

    return () => {
      cancelled = true;
      cleanup();
      dispatch(notificationsActions.setStreamStatus("idle"));
    };
  }, [dispatch, isAuthed]);
}
