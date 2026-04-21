// src/components/SiteSelection/SiteSelectionModal.tsx
//
// Modal สำหรับบังคับเลือกไซต์ก่อนเข้าใช้งาน
// - forced mode: ไม่สามารถปิดด้วย Esc/backdrop/✕ ได้
// - manual mode: ปิดได้ตามปกติ
// - forced mode เลือกไซต์แล้ว modal จะปิดอัตโนมัติ
// - manual mode เลือกไซต์แล้วคง modal ไว้จนกดปิดเอง
//
// Visual theme อ้างอิง AuthPageShell + SiteDropdownGrouped
//   primary dark: #123A42, accent: #3AB8EE, action: #0063bf

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectAccessibleSites,
  selectIsSitePickerOpen,
  selectSelectedSite,
  selectSitePickerReason,
  siteSelectionActions,
} from "../../features/siteSelection";
import { selectAuthUser } from "../../features/auth";
import SiteSelectionList from "./SiteSelectionList";
import { buildHierarchyTree, filterHierarchy } from "./siteTree";

type Props = {
  /**
   * ถ้า true: mount modal แม้ยัง closed (สำหรับ transition ในอนาคต)
   * default: false — unmount ทันทีเมื่อปิด
   */
  alwaysMounted?: boolean;
};

export default function SiteSelectionModal({ alwaysMounted = false }: Props) {
  const { t } = useTranslation(["dashboard"]);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const isOpen = useAppSelector(selectIsSitePickerOpen);
  const reason = useAppSelector(selectSitePickerReason);
  const sites = useAppSelector(selectAccessibleSites);
  const selected = useAppSelector(selectSelectedSite);
  const user = useAppSelector(selectAuthUser);

  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const isForced = reason === "forced";

  const syncScopedDashboardPath = (value: string) => {
    const match = location.pathname.match(/^(\/u\/[^/]+)\/site\/[^/]+(\/.*)?$/);
    if (!match) return;
    const basePath = match[1];
    const suffix = match[2] || "/dashboard";
    const pathname =
      value === "all"
        ? `${basePath}${suffix}`
        : `${basePath}/site/${encodeURIComponent(value)}${suffix}`;
    if (pathname !== location.pathname) {
      navigate({ pathname, search: location.search }, { replace: true });
    }
  };

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Esc handling — ปิดได้เฉพาะ manual
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isForced) {
        dispatch(siteSelectionActions.closePicker());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, isForced, dispatch]);

  // Clear query ตอนเปิดใหม่
  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  const allSitesLabel = t("navbar.allSites", { defaultValue: "All Sites" });

  const tree = useMemo(() => buildHierarchyTree(sites), [sites]);
  const filteredTree = useMemo(() => filterHierarchy(tree, query), [tree, query]);

  const filteredCount = useMemo(() => {
    const u = filteredTree.utilities.reduce(
      (sum, ut) =>
        sum +
        ut.ungroupedSites.length +
        ut.groups.reduce((s, g) => s + g.sites.length, 0),
      0
    );
    const og = filteredTree.orphanGroups.reduce((sum, g) => sum + g.sites.length, 0);
    const ug = filteredTree.ungrouped.length;
    return u + og + ug;
  }, [filteredTree]);

  const handleSelect = (value: string) => {
    dispatch(
      isForced
        ? siteSelectionActions.selectSite(value)
        : siteSelectionActions.selectSiteWithoutClosingPicker(value)
    );
    if (!isForced) syncScopedDashboardPath(value);
  };

  const handleBackdropClick = () => {
    if (!isForced) dispatch(siteSelectionActions.closePicker());
  };

  if (!isOpen && !alwaysMounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-selection-title"
      className={`fixed inset-0 z-[2000] flex items-center justify-center px-4 py-6 ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={handleBackdropClick}
        className={`absolute inset-0 bg-[#123A42]/70 backdrop-blur-sm transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`relative z-10 flex max-h-[calc(100dvh-3rem)] w-full max-w-lg flex-col overflow-hidden rounded-[8px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] transition-all ${
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 pt-6 pb-5">
          <div className="flex-1 min-w-0">
            <h2
              id="site-selection-title"
              className="text-xl font-bold leading-tight text-slate-950"
            >
              {t("siteSelection.title", { defaultValue: "เลือกไซต์" })}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isForced
                ? t("siteSelection.subtitleForced", {
                    defaultValue:
                      user?.firstName
                        ? `ยินดีต้อนรับคุณ ${user.firstName} เลือกไซต์ที่ต้องการดูข้อมูล`
                        : "เลือกไซต์ที่ต้องการดูข้อมูลเพื่อเริ่มต้นใช้งาน",
                  })
                : t("siteSelection.subtitleManual", {
                    defaultValue: "เปลี่ยนไซต์ที่กำลังดูข้อมูลอยู่",
                  })}
            </p>
          </div>
          {!isForced && (
            <button
              type="button"
              onClick={() => dispatch(siteSelectionActions.closePicker())}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <span className="material-icons-outlined text-[22px]">close</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
              search
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("siteSelection.searchPlaceholder", {
                defaultValue: "ค้นหาไซต์, Utility, กลุ่ม…",
              })}
              className="h-11 w-full rounded-[8px] border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15"
              autoFocus
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sites.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* All Sites card — แสดงเสมอถ้ามี >1 ไซต์ */}
              {sites.length > 1 && query.trim() === "" && (
                <AllSitesCard
                  label={allSitesLabel}
                  count={sites.length}
                  active={selected === "all"}
                  onClick={() => handleSelect("all")}
                />
              )}

              {/* Tree */}
              {filteredCount === 0 && query.trim() !== "" ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  {t("siteSelection.noMatch", {
                    defaultValue: "ไม่พบไซต์ที่ตรงกับคำค้นหา",
                  })}
                </div>
              ) : (
                <SiteSelectionList
                  tree={filteredTree}
                  selectedValue={selected}
                  onSelect={handleSelect}
                  autoExpand={query.trim() !== ""}
                />
              )}
            </>
          )}
        </div>

        {/* Footer (manual only) */}
        {!isForced && (
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3">
            <button
              type="button"
              onClick={() => dispatch(siteSelectionActions.closePicker())}
              className="h-10 rounded-md px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              {t("siteSelection.done", { defaultValue: "เสร็จสิ้น" })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────

function AllSitesCard({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-3 flex w-full items-center gap-3 rounded-[8px] border p-4 text-left transition ${
        active
          ? "border-[#3AB8EE] bg-[#3AB8EE]/10"
          : "border-slate-200 bg-white hover:border-[#3AB8EE]/50 hover:bg-[#3AB8EE]/5"
      }`}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-full ${
          active ? "bg-[#3AB8EE] text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        <span className="material-icons-outlined text-[22px]">public</span>
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">
          ดูข้อมูลรวมจากทุกไซต์ ({count} ไซต์)
        </div>
      </div>
      {active && (
        <span className="material-icons-outlined text-[22px] text-[#3AB8EE]">
          check_circle
        </span>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center py-12 text-center">
      <span className="material-icons-outlined text-[40px] text-slate-300">
        domain_disabled
      </span>
      <h3 className="mt-3 text-base font-semibold text-slate-700">
        ไม่พบไซต์ที่สามารถเข้าถึงได้
      </h3>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึงไซต์
      </p>
    </div>
  );
}
