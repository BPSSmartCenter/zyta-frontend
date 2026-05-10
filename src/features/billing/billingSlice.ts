// src/features/billing/billingSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import {
  fetchBillDetail,
  fetchBillingOverview,
  fetchDeviceBillingReadings,
  fetchSiteBillingReadings,
} from "./billingThunks";
import type {
  BillDetailPayload,
  BillingOverviewPayload,
  BillingReadingsPayload,
} from "./billingTypes";

type BillingState = {
  overviewBySite: Record<string, BillingOverviewPayload>;
  billById: Record<string, BillDetailPayload>;
  deviceReadingsByKey: Record<string, BillingReadingsPayload>;
  siteReadingsByKey: Record<string, BillingReadingsPayload>;
};

const initialState: BillingState = {
  overviewBySite: {},
  billById: {},
  deviceReadingsByKey: {},
  siteReadingsByKey: {},
};

function readingsKey(extra: string, mode: string, rest: Record<string, unknown>): string {
  const parts = [extra, mode];
  for (const k of ["date", "month", "year", "tag"]) {
    if (rest[k] != null) parts.push(`${k}=${String(rest[k])}`);
  }
  return parts.join("::");
}

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBillingOverview.fulfilled, (state, action) => {
        state.overviewBySite[action.payload.siteId] = action.payload.data;
      })
      .addCase(fetchBillDetail.fulfilled, (state, action) => {
        state.billById[action.payload.id] = action.payload;
      })
      .addCase(fetchDeviceBillingReadings.fulfilled, (state, action) => {
        const { deviceId, params } = action.meta.arg;
        const key = readingsKey(
          deviceId,
          params.mode,
          params as unknown as Record<string, unknown>
        );
        state.deviceReadingsByKey[key] = action.payload;
      })
      .addCase(fetchSiteBillingReadings.fulfilled, (state, action) => {
        const { siteId, params } = action.meta.arg;
        const key = readingsKey(
          siteId,
          params.mode,
          params as unknown as Record<string, unknown>
        );
        state.siteReadingsByKey[key] = action.payload;
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export default billingSlice.reducer;
export type { BillingState };
