import React, { useEffect, useMemo, useState } from "react";
import { brandImage, sidebarIcon } from "../assets/index";
import SearchInput from "./SearchInput";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import { useNavigate, useLocation } from "react-router-dom";
import { me } from "../data/Dashboard/auth";

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

  const [account, setAccount] = useState<{
    name: string;
    email: string;
  } | null>(null);
  useEffect(() => {
    const u = me();
    if (u) {
      // เดิม ERD ไม่มี full name ใน payload me() → ใช้ email เป็นชื่อชั่วคราว
      // ถ้าอยากโชว์ firstName/lastName ให้ปรับ me() คืนค่าเพิ่มได้ภายหลัง
      setAccount({ name: u.email.split("@")[0], email: u.email });
    } else {
      setAccount(null);
    }
  }, []);

  // mobile toggle
  const [openMobile, setOpenMobile] = useState(false);

  // used-space dismiss (footer package)
  const [showUsedSpace, setShowUsedSpace] = useState(true);
  const handleDismissUsed = () => setShowUsedSpace(false); // ยุบจริง ไม่เหลือช่องว่าง

  // logout modal
  const [logoutOpen, setLogoutOpen] = useState(false);
  const handleConfirmLogout = () => {
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
    if (location.pathname === "/dashboard") {
      document.querySelectorAll<HTMLElement>(".hs-accordion").forEach((acc) => {
        acc.classList.remove("active");
        const content = acc.querySelector<HTMLElement>(".hs-accordion-content");
        if (content) {
          content.style.height = "0px";
          content.classList.add("hidden");
        }
      });
    }
  }, [location.pathname]);

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
    if (location.pathname.startsWith("/alert"))
      openAccordion("alert-accordion");
    if (location.pathname.startsWith("/devices"))
      openAccordion("devices-accordion");
  }, [location.pathname]);

  const sidebarClass = useMemo(() => {
    const base =
      "w-64 h-full fixed top-0 left-0 z-60 bg-white border-e border-gray-200 transition-transform duration-300";
    if (isDesktop) return `${base} translate-x-0`;
    return `${base} ${openMobile ? "translate-x-0" : "-translate-x-full"}`;
  }, [isDesktop, openMobile]);

  const toggleStyle: React.CSSProperties = useMemo(
    () => ({ transform: openMobile ? "translateX(16rem)" : "translateX(0)" }),
    [openMobile]
  );

  // helper: navigate + close on mobile
  const go = (path: string) => {
    navigate(path);
    if (!isDesktop) setOpenMobile(false);
  };

  // ===== active helpers for highlight =====
  const cx = (...classes: (string | false | null | undefined)[]) =>
    classes.filter(Boolean).join(" ");

  const url = new URLSearchParams(location.search);
  const active = {
    home: location.pathname === "/dashboard",
    alert: location.pathname.startsWith("/alert"),
    alertEvent: (k: string) =>
      location.pathname.startsWith("/alert") && url.get("event") === k,
    facerec: location.pathname.startsWith("/facerec"),
    devices: location.pathname.startsWith("/devices"),
    devicesType: (k: string) =>
      location.pathname.startsWith("/devices") && url.get("type") === k,
    usermanage: location.pathname.startsWith("/usermanage"),
  };
  // =======================================

  return (
    <div className="relative">
      {/* Mobile toggle */}
      {!isDesktop && (
        <button
          type="button"
          onClick={() => setOpenMobile((v) => !v)}
          aria-label={t("aria.toggleSidebar")}
          style={toggleStyle}
          className="lg-1024:hidden fixed top-3 left-3 z-[70] inline-flex items-center justify-center size-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 cursor-pointer shadow transition-transform duration-300 will-change-transform"
        >
          <img
            src={sidebarIcon}
            alt={t("aria.toggleSidebar")}
            className="size-5"
          />
        </button>
      )}

      {/* Backdrop for mobile */}
      {!isDesktop && openMobile && (
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

            <SearchInput
              placeholder={t("search.placeholder")}
              className="mb-4"
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
                      <span>{t("menu.home", { defaultValue: "หน้าแรก" })}</span>
                    </button>
                  </li>

                  {/* ===== การแจ้งเตือน / Notification (Dropdown) ===== */}
                  <li className="hs-accordion" id="alert-accordion">
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
                      <span>
                        {t("menu.notification", {
                          defaultValue: "การแจ้งเตือน",
                        })}
                      </span>

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

                    <div className="hs-accordion-content w-full overflow-hidden transition-[height] duration-300 hidden">
                      <ul className="pt-1 ps-7 space-y-1">
                        <li>
                          <a
                            onClick={() => go("/alert?event=fire")}
                            className={cx(
                              "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                              active.alertEvent("fire")
                                ? "bg-gray-100 text-gray-900"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {t("menu.alerts_fire", {
                              defaultValue: "ตรวจพบไฟไหม้",
                            })}
                          </a>
                        </li>
                        <li>
                          <a
                            onClick={() => go("/alert?event=motion")}
                            className={cx(
                              "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                              active.alertEvent("motion")
                                ? "bg-gray-100 text-gray-900"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {t("menu.alerts_motion", {
                              defaultValue: "ตรวจพบการเคลื่อนไหว",
                            })}
                          </a>
                        </li>
                        <li>
                          <a
                            onClick={() => go("/alert?event=offline")}
                            className={cx(
                              "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                              active.alertEvent("offline")
                                ? "bg-gray-100 text-gray-900"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {t("menu.alerts_offline", {
                              defaultValue: "จำนวนกล้อง",
                            })}
                          </a>
                        </li>
                        <li>
                          <a
                            onClick={() => go("/alert?event=fall")}
                            className={cx(
                              "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                              active.alertEvent("fall")
                                ? "bg-gray-100 text-gray-900"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {t("menu.alerts_fall", {
                              defaultValue: "ตรวจพบการล้ม",
                            })}
                          </a>
                        </li>
                        <li>
                          <a
                            onClick={() => go("/alert?event=sleep")}
                            className={cx(
                              "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                              active.alertEvent("sleep")
                                ? "bg-gray-100 text-gray-900"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {t("menu.alerts_sleep", {
                              defaultValue: "ตรวจพบนอนหลับ",
                            })}
                          </a>
                        </li>
                      </ul>
                    </div>
                  </li>

                  {/* ===== การจดจำใบหน้า / Face Regconize (ลิงก์เดี่ยว → /facerec) ===== */}
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
                      <span>
                        {t("menu.facerec", { defaultValue: "การจดจำใบหน้า" })}
                      </span>
                    </button>
                  </li>

                  {/* ===== อุปกรณ์ / Devices (Dropdown) ===== */}
                  <li className="hs-accordion" id="devices-accordion">
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
                      <span>
                        {t("menu.devices", { defaultValue: "อุปกรณ์" })}
                      </span>

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

                    <div className="hs-accordion-content w-full overflow-hidden transition-[height] duration-300 hidden">
                      <ul className="pt-1 ps-7 space-y-1">
                        <li>
                          <a
                            onClick={() => go("/devices?type=cctv")}
                            className={cx(
                              "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                              active.devicesType("cctv")
                                ? "bg-gray-100 text-gray-900"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {t("menu.devices_cctv", { defaultValue: "CCTV" })}
                          </a>
                        </li>
                        <li>
                          <a
                            onClick={() => go("/devices?type=intercom")}
                            className={cx(
                              "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                              active.devicesType("intercom")
                                ? "bg-gray-100 text-gray-900"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {t("menu.devices_intercom", {
                              defaultValue: "Intercom",
                            })}
                          </a>
                        </li>
                        <li>
                          <a
                            onClick={() => go("/devices?type=watermeter")}
                            className={cx(
                              "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                              active.devicesType("watermeter")
                                ? "bg-gray-100 text-gray-900"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {t("menu.devices_watermeter", {
                              defaultValue: "Water Meter",
                            })}
                          </a>
                        </li>
                        <li>
                          <a
                            onClick={() => go("/devices?type=electricmeter")}
                            className={cx(
                              "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                              active.devicesType("electricmeter")
                                ? "bg-gray-100 text-gray-900"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {t("menu.devices_electricmeter", {
                              defaultValue: "Electric Meter",
                            })}
                          </a>
                        </li>
                        <li>
                          <a
                            onClick={() => go("/devices?type=airsensor")}
                            className={cx(
                              "block py-2 px-2.5 text-sm rounded-lg cursor-pointer",
                              active.devicesType("airsensor")
                                ? "bg-gray-100 text-gray-900"
                                : "hover:bg-gray-100"
                            )}
                          >
                            {t("menu.devices_airsensor", {
                              defaultValue: "Air Sensor",
                            })}
                          </a>
                        </li>
                      </ul>
                    </div>
                  </li>

                  {/* ===== การจัดการผู้ใช้ / User Management ===== */}
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
                      <span>
                        {t("menu.user_management", {
                          defaultValue: "การจัดการผู้ใช้",
                        })}
                      </span>
                    </button>
                  </li>
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

              {showUsedSpace && (
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
              )}

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
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=160&h=160&auto=format&fit=facearea&facepad=3"
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

      {/* Main content */}
      <div
        className={[
          "min-h-160 bg-white transition-all duration-300",
          "lg-1024:ms-64",
          contentClassName,
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
