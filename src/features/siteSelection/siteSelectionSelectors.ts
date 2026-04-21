// src/features/siteSelection/siteSelectionSelectors.ts
//
// Memoized selectors — ใช้ createSelector สำหรับ derived values เพื่อกัน
// "returned a different result when called with the same parameters" warning

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../store/store";
import type { SiteOption } from "./siteSelectionTypes";

// ─────── Base (identity) selectors ───────

export const selectSiteSelectionState = (state: RootState) => state.siteSelection;

export const selectSiteCatalogStatus = (state: RootState) =>
  state.siteSelection.catalogStatus;

export const selectSiteCatalogError = (state: RootState) =>
  state.siteSelection.catalogError;

export const selectAccessibleSites = (state: RootState) =>
  state.siteSelection.sites;

export const selectIsAdminRole = (state: RootState) =>
  state.siteSelection.isAdmin;

export const selectSelectedSite = (state: RootState) =>
  state.siteSelection.selectedSite;

export const selectSelectedGroup = (state: RootState) =>
  state.siteSelection.selectedGroup;

export const selectSelectedUtility = (state: RootState) =>
  state.siteSelection.selectedUtility;

export const selectIsSitePickerOpen = (state: RootState) =>
  state.siteSelection.isPickerOpen;

export const selectSitePickerReason = (state: RootState) =>
  state.siteSelection.pickerReason;

export const selectHasHydrated = (state: RootState) =>
  state.siteSelection.hasHydrated;

// ─────── Derived (memoized) selectors ───────

/** มีไซต์ให้เลือกไหม (ใช้แสดงหน้า "no access") */
export const selectHasSiteAccess = createSelector(
  [selectAccessibleSites],
  (sites) => sites.length > 0
);

/** ต้องการให้ user เลือก site ก่อนเข้าใช้งานหรือยัง */
export const selectNeedsSiteSelection = createSelector(
  [selectAccessibleSites, selectSelectedSite],
  (sites, selected) => sites.length > 1 && selected === null
);

/** selectedSite ที่พร้อมส่งต่อให้ API (ถ้า null ให้ fallback เป็น "all") */
export const selectEffectiveSelectedSite = createSelector(
  [selectSelectedSite],
  (selected): string => selected ?? "all"
);

/**
 * options สำหรับ dropdown เดิม (รวม "All Sites" ถ้ามีมากกว่า 1 ไซต์)
 * จะถูก label ด้วยภาษาที่เลือกผ่าน parameter — ใช้ selector factory pattern
 *
 * NOTE: เนื่องจาก i18n label ต้องมาจาก component (useTranslation),
 * selector นี้คืนเฉพาะ sites catalog — component ต้อง map เพิ่ม "All" เอง
 */
export const selectSiteOptionsForDropdown = createSelector(
  [selectAccessibleSites],
  (sites): SiteOption[] => sites
);
