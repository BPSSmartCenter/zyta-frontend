import type { BoardBounds, ResizeHandle, SandboxCardRect } from "./types";

export const MIN_CARD_WIDTH = 120;
export const MIN_CARD_HEIGHT = 88;

export function clampRectToBoard(
  rect: SandboxCardRect,
  bounds: BoardBounds
): SandboxCardRect {
  const width = Math.min(Math.max(rect.width, MIN_CARD_WIDTH), bounds.width);
  const height = Math.min(Math.max(rect.height, MIN_CARD_HEIGHT), bounds.height);
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
  bounds: BoardBounds
): SandboxCardRect {
  return clampRectToBoard(
    {
      ...start,
      x: start.x + dx,
      y: start.y + dy,
    },
    bounds
  );
}

export function resizeRect(
  start: SandboxCardRect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  bounds: BoardBounds
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
    if (width < MIN_CARD_WIDTH) {
      width = MIN_CARD_WIDTH;
      x = right - MIN_CARD_WIDTH;
    }
  }
  if (handle.includes("n")) {
    y = start.y + dy;
    height = bottom - y;
    if (height < MIN_CARD_HEIGHT) {
      height = MIN_CARD_HEIGHT;
      y = bottom - MIN_CARD_HEIGHT;
    }
  }

  return clampRectToBoard({ x, y, width, height }, bounds);
}
