// src/features/siteSelection/index.ts
//
// Public API for siteSelection feature

export { default as siteSelectionReducer, siteSelectionActions } from "./siteSelectionSlice";

export {
  loadSiteCatalog,
  hydrateSelection,
  normalizeSiteToOption,
  type LoadSiteCatalogResult,
  type LoadSiteCatalogError,
  type HydrateSelectionInput,
  type HydrateSelectionResult,
} from "./siteSelectionThunks";

export {
  selectSiteSelectionState,
  selectSiteCatalogStatus,
  selectSiteCatalogError,
  selectAccessibleSites,
  selectIsAdminRole,
  selectSelectedSite,
  selectSelectedGroup,
  selectSelectedUtility,
  selectIsSitePickerOpen,
  selectSitePickerReason,
  selectHasHydrated,
  selectHasSiteAccess,
  selectNeedsSiteSelection,
  selectEffectiveSelectedSite,
  selectSiteOptionsForDropdown,
} from "./siteSelectionSelectors";

export type {
  SiteOption,
  SelectedGroupSite,
  SelectedUtility,
  SiteCatalogStatus,
  SitePickerReason,
} from "./siteSelectionTypes";

export {
  readStoredSite,
  writeStoredSite,
  clearStoredSite,
  clearAllStoredSites,
} from "./siteSelectionStorage";
