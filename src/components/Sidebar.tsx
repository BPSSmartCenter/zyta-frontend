import React, { useEffect, useMemo, useState, useRef } from "react";
import { brandImage, sidebarIcon } from "../assets/index";
import SearchInput from "./SearchInput";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import { useNavigate } from "react-router-dom";

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

  // mobile toggle
  const [openMobile, setOpenMobile] = useState(false);

  // used-space dismiss -> shift support/settings down after dismiss
  const [showUsedSpace, setShowUsedSpace] = useState(true);
  const usedRef = useRef<HTMLDivElement>(null);
  const [usedHeight, setUsedHeight] = useState(0);
  const handleDismissUsed = () => {
    const h = usedRef.current?.offsetHeight ?? 0;
    setUsedHeight(h);
    setShowUsedSpace(false);
  };

  // logout modal
  const [logoutOpen, setLogoutOpen] = useState(false);
  const handleConfirmLogout = () => {
    // TODO: put real signout logic here
    console.log("SIGNED OUT");
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
          <header className="p-4 flex items-center gap-x-2">
            <img
              src={brandImage}
              alt={t("aria.brandAlt")}
              width={70}
              height={70}
              className="block select-none cursor-pointer"
              onClick={() => navigate("/dashboard")}
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
                  <li className="mx-2 my-2">
                    <SearchInput
                      placeholder={t("search.placeholder")}
                      className="mb-4"
                    />
                  </li>

                  {/* Home */}
                  <li className="hs-accordion" id="home-accordion">
                    <button
                      type="button"
                      className="hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-hidden cursor-pointer"
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
                      {t("home.title")}
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
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("home.links.l1")}
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("home.links.l2")}
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("home.links.l3")}
                          </a>
                        </li>
                      </ul>
                    </div>
                  </li>

                  {/* Dashboard */}
                  <li className="hs-accordion" id="dashboard-accordion">
                    <button
                      type="button"
                      className="hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-hidden cursor-pointer"
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
                        className="lucide lucide-chart-no-axes-column"
                      >
                        <path d="M5 21v-6" />
                        <path d="M12 21V3" />
                        <path d="M19 21V9" />
                      </svg>
                      {t("dashboard.title")}
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
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("dashboard.devices")}
                          </a>
                        </li>
                        <li>
                          <a className="w-full flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-hidden cursor-pointer">
                            {t("dashboard.map")}
                            <span className="ms-auto py-0.5 px-1.5 inline-flex items-center gap-x-1.5 text-xs bg-gray-200 text-gray-800 rounded-full">
                              {t("dashboard.mapCountLabel", { count: 10 })}
                            </span>
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("dashboard.tradeHistory")}
                          </a>
                        </li>
                      </ul>
                    </div>
                  </li>

                  {/* Projects */}
                  <li className="hs-accordion" id="project-accordion">
                    <button
                      type="button"
                      className="hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-hidden cursor-pointer"
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
                        className="lucide lucide-layers"
                      >
                        <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
                        <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
                        <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
                      </svg>
                      {t("projects.title")}
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
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("projects.links.l1")}
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("projects.links.l2")}
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("projects.links.l3")}
                          </a>
                        </li>
                      </ul>
                    </div>
                  </li>

                  {/* Tasks */}
                  <li className="hs-accordion" id="task-accordion">
                    <button
                      type="button"
                      className="hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-hidden cursor-pointer"
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
                        className="lucide lucide-square-check-big"
                      >
                        <path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344" />
                        <path d="m9 11 3 3L22 4" />
                      </svg>
                      {t("tasks.title")}
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
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("tasks.links.l1")}
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("tasks.links.l2")}
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("tasks.links.l3")}
                          </a>
                        </li>
                      </ul>
                    </div>
                  </li>

                  {/* Reporting */}
                  <li className="hs-accordion" id="report-accordion">
                    <button
                      type="button"
                      className="hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-hidden cursor-pointer"
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
                        className="lucide lucide-flag"
                      >
                        <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" />
                      </svg>
                      {t("reporting.title")}
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
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("reporting.links.l1")}
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("reporting.links.l2")}
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("reporting.links.l3")}
                          </a>
                        </li>
                      </ul>
                    </div>
                  </li>

                  {/* Users */}
                  <li className="hs-accordion" id="users-accordion">
                    <button
                      type="button"
                      className="hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-hidden cursor-pointer"
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
                      {t("users.title")}
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
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("users.links.l1")}
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("users.links.l2")}
                          </a>
                        </li>
                        <li>
                          <a className="block py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">
                            {t("users.links.l3")}
                          </a>
                        </li>
                      </ul>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* ===== Footer inside sidebar ===== */}
            <footer className="mt-auto bg-white border-t border-gray-200 pt-2">
              {/* Support + Settings — shift down AFTER dismiss */}
              <div
                className="px-2 pb-2 space-y-1 transition-all duration-300"
                style={{ marginTop: showUsedSpace ? 0 : usedHeight }}
              >
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
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9A1.65 1.65 0 0 0 10 3V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 .33 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .65.39 1.24 1 1.51H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                  </svg>
                  <span>{t("footer.setting")}</span>
                </a>
              </div>

              {/* Used space (dismissible) */}
              {showUsedSpace && (
                <div
                  ref={usedRef}
                  className="mx-2 mb-2 rounded-lg border border-gray-200 p-3"
                >
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

              {/* Account → sign out button */}
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
                      Olivia Rhye
                    </p>
                    <p className="text-xs text-gray-500">
                      olivia@untitledui.com
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
      {/* ===== end Sidebar container ===== */}

      {/* Logout confirm modal (OUTSIDE sidebar) */}
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

      {/* Main content (pushed on desktop) */}
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
