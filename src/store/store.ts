import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import { cardSandboxReducer } from "../features/cardSandbox";
import {
  flushCardSandboxState,
  saveCardSandboxState,
} from "../features/cardSandbox/cardSandboxStorage";
import { dateFilterReducer } from "../features/dateFilter";
import { sidebarReducer } from "../features/sidebar";
import { siteSelectionReducer } from "../features/siteSelection";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cardSandbox: cardSandboxReducer,
    dateFilter: dateFilterReducer,
    sidebar: sidebarReducer,
    siteSelection: siteSelectionReducer,
  },
});

let previousCardSandboxState = store.getState().cardSandbox;

store.subscribe(() => {
  const currentCardSandboxState = store.getState().cardSandbox;
  if (currentCardSandboxState === previousCardSandboxState) return;

  previousCardSandboxState = currentCardSandboxState;
  saveCardSandboxState(currentCardSandboxState);
});

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flushCardSandboxState);
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
