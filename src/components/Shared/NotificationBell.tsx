// src/components/Shared/NotificationBell.tsx
//
// Reusable bell + unread badge + dropdown. Reads from the new
// `notifications` slice (SSE-backed) and dispatches mark-seen/mark-read
// thunks. Drop into any Navbar's right-hand action area.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationSeen,
  selectLastSeenAt,
  selectRecentNotifications,
  selectStreamStatus,
  selectUnreadCount,
} from "../../features/notifications";
import type {
  NotificationDTO,
  Severity,
} from "../../features/notifications";

const MAX_PREVIEW_ITEMS = 20;

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
};

function formatRelative(iso: string, t: (key: string, opts?: object) => string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return t("navbar.bell.justNow", { defaultValue: "just now" });
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t("navbar.bell.minutesAgo", { defaultValue: "{{n}}m ago", n: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("navbar.bell.hoursAgo", { defaultValue: "{{n}}h ago", n: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return t("navbar.bell.daysAgo", { defaultValue: "{{n}}d ago", n: diffDay });
  return new Date(iso).toLocaleDateString();
}

function NotificationRow({
  item,
  onClick,
}: {
  item: NotificationDTO;
  onClick: (item: NotificationDTO) => void;
}) {
  const { t } = useTranslation("dashboard");
  const subtitle = item.site?.name ?? item.device?.model ?? "";
  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(item)}
        className={`w-full text-left flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
          item.read.isRead ? "opacity-70" : "bg-blue-50/40"
        }`}
      >
        <span
          className={`mt-1 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
            SEVERITY_DOT[item.severity] ?? "bg-gray-400"
          }`}
          aria-hidden="true"
        />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-gray-900 truncate">
            {item.title}
          </span>
          {subtitle ? (
            <span className="block text-xs text-gray-500 truncate">{subtitle}</span>
          ) : null}
        </span>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatRelative(item.occurredAt, t)}
        </span>
      </button>
    </li>
  );
}

export default function NotificationBell() {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();

  const unreadCount = useAppSelector(selectUnreadCount);
  const lastSeenAt = useAppSelector(selectLastSeenAt);
  const streamStatus = useAppSelector(selectStreamStatus);
  const recentSelector = useMemo(
    () => selectRecentNotifications(MAX_PREVIEW_ITEMS),
    []
  );
  const items = useAppSelector(recentSelector);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const seenAtOpenRef = useRef<string | null>(null);

  // Bell red dot semantics: any item newer than lastSeenAt is "new since
  // last bell glance." Falls back to unreadCount when we have no lastSeenAt
  // yet (fresh login).
  const hasNewSinceSeen = useMemo(() => {
    if (lastSeenAt == null) return unreadCount > 0;
    return items.some((n) => n.occurredAt > lastSeenAt);
  }, [items, lastSeenAt, unreadCount]);

  const badgeText = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 9 ? "9+" : String(unreadCount);
  }, [unreadCount]);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Fire mark-seen the first time the user opens the panel in this session
  // for the current lastSeenAt. Repeated opens without new content don't
  // pester the backend.
  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next && hasNewSinceSeen && seenAtOpenRef.current !== lastSeenAt) {
        seenAtOpenRef.current = lastSeenAt;
        void dispatch(markNotificationSeen());
      }
      return next;
    });
  }, [dispatch, hasNewSinceSeen, lastSeenAt]);

  const handleRowClick = useCallback(
    (item: NotificationDTO) => {
      if (!item.read.isRead) {
        void dispatch(markNotificationRead(item.id));
      }
    },
    [dispatch]
  );

  const handleMarkAllRead = useCallback(() => {
    if (unreadCount > 0) void dispatch(markAllNotificationsRead());
  }, [dispatch, unreadCount]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative justify-center items-center hover:cursor-pointer"
        aria-label={t("navbar.notifications", { defaultValue: "Notifications" })}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("navbar.notifications", { defaultValue: "Notifications" })}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-bell-icon lucide-bell"
          aria-hidden="true"
        >
          <path d="M10.268 21a2 2 0 0 0 3.464 0" />
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
        </svg>
        {badgeText != null ? (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-semibold text-white ${
              hasNewSinceSeen ? "bg-red-500" : "bg-gray-400"
            }`}
            aria-hidden="true"
          >
            {badgeText}
          </span>
        ) : null}
        <span className="sr-only">
          {unreadCount > 0
            ? t("navbar.bell.unreadAria", {
                defaultValue: "{{n}} unread notifications",
                n: unreadCount,
              })
            : t("navbar.notifications", { defaultValue: "Notifications" })}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full mt-3 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden z-50"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {t("navbar.notifications", { defaultValue: "Notifications" })}
              </span>
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  streamStatus === "open"
                    ? "bg-emerald-500"
                    : streamStatus === "connecting"
                      ? "bg-amber-400 animate-pulse"
                      : streamStatus === "fallback-polling"
                        ? "bg-amber-500"
                        : "bg-gray-300"
                }`}
                title={streamStatus}
                aria-hidden="true"
              />
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              {t("navbar.bell.markAllRead", { defaultValue: "Mark all read" })}
            </button>
          </header>

          <ul className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-400">
                {t("navbar.bell.empty", { defaultValue: "No notifications yet" })}
              </li>
            ) : (
              items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onClick={handleRowClick}
                />
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
