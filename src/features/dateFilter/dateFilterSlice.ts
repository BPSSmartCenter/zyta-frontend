import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type DateFilterValue = {
  y: number;
  m: number;
  d: number;
};

type DateFilterState = {
  date: DateFilterValue;
  dateTouched: boolean;
};

function todayValue(): DateFilterValue {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

const initialState: DateFilterState = {
  date: todayValue(),
  dateTouched: false,
};

const slice = createSlice({
  name: "dateFilter",
  initialState,
  reducers: {
    setDate(state, action: PayloadAction<DateFilterValue>) {
      state.date = action.payload;
      state.dateTouched = true;
    },
    resetDateTouched(state) {
      state.dateTouched = false;
    },
    resetDateFilter() {
      return { ...initialState, date: todayValue() };
    },
  },
});

export const dateFilterActions = slice.actions;
export default slice.reducer;

export type { DateFilterState };
