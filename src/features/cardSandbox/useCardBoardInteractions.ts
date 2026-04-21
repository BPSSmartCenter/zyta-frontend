import React from "react";
import { moveRect, resizeRect } from "./geometry";
import type {
  BoardBounds,
  ResizeHandle,
  SandboxCard,
  SandboxCardId,
  SandboxCardRect,
} from "./types";

type Interaction =
  | {
      kind: "drag";
      cardId: SandboxCardId;
      startX: number;
      startY: number;
      startRect: SandboxCardRect;
      bounds: BoardBounds;
      scale: number;
    }
  | {
      kind: "resize";
      cardId: SandboxCardId;
      handle: ResizeHandle;
      startX: number;
      startY: number;
      startRect: SandboxCardRect;
      bounds: BoardBounds;
      scale: number;
    };

type Input = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  viewportScale?: number;
  selectCard: (id: SandboxCardId | null) => void;
  updateCardRect: (id: SandboxCardId, rect: SandboxCardRect) => void;
};

function resolveBoardBounds(
  boardRef: React.RefObject<HTMLDivElement | null>
): BoardBounds {
  const node = boardRef.current;
  return {
    width: node?.scrollWidth ?? 1600,
    height: node?.scrollHeight ?? 1000,
  };
}

export function useCardBoardInteractions({
  boardRef,
  viewportScale = 1,
  selectCard,
  updateCardRect,
}: Input) {
  const [interaction, setInteraction] = React.useState<Interaction | null>(null);

  React.useEffect(() => {
    if (!interaction) return;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor =
      interaction.kind === "drag" ? "grabbing" : "nwse-resize";

    const onPointerMove = (event: PointerEvent) => {
      const dx = (event.clientX - interaction.startX) / interaction.scale;
      const dy = (event.clientY - interaction.startY) / interaction.scale;
      const rect =
        interaction.kind === "drag"
          ? moveRect(interaction.startRect, dx, dy, interaction.bounds)
          : resizeRect(
              interaction.startRect,
              interaction.handle,
              dx,
              dy,
              interaction.bounds
            );
      updateCardRect(interaction.cardId, rect);
    };
    const stop = () => setInteraction(null);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [interaction, updateCardRect]);

  const startDrag = React.useCallback(
    (event: React.PointerEvent, card: SandboxCard) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      selectCard(card.id);
      setInteraction({
        kind: "drag",
        cardId: card.id,
        startX: event.clientX,
        startY: event.clientY,
        startRect: {
          x: card.x,
          y: card.y,
          width: card.width,
          height: card.height,
        },
        bounds: resolveBoardBounds(boardRef),
        scale: Math.max(viewportScale, 0.1),
      });
    },
    [boardRef, selectCard, viewportScale]
  );

  const startResize = React.useCallback(
    (
      event: React.PointerEvent,
      card: SandboxCard,
      handle: ResizeHandle
    ) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      selectCard(card.id);
      setInteraction({
        kind: "resize",
        cardId: card.id,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        startRect: {
          x: card.x,
          y: card.y,
          width: card.width,
          height: card.height,
        },
        bounds: resolveBoardBounds(boardRef),
        scale: Math.max(viewportScale, 0.1),
      });
    },
    [boardRef, selectCard, viewportScale]
  );

  return {
    activeCardId: interaction?.cardId ?? null,
    interactionKind: interaction?.kind ?? null,
    startDrag,
    startResize,
  };
}
