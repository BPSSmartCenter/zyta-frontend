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

import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectAccessibleSites,
  selectIsSitePickerOpen,
  selectSelectedGroup,
  selectSelectedSite,
  selectSelectedUtility,
  selectSitePickerReason,
  siteSelectionActions,
} from "../../features/siteSelection";
import { selectAuthUser } from "../../features/auth";
import SiteCardGrid from "./SiteCardGrid";
import { buildHierarchyTree } from "./siteTree";

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
  const selectedGroup = useAppSelector(selectSelectedGroup);
  const selectedUtility = useAppSelector(selectSelectedUtility);
  const user = useAppSelector(selectAuthUser);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  const isForced = reason === "forced";

  const syncScopedDashboardPath = (value: string) => {
    const match = location.pathname.match(/^\/site\/[^/]+(\/.*)?$/);
    if (!match) return;
    const suffix = match[1] || "/dashboard";
    const pathname =
      value === "all"
        ? suffix
        : `/site/${encodeURIComponent(value)}${suffix}`;
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

  const allSitesLabel = t("navbar.allSites", { defaultValue: "All Sites" });

  const tree = useMemo(() => buildHierarchyTree(sites), [sites]);

  // Single-click commit: any selection auto-closes the modal (selectSite
  // closes via the slice's selectSite reducer). No separate submit step.
  const handleSelect = (value: string) => {
    dispatch(siteSelectionActions.selectSite(value));
    if (!isForced) syncScopedDashboardPath(value);
  };

  const handleSelectGroup = (group: { id: string; label: string }) => {
    dispatch(siteSelectionActions.selectSite("all"));
    dispatch(siteSelectionActions.selectGroup(group));
    if (!isForced) syncScopedDashboardPath("all");
  };

  const handleSelectUtility = (utility: { id: string; label: string }) => {
    dispatch(siteSelectionActions.selectSite("all"));
    dispatch(siteSelectionActions.selectUtility(utility));
    if (!isForced) syncScopedDashboardPath("all");
  };

  const isAllSitesActive =
    selected === "all" && selectedGroup === null && selectedUtility === null;

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
        className={`relative z-10 flex max-h-[calc(100dvh-3rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] transition-all ${
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

        {/* Body — scrolls when there are many sites */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sites.length === 0 ? (
            <EmptyState />
          ) : (
            <SiteCardGrid
              tree={tree}
              selectedValue={selected}
              selectedGroup={selectedGroup}
              onSelectGroup={handleSelectGroup}
              selectedUtility={selectedUtility}
              onSelectUtility={handleSelectUtility}
              onSelect={handleSelect}
              allSites={
                sites.length > 1
                  ? {
                      label: allSitesLabel,
                      count: sites.length,
                      active: isAllSitesActive,
                      onSelect: () => handleSelect("all"),
                    }
                  : undefined
              }
            />
          )}
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────

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
