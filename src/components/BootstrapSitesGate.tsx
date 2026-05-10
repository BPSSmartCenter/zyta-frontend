// src/components/BootstrapSitesGate.tsx
//
// Gate ที่อยู่ระหว่าง <RequireAuth> และ app routes
// หน้าที่:
//   1) โหลด site catalog (apiMe + listSites + listSiteGroups) ครั้งเดียวหลัง login
//   2) Hydrate initial selection จาก URL / sessionStorage / auto-single
//   3) แสดง loading/error state ระหว่าง bootstrap
//   4) Sync URL `:siteCode` → Redux ทุกครั้งที่ route เปลี่ยน
//
// NOTE: ไม่ครอบ modal เองที่นี่ — Modal จะ mount แยกใน App (เพื่อให้ทุกหน้าเห็น)

import { useEffect, type ReactNode } from "react";
import { useMatch } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  hydrateSelection,
  loadSiteCatalog,
  selectHasHydrated,
  selectSiteCatalogStatus,
  siteSelectionActions,
  selectSelectedSite,
  selectAccessibleSites,
  selectIsSitePickerOpen,
  selectSitePickerReason,
} from "../features/siteSelection";
import { selectAuthUser } from "../features/auth";

type Props = {
  children: ReactNode;
};

function GateLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500 text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#3AB8EE]" />
        <span>Loading your workspace…</span>
      </div>
    </div>
  );
}

function GateError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <div className="max-w-sm rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          Failed to load workspace
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Please check your connection and try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-[#0063bf] px-4 text-sm font-semibold text-white hover:bg-[#004e95]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function BootstrapSitesGate({ children }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const status = useAppSelector(selectSiteCatalogStatus);
  const hasHydrated = useAppSelector(selectHasHydrated);
  const selectedSite = useAppSelector(selectSelectedSite);
  const sites = useAppSelector(selectAccessibleSites);
  const isPickerOpen = useAppSelector(selectIsSitePickerOpen);
  const pickerReason = useAppSelector(selectSitePickerReason);

  // Sync URL site code → Redux (เช่น navigate เข้า /site/:siteCode/*)
  const siteCodeMatch = useMatch("/site/:siteCode/*");
  const urlSiteCode = siteCodeMatch?.params?.siteCode ?? null;

  // 1) Load catalog ครั้งเดียวเมื่อมี user
  useEffect(() => {
    if (!user?.id) return;
    if (status === "idle") {
      dispatch(loadSiteCatalog());
    }
  }, [dispatch, user?.id, status]);

  // 2) Hydrate selection หลัง catalog ready
  useEffect(() => {
    if (status !== "ready") return;
    if (!user?.id) return;
    if (hasHydrated) return;
    dispatch(hydrateSelection({ uid: user.id, urlSiteCode }));
  }, [dispatch, status, user?.id, hasHydrated, urlSiteCode]);

  // 3) Sync URL siteCode เมื่อเปลี่ยน route ไปยัง /site/:siteCode ตัวอื่น
  //    (ไม่ dispatch loop — เช็คว่าต่างจาก selectedSite ปัจจุบันก่อน)
  useEffect(() => {
    if (status !== "ready") return;
    if (!urlSiteCode) return;
    if (!hasHydrated) return;
    if (isPickerOpen && pickerReason === "manual") return;
    const norm = urlSiteCode.trim();
    if (!norm) return;
    if (selectedSite && selectedSite.toLowerCase() === norm.toLowerCase()) return;
    const accessible = sites.find(
      (s) => s.value.toLowerCase() === norm.toLowerCase()
    );
    if (accessible) {
      dispatch(siteSelectionActions.selectSite(accessible.value));
    }
    // ถ้าไม่มีสิทธิ์ — ไม่ทำอะไรที่นี่ (ปล่อยให้ guard/page จัดการ)
  }, [
    dispatch,
    status,
    urlSiteCode,
    hasHydrated,
    isPickerOpen,
    pickerReason,
    selectedSite,
    sites,
  ]);

  // Render states
  if (status === "idle" || status === "loading") {
    return <GateLoading />;
  }
  if (status === "failed") {
    return (
      <GateError
        onRetry={() => {
          dispatch(loadSiteCatalog());
        }}
      />
    );
  }
  // ready — รอ hydrate เสร็จก่อน
  if (!hasHydrated) {
    return <GateLoading />;
  }
  return <>{children}</>;
}
