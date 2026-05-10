// src/features/users/usersSelectors.ts
import type { RootState } from "../../store/store";

export const selectAdminUserList = (state: RootState) => state.users.adminList;
export const selectAdminUserListStatus = (state: RootState) =>
  state.users.adminListStatus;
export const selectAdminUserById = (id: string) => (state: RootState) =>
  state.users.adminById[id];
export const selectUserStatsByScope = (scope: string) => (state: RootState) =>
  state.users.statsByScope[scope];
export const selectAdminUserSearchResults = (state: RootState) =>
  state.users.searchResults;
export const selectAdminUserSearchStatus = (state: RootState) =>
  state.users.searchStatus;
