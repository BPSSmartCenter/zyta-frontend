// src/features/siteSelection/siteSelectionTypes.ts
//
// Centralized types for site selection flow.
// Re-exported from components/Shared/SiteDropdownGrouped so that existing
// consumers continue to work without changes.

export type SiteOption = {
  label: string;
  value: string;
  i18nKey?: string;
  groupLabel?: string | null;
  groupId?: string | null;
  utilityId?: string | null;
  utilityLabel?: string | null;
};

export type SelectedGroupSite = {
  id: string;
  label: string;
} | null;

export type SelectedUtility = {
  id: string;
  label: string;
} | null;

/** สถานะการโหลด catalog (apiMe + listSites + listSiteGroups) */
export type SiteCatalogStatus = "idle" | "loading" | "ready" | "failed";

/** เหตุผลที่ modal ถูกเปิด — forced = บังคับเลือกครั้งแรก, manual = user เปิดเอง */
export type SitePickerReason = "forced" | "manual";
