import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../store/store";

export const selectCardSandboxState = (state: RootState) => state.cardSandbox;

export const selectSandboxCards = (state: RootState) =>
  state.cardSandbox.cards;

export const selectSandboxSelectedId = (state: RootState) =>
  state.cardSandbox.selectedId;

export const selectSandboxFilterGroups = (state: RootState) =>
  state.cardSandbox.filterGroups;

export const selectSandboxFilterGroupList = createSelector(
  [selectSandboxFilterGroups],
  (groups) => Object.values(groups)
);

export const selectSandboxActiveFilterGroupId = (state: RootState) =>
  state.cardSandbox.activeFilterGroupId;

export const selectSandboxFilterGroupForCard = (
  state: RootState,
  cardId: string
) => {
  const card = state.cardSandbox.cards.find((item) => item.id === cardId);
  if (!card) return null;
  return (
    state.cardSandbox.filterGroups[card.filterGroupId] ??
    state.cardSandbox.filterGroups[state.cardSandbox.activeFilterGroupId] ??
    null
  );
};

export const selectSandboxEventPanels = (state: RootState) =>
  state.cardSandbox.eventPanels;

export const selectSandboxSelectedCard = createSelector(
  [selectSandboxCards, selectSandboxSelectedId],
  (cards, selectedId) =>
    selectedId ? cards.find((card) => card.id === selectedId) ?? null : null
);
