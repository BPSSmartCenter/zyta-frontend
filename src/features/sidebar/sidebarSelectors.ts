import type { RootState } from "../../store/store";

export const selectSidebarOpen = (state: RootState) => state.sidebar.open;

export const selectSidebarSearchQuery = (state: RootState) =>
  state.sidebar.searchQuery;
