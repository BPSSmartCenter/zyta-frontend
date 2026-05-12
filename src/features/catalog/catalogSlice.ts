// src/features/catalog/catalogSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import { fetchCatalog } from "./catalogThunks";
import type { CatalogMap } from "./catalogTypes";

type CatalogStatus = "idle" | "loading" | "ready" | "stale" | "failed";

type CatalogState = {
  byTitleKey: CatalogMap;
  etag: string | null;
  status: CatalogStatus;
  lastFetchedAt: number | null;
  error: string | null;
};

const initialState: CatalogState = {
  byTitleKey: {},
  etag: null,
  status: "idle",
  lastFetchedAt: null,
  error: null,
};

const catalogSlice = createSlice({
  name: "catalog",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalog.pending, (state) => {
        // Don't wipe existing entries on revalidate — keep serving stale data
        // until the 200/304 response decides what to do.
        if (state.status === "idle") state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        state.status = "ready";
        state.error = null;
        state.lastFetchedAt = Date.now();
        if (action.payload.status === "fresh") {
          state.byTitleKey = action.payload.map;
          state.etag = action.payload.etag;
        }
        // "not-modified" → keep byTitleKey + etag as-is
      })
      .addCase(fetchCatalog.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load catalog";
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export default catalogSlice.reducer;
export type { CatalogState };
