import type { RootState } from "../../store/store";

export const selectDetectionSummarySelectedKey = (state: RootState) =>
  state.detectionSummary.selectedKey;
