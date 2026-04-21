import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import { sidebarReducer } from "../features/sidebar";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sidebar: sidebarReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
