import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import { billingReducer } from "../features/billing";
import { cardSandboxReducer } from "../features/cardSandbox";
import {
  flushCardSandboxState,
  saveCardSandboxState,
} from "../features/cardSandbox/cardSandboxStorage";
import { dateFilterReducer } from "../features/dateFilter";
import { detectionSummaryReducer } from "../features/detectionSummary";
import { devicesReducer } from "../features/devices";
import { electricReducer } from "../features/electric";
import { notisFeedReducer } from "../features/notisFeed";
import { sidebarReducer } from "../features/sidebar";
import { sitesReducer } from "../features/sites";
import { siteSelectionReducer } from "../features/siteSelection";
import { siteGroupsReducer } from "../features/siteGroups";
import { utilitiesReducer } from "../features/utilities";
import { usersReducer } from "../features/users";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    billing: billingReducer,
    cardSandbox: cardSandboxReducer,
    dateFilter: dateFilterReducer,
    detectionSummary: detectionSummaryReducer,
    devices: devicesReducer,
    electric: electricReducer,
    notisFeed: notisFeedReducer,
    sidebar: sidebarReducer,
    sites: sitesReducer,
    siteSelection: siteSelectionReducer,
    siteGroups: siteGroupsReducer,
    users: usersReducer,
    utilities: utilitiesReducer,
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
