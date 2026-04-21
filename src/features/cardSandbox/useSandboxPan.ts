import React from "react";

type PanState = {
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
};

type UseSandboxPanOptions = {
  viewportRef: React.RefObject<HTMLElement | null>;
  onPanStart?: () => void;
};

function shouldIgnorePan(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest("[data-sandbox-card]") ||
      target.closest("button, input, textarea, select, a")
  );
}

export function useSandboxPan({
  viewportRef,
  onPanStart,
}: UseSandboxPanOptions) {
  const [panState, setPanState] = React.useState<PanState | null>(null);

  React.useEffect(() => {
    if (!panState) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const onPointerMove = (event: PointerEvent) => {
      viewport.scrollLeft = panState.scrollLeft - (event.clientX - panState.startX);
      viewport.scrollTop = panState.scrollTop - (event.clientY - panState.startY);
    };

    const stopPan = () => {
      setPanState(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopPan);
    window.addEventListener("pointercancel", stopPan);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopPan);
      window.removeEventListener("pointercancel", stopPan);
    };
  }, [panState, viewportRef]);

  const startPan = React.useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      if (shouldIgnorePan(event.target)) return;

      const viewport = viewportRef.current;
      if (!viewport) return;

      event.preventDefault();
      onPanStart?.();
      setPanState({
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      });
    },
    [onPanStart, viewportRef]
  );

  return {
    isPanning: Boolean(panState),
    startPan,
  };
}
