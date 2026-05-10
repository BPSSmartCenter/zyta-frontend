// src/features/users/usersSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import { logoutUser } from "../auth/authThunks";
import {
  fetchAdminUserById,
  fetchAdminUserList,
  fetchUserStats,
  searchAdminUsersByEmail,
} from "./usersThunks";
import type {
  AdminUserDto,
  UserSearchDto,
  UserStatsResponse,
} from "./usersTypes";

type LoadStatus = "idle" | "pending" | "succeeded" | "failed";

type UsersState = {
  // Admin user list
  adminListStatus: LoadStatus;
  adminList: AdminUserDto[];
  adminListError: string | null;

  // Per-id admin user details
  adminById: Record<string, AdminUserDto>;

  // Stats keyed by site code ("" for global)
  statsByScope: Record<string, UserStatsResponse>;

  // Search results
  searchStatus: LoadStatus;
  searchResults: UserSearchDto[];
};

const initialState: UsersState = {
  adminListStatus: "idle",
  adminList: [],
  adminListError: null,
  adminById: {},
  statsByScope: {},
  searchStatus: "idle",
  searchResults: [],
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearAdminUserSearch(state) {
      state.searchResults = [];
      state.searchStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminUserList.pending, (state) => {
        state.adminListStatus = "pending";
        state.adminListError = null;
      })
      .addCase(fetchAdminUserList.fulfilled, (state, action) => {
        state.adminListStatus = "succeeded";
        state.adminList = action.payload;
      })
      .addCase(fetchAdminUserList.rejected, (state, action) => {
        state.adminListStatus = "failed";
        state.adminListError = action.error.message ?? "Failed to load users";
      })
      .addCase(fetchAdminUserById.fulfilled, (state, action) => {
        state.adminById[action.payload.id] = action.payload;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        const scope = action.meta.arg ?? "";
        state.statsByScope[scope] = action.payload;
      })
      .addCase(searchAdminUsersByEmail.pending, (state) => {
        state.searchStatus = "pending";
      })
      .addCase(searchAdminUsersByEmail.fulfilled, (state, action) => {
        state.searchStatus = "succeeded";
        state.searchResults = action.payload;
      })
      .addCase(searchAdminUsersByEmail.rejected, (state) => {
        state.searchStatus = "failed";
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export const usersActions = usersSlice.actions;
export default usersSlice.reducer;
export type { UsersState };
