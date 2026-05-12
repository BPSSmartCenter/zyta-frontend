// src/features/catalog/catalogSelectors.ts
import type { RootState } from "../../store/store";
import type { CatalogEntry } from "./catalogTypes";

export const selectCatalogMap = (state: RootState) =>
  state.catalog.byTitleKey;

export const selectCatalogStatus = (state: RootState) => state.catalog.status;

export const selectCatalogEtag = (state: RootState) => state.catalog.etag;

/**
 * Look up a catalog entry by titleKey. Returns `undefined` when the key is
 * not in the catalog — caller should fall back to the notification's own
 * `feKey`/`icon` fields (backend already provides feKey:"unknown" for these).
 */
export const selectCatalogEntry =
  (titleKey: string | null | undefined) =>
  (state: RootState): CatalogEntry | undefined => {
    if (!titleKey) return undefined;
    return state.catalog.byTitleKey[titleKey];
  };
