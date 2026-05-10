// src/features/siteGroups/siteGroupsSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import { fetchSiteGroups, type SiteGroup } from "./siteGroupsThunks";

type LoadStatus = "idle" | "pending" | "succeeded" | "failed";

type SiteGroupsState = {
  status: LoadStatus;
  items: SiteGroup[];
};

const initialState: SiteGroupsState = { status: "idle", items: [] };

const siteGroupsSlice = createSlice({
  name: "siteGroups",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteGroups.pending, (state) => {
        state.status = "pending";
      })
      .addCase(fetchSiteGroups.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchSiteGroups.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export default siteGroupsSlice.reducer;
export type { SiteGroupsState };
