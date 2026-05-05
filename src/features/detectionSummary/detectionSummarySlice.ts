import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type DetectionSummaryKey =
  | "motion"
  | "fall"
  | "fire"
  | "offline"
  | "sleep"
  | "face"
  | "other";

type DetectionSummaryState = {
  selectedKey: DetectionSummaryKey | null;
};

const initialState: DetectionSummaryState = {
  selectedKey: null,
};

const slice = createSlice({
  name: "detectionSummary",
  initialState,
  reducers: {
    setSelectedDetectionKey(
      state,
      action: PayloadAction<DetectionSummaryKey | null>
    ) {
      state.selectedKey = action.payload;
    },
    clearSelectedDetectionKey(state) {
      state.selectedKey = null;
    },
  },
});

export const detectionSummaryActions = slice.actions;
export default slice.reducer;

export type { DetectionSummaryState };
