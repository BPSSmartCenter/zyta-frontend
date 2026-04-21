import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type SidebarState = {
  open: boolean;
  searchQuery: string;
};

const initialState: SidebarState = {
  open: false,
  searchQuery: "",
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
    setSidebarSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    clearSidebarSearchQuery(state) {
      state.searchQuery = "";
    },
  },
});

export const sidebarActions = sidebarSlice.actions;
export default sidebarSlice.reducer;
