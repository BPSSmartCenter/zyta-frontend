import type {
  BoardBounds,
  ResizeHandle,
  SandboxCardKind,
  SandboxCardRect,
} from "./types";

export const MIN_CARD_WIDTH = 120;
export const MIN_CARD_HEIGHT = 88;
export const MIN_FILTER_CARD_WIDTH = 360;
export const MIN_FILTER_CARD_HEIGHT = 228;
export const MIN_ALERT_CARD_WIDTH = 360;
export const MIN_ALERT_CARD_HEIGHT = 540;

export type CardResizeConstraints = {
  minWidth: number;
  minHeight: number;
};

export function getCardResizeConstraints(
  kind?: SandboxCardKind
): CardResizeConstraints {
  if (kind === "filters") {
    return {
      minWidth: MIN_FILTER_CARD_WIDTH,
      minHeight: MIN_FILTER_CARD_HEIGHT,
    };
  }
  if (kind === "alerts" || kind === "wellbeing" || kind === "zyta") {
    return {
      minWidth: MIN_ALERT_CARD_WIDTH,
      minHeight: MIN_ALERT_CARD_HEIGHT,
    };
  }
  return {
    minWidth: MIN_CARD_WIDTH,
    minHeight: MIN_CARD_HEIGHT,
  };
}

export function clampRectToBoard(
  rect: SandboxCardRect,
  bounds: BoardBounds,
  constraints: CardResizeConstraints = getCardResizeConstraints()
): SandboxCardRect {
  const width = Math.min(Math.max(rect.width, constraints.minWidth), bounds.width);
  const height = Math.min(
    Math.max(rect.height, constraints.minHeight),
    bounds.height
  );
  return {
    x: Math.min(Math.max(rect.x, 0), Math.max(0, bounds.width - width)),
    y: Math.min(Math.max(rect.y, 0), Math.max(0, bounds.height - height)),
    width,
    height,
  };
}

export function moveRect(
  start: SandboxCardRect,
  dx: number,
  dy: number,
  bounds: BoardBounds,
  constraints?: CardResizeConstraints
): SandboxCardRect {
  return clampRectToBoard(
    {
      ...start,
      x: start.x + dx,
      y: start.y + dy,
    },
    bounds,
    constraints
  );
}

export function resizeRect(
  start: SandboxCardRect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  bounds: BoardBounds,
  constraints: CardResizeConstraints = getCardResizeConstraints()
): SandboxCardRect {
  let x = start.x;
  let y = start.y;
  let width = start.width;
  let height = start.height;
  const right = start.x + start.width;
  const bottom = start.y + start.height;

  if (handle.includes("e")) {
    width = start.width + dx;
  }
  if (handle.includes("s")) {
    height = start.height + dy;
  }
  if (handle.includes("w")) {
    x = start.x + dx;
    width = right - x;
    if (width < constraints.minWidth) {
      width = constraints.minWidth;
      x = right - constraints.minWidth;
    }
  }
  if (handle.includes("n")) {
    y = start.y + dy;
    height = bottom - y;
    if (height < constraints.minHeight) {
      height = constraints.minHeight;
      y = bottom - constraints.minHeight;
    }
  }

  return clampRectToBoard({ x, y, width, height }, bounds, constraints);
}
