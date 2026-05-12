// src/features/catalog/index.ts
export { default as catalogReducer } from "./catalogSlice";
export type { CatalogState } from "./catalogSlice";
export { fetchCatalog } from "./catalogThunks";
export {
  selectCatalogMap,
  selectCatalogStatus,
  selectCatalogEtag,
  selectCatalogEntry,
} from "./catalogSelectors";
export type { CatalogEntry, CatalogMap } from "./catalogTypes";
