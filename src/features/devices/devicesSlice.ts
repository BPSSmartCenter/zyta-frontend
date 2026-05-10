// src/features/devices/devicesSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import {
  fetchAirDevices,
  fetchIoTDevices,
  fetchSiteDevices,
  fetchWaterDevices,
  type IoTDevice,
} from "./devicesThunks";

type DevicesState = {
  siteDevices: Record<string, unknown>;
  waterDevices: Record<string, unknown>;
  airDevices: Record<string, unknown>;
  iotList: IoTDevice[];
  iotStatus: "idle" | "pending" | "succeeded" | "failed";
};

const initialState: DevicesState = {
  siteDevices: {},
  waterDevices: {},
  airDevices: {},
  iotList: [],
  iotStatus: "idle",
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
      .addCase(fetchIoTDevices.pending, (state) => {
        state.iotStatus = "pending";
      })
      .addCase(fetchIoTDevices.fulfilled, (state, action) => {
        state.iotStatus = "succeeded";
        state.iotList = action.payload;
      })
      .addCase(fetchIoTDevices.rejected, (state) => {
        state.iotStatus = "failed";
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export default devicesSlice.reducer;
export type { DevicesState };
