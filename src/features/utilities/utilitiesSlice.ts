// src/features/utilities/utilitiesSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import {
  createUtility,
  deleteUtility,
  fetchUtilities,
  updateUtility,
  type Utility,
} from "./utilitiesThunks";

type LoadStatus = "idle" | "pending" | "succeeded" | "failed";

type UtilitiesState = {
  status: LoadStatus;
  items: Utility[];
};

const initialState: UtilitiesState = { status: "idle", items: [] };

const utilitiesSlice = createSlice({
  name: "utilities",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUtilities.pending, (state) => {
        state.status = "pending";
      })
      .addCase(fetchUtilities.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchUtilities.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(createUtility.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateUtility.fulfilled, (state, action) => {
        const idx = state.items.findIndex((u) => u.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      })
      .addCase(deleteUtility.fulfilled, (state, action) => {
        state.items = state.items.filter((u) => u.id !== action.payload);
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export default utilitiesSlice.reducer;
export type { UtilitiesState };
