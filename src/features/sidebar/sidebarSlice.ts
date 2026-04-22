import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type SidebarState = {
  open: boolean;
};

const initialState: SidebarState = {
  open: false,
};

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {
    openSidebar(state) {
      state.open = true;
    },
    closeSidebar(state) {
      state.open = false;
    },
    toggleSidebar(state) {
      state.open = !state.open;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.open = action.payload;
    },
  },
});

export const sidebarActions = sidebarSlice.actions;
export default sidebarSlice.reducer;
