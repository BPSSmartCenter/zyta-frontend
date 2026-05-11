// src/features/devices/devicesSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import {
  fetchAirDevices,
  fetchSiteDevices,
  fetchWaterDevices,
} from "./devicesThunks";

type DevicesState = {
  siteDevices: Record<string, unknown>;
  waterDevices: Record<string, unknown>;
  airDevices: Record<string, unknown>;
};

const initialState: DevicesState = {
  siteDevices: {},
  waterDevices: {},
  airDevices: {},
};

const devicesSlice = createSlice({
  name: "devices",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteDevices.fulfilled, (state, action) => {
        state.siteDevices[`${action.payload.siteId}::${action.payload.type}`] =
          action.payload.data;
      })
      .addCase(fetchWaterDevices.fulfilled, (state, action) => {
        state.waterDevices[action.payload.siteId] = action.payload.data;
      })
      .addCase(fetchAirDevices.fulfilled, (state, action) => {
        state.airDevices[action.payload.siteId] = action.payload.data;
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export default devicesSlice.reducer;
export type { DevicesState };
