// src/features/sites/index.ts
export { default as sitesReducer } from "./sitesSlice";
export type { SitesState } from "./sitesSlice";
// Thunk exports — only the read thunks are public (slice consumes the rest
// directly via extraReducers). Mutation/imperative flows use the plain API
// helpers below to avoid name clashes.
export {
  fetchSiteList,
  fetchSiteInventory,
  fetchSiteDetails,
  fetchSiteBillingAccess,
} from "./sitesThunks";
export type {
  ListSitesResponse,
  RegisterSiteInput,
  SiteBillingAccess,
  SiteListItem,
  UpdateSiteInput,
} from "./sitesTypes";
export {
  listSites,
  getSiteInventory,
  getSiteDetails,
  registerSite,
  updateSite,
  deleteSite,
  getSiteBillingAccess,
  updateSiteBillingAccess,
} from "./sitesApi";
