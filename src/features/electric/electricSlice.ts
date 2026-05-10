// src/features/electric/electricSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import {
  fetchElectricDevices,
  fetchElectricOverview,
  fetchMeterDashboard,
  fetchSiteMetersDashboard,
  type MeterDashboard,
} from "./electricThunks";

type ElectricState = {
  devicesBySite: Record<string, unknown>;
  overviewBySite: Record<string, unknown>;
  meterDashboardById: Record<string, MeterDashboard>;
  siteMetersDashboardByKey: Record<string, MeterDashboard>;
};

const initialState: ElectricState = {
  devicesBySite: {},
  overviewBySite: {},
  meterDashboardById: {},
  siteMetersDashboardByKey: {},
};

const electricSlice = createSlice({
  name: "electric",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchElectricDevices.fulfilled, (state, action) => {
        state.devicesBySite[action.payload.siteCode] = action.payload.data;
      })
      .addCase(fetchElectricOverview.fulfilled, (state, action) => {
        state.overviewBySite[action.payload.siteCode] = action.payload.data;
      })
      .addCase(fetchMeterDashboard.fulfilled, (state, action) => {
        state.meterDashboardById[action.meta.arg.deviceId] = action.payload;
      })
      .addCase(fetchSiteMetersDashboard.fulfilled, (state, action) => {
        const { siteId, tag } = action.meta.arg;
        const key = tag ? `${siteId}::${tag}` : siteId;
        state.siteMetersDashboardByKey[key] = action.payload;
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export default electricSlice.reducer;
export type { ElectricState };
