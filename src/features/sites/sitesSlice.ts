// src/features/sites/sitesSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import {
  fetchSiteBillingAccess,
  fetchSiteDetails,
  fetchSiteList,
  updateSiteBillingAccess,
} from "./sitesThunks";
import type { ListSitesResponse, SiteBillingAccess } from "./sitesTypes";

type LoadStatus = "idle" | "pending" | "succeeded" | "failed";

type SitesState = {
  listStatus: LoadStatus;
  list: ListSitesResponse | null;
  detailsById: Record<string, unknown>;
  billingAccessById: Record<string, SiteBillingAccess>;
};

const initialState: SitesState = {
  listStatus: "idle",
  list: null,
  detailsById: {},
  billingAccessById: {},
};

const sitesSlice = createSlice({
  name: "sites",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteList.pending, (state) => {
        state.listStatus = "pending";
      })
      .addCase(fetchSiteList.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchSiteList.rejected, (state) => {
        state.listStatus = "failed";
      })
      .addCase(fetchSiteDetails.fulfilled, (state, action) => {
        state.detailsById[action.meta.arg] = action.payload;
      })
      .addCase(fetchSiteBillingAccess.fulfilled, (state, action) => {
        state.billingAccessById[action.payload.id] = action.payload.access;
      })
      .addCase(updateSiteBillingAccess.fulfilled, (state, action) => {
        state.billingAccessById[action.payload.id] = action.payload.access;
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export default sitesSlice.reducer;
export type { SitesState };
