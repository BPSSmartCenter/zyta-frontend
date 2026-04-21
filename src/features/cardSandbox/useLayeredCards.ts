import React from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectSandboxCards,
  selectSandboxSelectedCard,
  selectSandboxSelectedId,
} from "./cardSandboxSelectors";
import { cardSandboxActions } from "./cardSandboxSlice";
import type {
  SandboxCardId,
  SandboxCardKind,
  SandboxCardRect,
} from "./types";

export function useLayeredCards() {
  const dispatch = useAppDispatch();
  const cards = useAppSelector(selectSandboxCards);
  const selectedId = useAppSelector(selectSandboxSelectedId);
  const selectedCard = useAppSelector(selectSandboxSelectedCard);

  const cardsById = React.useMemo(
    () => new Map(cards.map((card) => [card.id, card] as const)),
    [cards]
  );

  const selectCard = React.useCallback(
    (id: SandboxCardId | null) => {
      dispatch(cardSandboxActions.selectCard(id));
    },
    [dispatch]
  );
  const updateCardRect = React.useCallback(
    (id: SandboxCardId, rect: SandboxCardRect) => {
      dispatch(cardSandboxActions.updateCardRect({ id, rect }));
    },
    [dispatch]
  );
  const addCard = React.useCallback(
    (kind: SandboxCardKind = "blank") => {
      dispatch(cardSandboxActions.addCard({ kind }));
    },
    [dispatch]
  );
  const toggleCardCollapsed = React.useCallback(
    (id: SandboxCardId) => {
      dispatch(cardSandboxActions.toggleCardCollapsed(id));
    },
    [dispatch]
  );
  const reset = React.useCallback(
    () => dispatch(cardSandboxActions.resetCardSandbox()),
    [dispatch]
  );
  const duplicateSelected = React.useCallback(() => {
    if (selectedId) dispatch(cardSandboxActions.duplicateCard(selectedId));
  }, [dispatch, selectedId]);
  const deleteSelected = React.useCallback(() => {
    if (selectedId) dispatch(cardSandboxActions.deleteCard(selectedId));
  }, [dispatch, selectedId]);
  const deleteCard = React.useCallback(
    (id: SandboxCardId) => {
      dispatch(cardSandboxActions.deleteCard(id));
    },
    [dispatch]
  );
  const bringSelectedFront = React.useCallback(() => {
    if (selectedId) dispatch(cardSandboxActions.bringCardFront(selectedId));
  }, [dispatch, selectedId]);
  const sendSelectedBack = React.useCallback(() => {
    if (selectedId) dispatch(cardSandboxActions.sendCardBack(selectedId));
  }, [dispatch, selectedId]);
  const bringSelectedForward = React.useCallback(() => {
    if (selectedId) dispatch(cardSandboxActions.bringCardForward(selectedId));
  }, [dispatch, selectedId]);
  const sendSelectedBackward = React.useCallback(() => {
    if (selectedId) dispatch(cardSandboxActions.sendCardBackward(selectedId));
  }, [dispatch, selectedId]);

  return {
    cards,
    cardsById,
    selectedId,
    selectedCard,
    selectCard,
    updateCardRect,
    toggleCardCollapsed,
    addCard,
    reset,
    duplicateSelected,
    deleteSelected,
    deleteCard,
    bringSelectedFront,
    sendSelectedBack,
    bringSelectedForward,
    sendSelectedBackward,
  };
}
