// src/features/catalog/catalogThunks.ts
//
// Fetch the notification catalog with ETag-aware conditional GET.
// Catalog entries are stable for ~hours/days; FE caches the map in the slice
// along with the last ETag, and re-validates with `If-None-Match` whenever
// `fetchCatalog` is dispatched. A 304 response means "your cache is fresh —
// keep using it" and the slice state stays untouched.

import { createAsyncThunk } from "@reduxjs/toolkit";
import { requestWithHeaders } from "../../lib/http";
import type { RootState } from "../../store/store";
import type { CatalogMap } from "./catalogTypes";

export type FetchCatalogResult =
  | { status: "fresh"; map: CatalogMap; etag: string | null }
  | { status: "not-modified" };

export const fetchCatalog = createAsyncThunk<
  FetchCatalogResult,
  void,
  { state: RootState }
>("catalog/fetch", async (_, { getState }) => {
  const prevEtag = getState().catalog.etag;
  const headers: Record<string, string> = {};
  if (prevEtag) headers["If-None-Match"] = prevEtag;

  const result = await requestWithHeaders<CatalogMap>(
    "/meta/notification-catalog",
    { headers }
  );

  if (result.status === 304) {
    return { status: "not-modified" };
  }

  return {
    status: "fresh",
    map: result.data ?? {},
    etag: result.headers.get("etag"),
  };
});
