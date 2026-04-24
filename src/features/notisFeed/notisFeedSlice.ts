import { createSlice } from "@reduxjs/toolkit";
import type { Noti } from "../../data/Dashboard/notis";
import {
  fetchNotisFeed,
  type FetchNotisFeedError,
} from "./notisFeedThunks";

export type NotisFeedState = {
  items: Noti[];
  loading: boolean;
  error: string | null;
  status: "idle" | "loading" | "ready" | "failed";
  lastLoadedAt: string | null;
  activeRequestId: string | null;
};

const initialState: NotisFeedState = {
  items: [],
  loading: false,
  error: null,
  status: "idle",
  lastLoadedAt: null,
  activeRequestId: null,
};

const slice = createSlice({
  name: "notisFeed",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotisFeed.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.status = state.items.length > 0 ? state.status : "loading";
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(fetchNotisFeed.fulfilled, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;
        state.items = action.payload.items;
        state.loading = false;
        state.error = null;
        state.status = "ready";
        state.lastLoadedAt = new Date().toISOString();
        state.activeRequestId = null;
      })
      .addCase(fetchNotisFeed.rejected, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;
        const payload = action.payload as FetchNotisFeedError | undefined;
        state.loading = false;
        state.error =
          payload?.message ?? action.error.message ?? "Failed to load notifications";
        state.status = "failed";
        if (state.items.length === 0) {
          state.items = payload?.fallbackItems ?? [];
        }
        state.activeRequestId = null;
      });
  },
});

export default slice.reducer;
