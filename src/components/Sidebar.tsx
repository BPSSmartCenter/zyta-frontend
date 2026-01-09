import React, { useEffect, useMemo, useState } from "react";
import { brandImage, sidebarIcon, userIcon } from "../assets/index";
import SearchInput from "./SearchInput";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import { useNavigate, useLocation } from "react-router-dom";
import { me as mockMe } from "../data/Dashboard/auth";
import { logout as mockLogout } from "../data/Dashboard/auth";
import { useUserPath } from "../routes/useUserPath";
import { logout as apiLogout } from "../api/auth";
import { me as apiMe } from "../api/user";
import { useDeviceInventory, getCountForType } from "../context/DeviceInventoryContext";

const DISABLED_DEVICE_TYPES = new Set<string>(["cctv"]);
const MASTER_EMAIL = "smartechcenter@bpstechthai.com";

/** breakpoint hook */
function useIsDesktop1024() {
  const get = () =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false;
  const [isDesktop, setIsDesktop] = useState<boolean>(get);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return isDesktop;
}

type Props = {
  children?: React.ReactNode;
  contentClassName?: string;
};

export default function Sidebar({ children, contentClassName = "" }: Props) {
  const isDesktop = useIsDesktop1024();
  const { t } = useTranslation("sidebar");
  const navigate = useNavigate();
  const location = useLocation();
  const { abs, base, absSite } = useUserPath();
  const goSiteOrGlobal = (path: string) => {
    const scMatch = location.pathname.match(/\/site\/([^\/]+)/);
    const sc = scMatch?.[1];
    if (sc) return navigate(absSite(path, sc));
    return navigate(abs(path));
  };

  const [account, setAccount] = useState<{
    name: string;
    email: string;
    role?: "admin" | "officer" | "user";
  } | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await apiMe();
        if (!mounted || !u) return;
        const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
        const fallback = u.email.split("@")[0];
        setAccount({ name: fullName || fallback, email: u.email, role: u.role as any });
        return;
      } catch {
        const u = mockMe();
        if (!mounted || !u) {
          setAccount(null);
          return;
        }
        const fullName = [
          (u as any).firstName as string | undefined,
          (u as any).lastName as string | undefined,
        ]
          .filter((v) => typeof v === "string" && String(v).trim().length > 0)
          .join(" ");
        const fallback = u.email.split("@")[0];
        setAccount({ name: fullName || fallback, email: u.email, role: (u as any).role as any });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // mobile toggle
  const [openMobile, setOpenMobile] = useState(false);

  // ===== Search state (filters menu realtime) =====
  const [searchQ, setSearchQ] = useState("");

  // // used-space dismiss (footer package)
  // const [showUsedSpace, setShowUsedSpace] = useState(true);
  // const handleDismissUsed = () => setShowUsedSpace(false); // ยุบจริง ไม่เหลือช่องว่าง

  // logout modal
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [siteAlertOpen, setSiteAlertOpen] = useState(false);
  const handleConfirmLogout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      /* ignore */
    }
    try {
      mockLogout();
    } catch (e) {
      /* ignore */
    }
    setLogoutOpen(false);
    navigate("/", { replace: true });
  };

  // preline init
  useEffect(() => {
    // @ts-ignore
    window?.HSStaticMethods?.autoInit?.();
  }, []);

  // reset overlay/backdrop when switching breakpoints
  useEffect(() => {
    if (isDesktop) {
      setOpenMobile(false);
      document
        .querySelectorAll<HTMLElement>(".hs-overlay-backdrop")
        .forEach((b) => b.remove());
      document.body.classList.remove(
        "hs-overlay-open",
        "hs-overlay-body-open",
        "overflow-hidden"
      );
      document.documentElement.classList.remove("hs-overlay-open");
    } else {
      setOpenMobile(false);
    }
  }, [isDesktop]);

  // Route-aware: กลับ /dashboard ให้พับ dropdown ทั้งหมด
  useEffect(() => {
    const pathNoBase = location.pathname.startsWith(base)
      ? location.pathname.slice(base.length) || "/"
      : location.pathname;
    const pathScoped = pathNoBase.replace(/^\/site\/[^/]+/, "");
    if (pathScoped === "/dashboard") {
      document.querySelectorAll<HTMLElement>(".hs-accordion").forEach((acc) => {
        acc.classList.remove("active");
        const content = acc.querySelector<HTMLElement>(".hs-accordion-content");
        if (content) {
          content.style.height = "0px";
          content.classList.add("hidden");
        }
      });
    }
  }, [location.pathname, base]);

  // เปิด dropdown อัตโนมัติสำหรับ Alert และ Devices
  useEffect(() => {
    const openAccordion = (id: string) => {
      const acc = document.getElementById(id);
      if (!acc) return;
      acc.classList.add("active");
      const content = acc.querySelector<HTMLElement>(".hs-accordion-content");
      if (content) {
        content.classList.remove("hidden");
        content.style.height = content.scrollHeight + "px";
        setTimeout(() => {
          content.style.height = "auto";
        }, 300);
      }
    };
    const pathNoBase = location.pathname.startsWith(base)
      ? location.pathname.slice(base.length) || "/"
      : location.pathname;
    const pathScoped = pathNoBase.replace(/^\/site\/[^/]+/, "");
    if (pathScoped.startsWith("/alert")) openAccordion("alert-accordion");
    if (pathScoped.startsWith("/devices")) openAccordion("devices-accordion");
  }, [location.pathname, base]);

  // sidebar open logic will be computed after we know the route

  // no need translate button; we hide it when open

  // helper: navigate + close on mobile
  const go = (path: string) => {
    navigate(abs(path));
    if (!isDesktop || /* collapse on dashboard even desktop */ (typeof window !== "undefined")) {
      // collapseMode is computed later but available at runtime in closure
      // @ts-ignore
      if (!isDesktop || (typeof collapseMode !== "undefined" && collapseMode)) setOpenMobile(false);
    }
  };

  // ===== active helpers for highlight =====
  const cx = (...classes: (string | false | null | undefined)[]) =>
    classes.filter(Boolean).join(" ");

  const url = new URLSearchParams(location.search);
  const pathNoBase = location.pathname.startsWith(base)
    ? location.pathname.slice(base.length) || "/"
    : location.pathname;
  const pathScoped = pathNoBase.replace(/^\/site\/[^/]+/, "");

  // collapse only on Dashboard page
  const collapseMode = pathScoped === "/dashboard";
  const isOpen = isDesktop ? (collapseMode ? openMobile : true) : openMobile;

  const sidebarClass = useMemo(() => {
    const baseCls =
      "w-64 h-full fixed top-0 left-0 z-60 bg-white border-e border-gray-200 transition-transform duration-300";
    return `${baseCls} ${isOpen ? "translate-x-0" : "-translate-x-full"}`;
  }, [isOpen]);
  const active = {
    home: pathScoped === "/dashboard",
    billing: pathScoped.startsWith("/electric"),
    billingPage: (k: "dashboard" | "billing") =>
      (k === "dashboard" && pathScoped === "/electric") ||
      (k === "billing" && pathScoped.startsWith("/electric/meter")),
    alert: pathScoped.startsWith("/alert"),
    alertEvent: (k: string) =>
      pathScoped.startsWith("/alert") && url.get("event") === k,
    facerec: pathScoped.startsWith("/facerec"),
    devices: pathScoped.startsWith("/devices"),
    devicesType: (k: string) =>
      pathScoped.startsWith("/devices") && url.get("type") === k,
    usermanage: pathScoped.startsWith("/usermanage"),
    sitemanage: pathScoped.startsWith("/sitemanage"),
  };
  // =======================================
  const { counts: inventoryCounts } = useDeviceInventory();

  return (
    <div className="relative">
      {/* Toggle button */}
      {collapseMode ? (
        !isOpen && (
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            aria-label={t("aria.toggleSidebar")}
            className="fixed bottom-4 left-4 z-[70] inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-gray-200 hover:bg-gray-100 cursor-pointer shadow-md"
          >
            <img src={userIcon} alt={t("aria.toggleSidebar")} className="w-6 h-6" />
          </button>
        )
      ) : (
        !isDesktop && (
          <button
            type="button"
            onClick={() => setOpenMobile((v) => !v)}
            aria-label={t("aria.toggleSidebar")}
            className="lg-1024:hidden fixed top-3 left-3 z-[70] inline-flex items-center justify-center size-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 cursor-pointer shadow"
          >
            <img src={sidebarIcon} alt={t("aria.toggleSidebar")} className="size-5" />
          </button>
        )
      )}

      {/* Backdrop for overlay click-close */}
      {((collapseMode && isOpen) || (!collapseMode && !isDesktop && openMobile)) && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpenMobile(false)}
          aria-hidden="true"
        />
      )}

      {/* ===== Sidebar container ===== */}
      <div className={sidebarClass} aria-label={t("aria.sidebarLabel")}>
        <div className="relative flex flex-col h-full max-h-full">
          {/* Header */}
          <header className="p-4 flex flex-col items-center gap-x-2">
            <img
              src={brandImage}
              alt={t("aria.brandAlt")}
              width={70}
              height={70}
              className="block select-none cursor-pointer"
              onClick={() => go("/dashboard")}
            />

            {/* Search filters menu in realtime */}
            <SearchInput
              value={searchQ}
              onChange={setSearchQ}
              placeholder={t("search.placeholder")}
              className="mb-4 w-full"
              disableMenu={true}
            />
          </header>

          {/* Body (scroll) + Footer (stick to bottom) */}
          <nav className="flex-1 min-h-0 flex flex-col">
            {/* Scroll area for menus */}
            <div
              className="flex-1 min-h-0 overflow-y-auto
              [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-track]:bg-gray-100
              [&::-webkit-scrollbar-thumb]:bg-gray-300"
            >
              <div
                className="hs-accordion-group pb-0 px-2 w-full flex flex-col flex-wrap"
                data-hs-accordion-always-open
              >
                <ul className="space-y-1">
                  {/* ===== หน้าแรก / Home ===== */}
                  {(() => {
                    const label = t("menu.home", { defaultValue: "หน้าแรก" });
                    const q = searchQ.trim().toLowerCase();
                    const show = !q || label.toLowerCase().includes(q);
                    if (!show) return null;
                    return (
                      <li>
                        <button
                          type="button"
                          onClick={() => go("/dashboard")}
                          className={cx(
                            "w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg focus:outline-hidden cursor-pointer",
                            active.home
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-800 hover:bg-gray-100"
                          )}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-house"
                          >
                            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
                            <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          </svg>
                          <span>{label}</span>
                        </button>
                      </li>
                    );
                  })()}

                  {/* ===== การแจ้งเตือน / Notification (Dropdown) ===== */}
                  {(() => {
                    const headerLabel = t("menu.notification", { defaultValue: "การแจ้งเตือน" });
                    const q = searchQ.trim().toLowerCase();
                    const items = [
                      { key: "fire", label: t("menu.alerts_fire", { defaultValue: "ตรวจพบไฟไหม้" }) },
                      { key: "motion", label: t("menu.alerts_motion", { defaultValue: "ตรวจพบการเคลื่อนไหว" }) },
                      { key: "offline", label: t("menu.alerts_offline", { defaultValue: "จำนวนกล้อง" }) },
                      { key: "fall", label: t("menu.alerts_fall", { defaultValue: "ตรวจพบการล้ม" }) },
                      { key: "sleep", label: t("menu.alerts_sleep", { defaultValue: "ตรวจพบนอนหลับ" }) },
                    ];
                    const matchedItems = !q ? items : items.filter((it) => it.label.toLowerCase().includes(q));
                    const showSection = !q || headerLabel.toLowerCase().includes(q) || matchedItems.length > 0;
                    if (!showSection) return null;
                    const forceOpen = !!q;
                    return (
                      <li className={cx("hs-accordion", forceOpen && "active")} id="alert-accordion">
                        <button
                          type="button"
                          className={cx(
                            "hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg focus:outline-hidden cursor-pointer",
                            active.alert
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-800 hover:bg-gray-100"
                          )}
                        >
                          {/* bell icon */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="19"
                            height="19"
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
                          <span>{headerLabel}</span>

                          <svg
                            className="hs-accordion-active:block ms-auto hidden size-4 text-gray-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="m18 15-6-6-6 6" />
                          </svg>
                          <svg
                            className="hs-accordion-active:hidden ms-auto block size-4 text-gray-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>

                        <div className={["hs-accordion-content w-full overflow-hidden transition-[height] duration-300", q ? "" : "hidden"].join(" ")} style={q ? { height: "auto" } : undefined}>
                          <ul className="pt-1 ps-7 space-y-1">
                            {matchedItems.map((it) => (
                              <li key={it.key}>
                                <a
                                  onClick={() => go(`/alert?event=${it.key}`)}
                                  className={cx(
                                    "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                                    active.alertEvent(it.key)
                                      ? "bg-gray-100 text-gray-900"
                                      : "hover:bg-gray-100"
                                  )}
                                >
                                  {it.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    );
                  })()}

                  {/* ===== การจดจำใบหน้า / Face Regconize (ลิงก์เดี่ยว → /facerec) ===== */}
                  {(() => {
                    const label = t("menu.facerec", { defaultValue: "การจดจำใบหน้า" });
                    const q = searchQ.trim().toLowerCase();
                    const show = !q || label.toLowerCase().includes(q);
                    if (!show) return null;
                    return (
                      <li>
                        <button
                          type="button"
                          onClick={() => go("/facerec")}
                          className={cx(
                            "w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg focus:outline-hidden cursor-pointer",
                            active.facerec
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-800 hover:bg-gray-100"
                          )}
                        >
                          {/* user icon */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-user-icon lucide-user"
                          >
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>{label}</span>
                        </button>
                      </li>
                    );
                  })()}

                  {/* ===== อุปกรณ์ / Devices (Dropdown) ===== */}
                  {(() => {
                    const headerLabel = t("menu.devices", { defaultValue: "อุปกรณ์" });
                    const q = searchQ.trim().toLowerCase();
                    const items = [
                      { key: "cctv", label: t("menu.devices_cctv", { defaultValue: "CCTV" }) },
                      { key: "watermeter", label: t("menu.devices_watermeter", { defaultValue: "Water Meter" }) },
                      { key: "electricmeter", label: t("menu.devices_electricmeter", { defaultValue: "Electric Meter" }) },
                      { key: "airsensor", label: t("menu.devices_airsensor", { defaultValue: "Air Sensor" }) },
                      { key: "iot", label: t("menu.devices_iot", { defaultValue: "IoT" }) },
                      { key: "caregiver", label: t("menu.devices_caregiver", { defaultValue: "Caregiver" }) },
                      { key: "digitaltwin", label: t("menu.devices_digitaltwin", { defaultValue: "Digital Twin" }) },
                    ] as const;
                    const matched = !q ? items : items.filter((it) => it.label.toLowerCase().includes(q));
                    const showSection = !q || headerLabel.toLowerCase().includes(q) || matched.length > 0;
                    if (!showSection) return null;
                    const forceOpen = !!q;
                    return (
                      <li className={cx("hs-accordion", forceOpen && "active")} id="devices-accordion">
                        <button
                          type="button"
                          className={cx(
                            "hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg focus:outline-hidden cursor-pointer",
                            active.devices
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-800 hover:bg-gray-100"
                          )}
                        >
                          {/* CCTV-ish icon */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-cctv-icon lucide-cctv"
                          >
                            <path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97" />
                            <path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z" />
                            <path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15" />
                            <path d="M2 21v-4" />
                            <path d="M7 9h.01" />
                          </svg>
                          <span>{headerLabel}</span>

                          <svg
                            className="hs-accordion-active:block ms-auto hidden size-4 text-gray-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="m18 15-6-6-6 6" />
                          </svg>
                          <svg
                            className="hs-accordion-active:hidden ms-auto block size-4 text-gray-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>

                        <div className={["hs-accordion-content w-full overflow-hidden transition-[height] duration-300", q ? "" : "hidden"].join(" ")} style={q ? { height: "auto" } : undefined}>
                          <ul className="pt-1 ps-7 space-y-1">
                            {matched.map((it) => {
                              const zero = getCountForType(inventoryCounts as any, it.key as any) <= 0;
                              const hardDisabled = DISABLED_DEVICE_TYPES.has(it.key);
                              const isExternal = it.key === "iot" || it.key === "caregiver" || it.key === "digitaltwin";
                              const disabled = (!isExternal && zero) || hardDisabled;
                              return (
                                <li key={it.key}>
                                  <a
                                    aria-disabled={disabled}
                                    onClick={() => {
                                      if (disabled) return;
                                      if (it.key === "caregiver") {
                                        window.open("http://45.136.253.176:3000/", "_blank");
                                        return;
                                      }
                                      if (it.key === "digitaltwin") {
                                        window.open("https://bpstech.online/login", "_blank");
                                        return;
                                      }
                                      goSiteOrGlobal(`/devices?type=${it.key}`);
                                    }}
                                    className={cx(
                                      "block py-2 px-2.5 text-sm rounded-lg",
                                      disabled
                                        ? "opacity-40 cursor-not-allowed pointer-events-none"
                                        : "cursor-pointer",
                                      active.devicesType(it.key)
                                        ? "bg-gray-100 text-gray-900"
                                        : disabled
                                          ? ""
                                          : "hover:bg-gray-100"
                                    )}
                                  >
                                    {it.label}
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </li>
                    );
                  })()}

                  {/* ===== การจัดการผู้ใช้ / User Management (super admin only) ===== */}
                  {String(account?.email || "").toLowerCase() === MASTER_EMAIL &&
                    (() => {
                      const label = t("menu.user_management", {
                        defaultValue: "การจัดการผู้ใช้",
                      });
                      const q = searchQ.trim().toLowerCase();
                      const show = !q || label.toLowerCase().includes(q);
                      if (!show) return null;
                      return (
                        <li>
                          <button
                            type="button"
                            onClick={() => go("/usermanage")}
                            className={cx(
                              "w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg focus:outline-hidden cursor-pointer",
                              active.usermanage
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-800 hover:bg-gray-100"
                            )}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="19"
                              height="19"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-users"
                            >
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <path d="M16 3.128a4 4 0 0 1 0 7.744" />
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                              <circle cx="9" cy="7" r="4" />
                            </svg>
                            <span>{label}</span>
                          </button>
                        </li>
                      );
                    })()}

                  {String(account?.email || "").toLowerCase() === MASTER_EMAIL &&
                    (() => {
                      const label = t("menu.site_management", {
                        defaultValue: "การจัดการไซต์",
                      });
                      const q = searchQ.trim().toLowerCase();
                      const show = !q || label.toLowerCase().includes(q);
                      if (!show) return null;
                      return (
                        <li>
                          <button
                            type="button"
                            onClick={() => go("/sitemanage")}
                            className={cx(
                              "w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg focus:outline-hidden cursor-pointer",
                              active.sitemanage
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-800 hover:bg-gray-100"
                            )}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="19"
                              height="19"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 22c-4.7-4.7-7.5-8.8-7.5-12.5a7.5 7.5 0 1 1 15 0c0 3.7-2.8 7.8-7.5 12.5Z" />
                              <circle cx="12" cy="8.5" r="2.8" />
                            </svg>
                            <span>{label}</span>
                          </button>
                        </li>
                      );
                    })()}
                </ul>
              </div>
            </div>

            {/* ===== Footer inside sidebar ===== */}
            <footer className="mt-auto bg-white border-t border-gray-200 pt-2">
              <div className="px-2 pb-2 space-y-1">
                <a className="flex items-center gap-x-3 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                    <path d="M4.93 4.93 7.76 7.76M16.24 16.24l2.83 2.83M16.24 7.76l2.83-2.83M4.93 19.07l2.83-2.83" />
                  </svg>
                  <span>{t("footer.support")}</span>
                </a>
                <a className="flex items-center gap-x-3 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-settings-icon lucide-settings"
                  >
                    <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>{t("footer.setting")}</span>
                </a>
              </div>

              {/* {showUsedSpace && (
                <div className="mx-2 mb-2 rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-medium text-gray-800">
                    {t("footer.useSpace")}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-gray-500">
                    {t("footer.desc", { percent: 80 })}
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full w-[80%] bg-sky-500" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <button
                      onClick={handleDismissUsed}
                      className="text-[#535862] hover:underline hover:cursor-pointer"
                    >
                      {t("footer.dissmiss")}
                    </button>
                    <button className="text-sky-600 hover:underline font-medium hover:cursor-pointer">
                      {t("footer.upgrade")}
                    </button>
                  </div>
                </div>
              )} */}

              {/* Account → sign out */}
              <div className="px-2 pb-2">
                <button
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  className="w-full inline-flex items-center gap-x-2 p-2 rounded-md hover:bg-gray-100 focus:outline-hidden"
                  aria-label={t("account.logout")}
                >
                  <img
                    className="size-6 rounded-full"
                    src={userIcon}
                    alt="Avatar"
                  />
                  <div className="flex-1 text-left">
                    <p className="text-sm text-gray-800 font-medium leading-none">
                      {account?.name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {account?.email ?? ""}
                    </p>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="gray"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-log-out cursor-pointer"
                  >
                    <path d="m16 17 5-5-5-5" />
                    <path d="M21 12H9" />
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  </svg>
                </button>
              </div>
            </footer>
          </nav>
        </div>
      </div>

      {/* Logout confirm modal */}
      <Modal
        open={logoutOpen}
        id="logout-confirm"
        icon="warning"
        title={t("logout.title", { defaultValue: "Sign out" })}
        message={t("logout.message", {
          defaultValue: "Are you sure you want to sign out?",
        })}
        onClose={() => setLogoutOpen(false)}
        confirmLabel={t("actions.signOut", { defaultValue: "Sign out" })}
        cancelLabel={t("actions.cancel", { defaultValue: "Cancel" })}
        onConfirm={handleConfirmLogout}
      />
      <Modal
        open={siteAlertOpen}
        id="site-required"
        icon="cancel"
        title="กรุณาเลือก Site ก่อนใช้งาน"
        message="โปรดเลือก Site จากเมนูด้านบน (Navbar) เพื่อใช้งานเมนูการคำนวณค่าไฟ"
        closeLabel="โอเค"
        onClose={() => setSiteAlertOpen(false)}
      />

      {/* Main content */}
      <div
        className={[
          "min-h-160 bg-white transition-all duration-300",
          // keep margin on desktop unless in dashboard collapse + closed state
          isDesktop && !(collapseMode && !isOpen) ? "lg-1024:ms-64" : "",
          contentClassName,
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
