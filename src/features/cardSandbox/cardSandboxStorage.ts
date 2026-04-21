import type {
  CardSandboxState,
  SandboxCard,
  SandboxCardKind,
} from "./types";

const STORAGE_KEY = "bps.cardSandbox.v1";
const STORAGE_VERSION = 1;
const CARD_KINDS = new Set<SandboxCardKind>([
  "blank",
  "map",
  "alerts",
  "wellbeing",
  "zyta",
  "facerec",
  "devices",
  "users",
  "snapshot",
]);

type PersistedCardSandboxState = {
  version: typeof STORAGE_VERSION;
  state: CardSandboxState;
};

let saveTimer: ReturnType<typeof window.setTimeout> | null = null;
let pendingState: CardSandboxState | null = null;

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? strings : fallback;
}

function sanitizeCard(value: unknown): SandboxCard | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string") return null;
  if (typeof value.title !== "string") return null;
  if (typeof value.color !== "string") return null;
  if (typeof value.kind !== "string" || !CARD_KINDS.has(value.kind as SandboxCardKind)) {
    return null;
  }
  if (
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height) ||
    !isFiniteNumber(value.zIndex) ||
    typeof value.collapsed !== "boolean"
  ) {
    return null;
  }

  const card: SandboxCard = {
    id: value.id,
    kind: value.kind as SandboxCardKind,
    title: value.title,
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    color: value.color,
    zIndex: value.zIndex,
    collapsed: value.collapsed,
  };

  if (isRecord(value.expandedSize)) {
    const { width, height } = value.expandedSize;
    if (isFiniteNumber(width) && isFiniteNumber(height)) {
      card.expandedSize = { width, height };
    }
  }

  return card;
}

function sanitizeState(value: unknown): CardSandboxState | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.cards)) return null;

  const cards = value.cards.map(sanitizeCard).filter((card): card is SandboxCard => Boolean(card));
  if (cards.length !== value.cards.length) return null;

  const mapPanel = isRecord(value.mapPanel) ? value.mapPanel : {};
  const eventPanels = isRecord(value.eventPanels) ? value.eventPanels : {};
  const selectedId =
    typeof value.selectedId === "string" &&
    cards.some((card) => card.id === value.selectedId)
      ? value.selectedId
      : null;

  return {
    cards,
    selectedId,
    mapPanel: {
      selectedEvents: sanitizeStringArray(mapPanel.selectedEvents, ["all"]),
      severity: typeof mapPanel.severity === "string" ? mapPanel.severity : "all",
      province: typeof mapPanel.province === "string" ? mapPanel.province : "all",
    },
    eventPanels: {
      alertSearch:
        typeof eventPanels.alertSearch === "string" ? eventPanels.alertSearch : "",
      wellbeingSearch:
        typeof eventPanels.wellbeingSearch === "string"
          ? eventPanels.wellbeingSearch
          : "",
      faceSearch:
        typeof eventPanels.faceSearch === "string" ? eventPanels.faceSearch : "",
      zytaSearch:
        typeof eventPanels.zytaSearch === "string" ? eventPanels.zytaSearch : "",
    },
  };
}

export function loadCardSandboxState() {
  if (!hasStorage()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) return null;

    return sanitizeState((parsed as PersistedCardSandboxState).state);
  } catch {
    return null;
  }
}

export function flushCardSandboxState() {
  if (!hasStorage() || !pendingState) return;

  const payload: PersistedCardSandboxState = {
    version: STORAGE_VERSION,
    state: pendingState,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    pendingState = null;
  } catch {
    // Storage can be disabled or full; sandbox remains usable without persistence.
  }
}

export function saveCardSandboxState(state: CardSandboxState) {
  if (!hasStorage()) return;

  pendingState = state;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    flushCardSandboxState();
  }, 150);
}
