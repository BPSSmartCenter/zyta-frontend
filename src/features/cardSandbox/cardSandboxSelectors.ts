import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../store/store";

export const selectCardSandboxState = (state: RootState) => state.cardSandbox;

export const selectSandboxCards = (state: RootState) =>
  state.cardSandbox.cards;

export const selectSandboxSelectedId = (state: RootState) =>
  state.cardSandbox.selectedId;

export const selectSandboxMapPanel = (state: RootState) =>
  state.cardSandbox.mapPanel;

export const selectSandboxEventPanels = (state: RootState) =>
  state.cardSandbox.eventPanels;

export const selectSandboxSelectedCard = createSelector(
  [selectSandboxCards, selectSandboxSelectedId],
  (cards, selectedId) =>
    selectedId ? cards.find((card) => card.id === selectedId) ?? null : null
);
