import type { RootState } from "../../store/store";

export const selectDateFilterValue = (state: RootState) =>
  state.dateFilter.date;

export const selectDateFilterTouched = (state: RootState) =>
  state.dateFilter.dateTouched;
