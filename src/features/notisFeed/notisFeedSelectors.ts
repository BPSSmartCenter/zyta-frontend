import type { RootState } from "../../store/store";

export const selectNotisFeedState = (state: RootState) => state.notisFeed;

export const selectNotisFeedItems = (state: RootState) =>
  state.notisFeed.items;

export const selectNotisFeedLoading = (state: RootState) =>
  state.notisFeed.loading;

export const selectNotisFeedError = (state: RootState) =>
  state.notisFeed.error;

export const selectNotisFeedStatus = (state: RootState) =>
  state.notisFeed.status;

export const selectNotisFeedLastLoadedAt = (state: RootState) =>
  state.notisFeed.lastLoadedAt;
