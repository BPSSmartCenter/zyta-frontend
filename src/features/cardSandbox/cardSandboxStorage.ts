import type {
  CardSandboxState,
  SandboxCard,
  SandboxCardKind,
  SandboxDateValue,
  SandboxFilterGroup,
  SandboxFilterGroupId,
  SandboxScopeOption,
} from "./types";

const STORAGE_KEY = "bps.cardSandbox.v1";
const STORAGE_VERSION = 1;
const CARD_KINDS = new Set<SandboxCardKind>([
  "blank",
  "filters",
  "map",
  "alerts",
  "wellbeing",
  "zyta",
  "facerec",
  "devices",
  "users",
  "snapshot",
]);
const DEFAULT_FILTER_GROUP_ID = "group-blue";
const FILTER_GROUP_DEFS = [
  { id: "group-blue", label: "Blue", color: "#dbeafe" },
  { id: "group-green", label: "Green", color: "#dcfce7" },
  { id: "group-amber", label: "Amber", color: "#fef3c7" },
  { id: "group-violet", label: "Violet", color: "#fae8ff" },
  { id: "group-rose", label: "Rose", color: "#fee2e2" },
] satisfies Array<{
  id: SandboxFilterGroupId;
  label: string;
  color: string;
}>;
const FILTER_GROUP_IDS = new Set(
  FILTER_GROUP_DEFS.map((group) => group.id)
);

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

function todayValue(): SandboxDateValue {
  const date = new Date();
  return {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
  };
}

function sanitizeDateValue(value: unknown): SandboxDateValue {
  if (!isRecord(value)) return todayValue();
  const { y, m, d } = value;
  if (!isFiniteNumber(y) || !isFiniteNumber(m) || !isFiniteNumber(d)) {
    return todayValue();
  }
  return { y, m, d };
}

function sanitizeScopeOption(value: unknown): SandboxScopeOption {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.label !== "string") {
    return null;
  }
  return {
    id: value.id,
    label: value.label,
  };
}

function createDefaultFilterValues() {
  return {
    selectedSite: "all",
    selectedGroupSite: null,
    selectedUtility: null,
    date: todayValue(),
    selectedEvents: ["all"],
    severity: "all",
    province: "all",
  };
}

function createDefaultFilterGroup(
  group: (typeof FILTER_GROUP_DEFS)[number]
): SandboxFilterGroup {
  return {
    ...group,
    ...createDefaultFilterValues(),
  };
}

function createDefaultFilterGroups() {
  return Object.fromEntries(
    FILTER_GROUP_DEFS.map((group) => [group.id, createDefaultFilterGroup(group)])
  ) as Record<SandboxFilterGroupId, SandboxFilterGroup>;
}

function sanitizeFilterGroup(
  id: SandboxFilterGroupId,
  value: unknown
): SandboxFilterGroup {
  const def =
    FILTER_GROUP_DEFS.find((group) => group.id === id) ??
    FILTER_GROUP_DEFS[0];
  const base = createDefaultFilterGroup(def);
  if (!isRecord(value)) return base;

  return {
    ...base,
    selectedSite:
      typeof value.selectedSite === "string" ? value.selectedSite : base.selectedSite,
    selectedGroupSite: sanitizeScopeOption(value.selectedGroupSite),
    selectedUtility: sanitizeScopeOption(value.selectedUtility),
    date: sanitizeDateValue(value.date),
    selectedEvents: sanitizeStringArray(value.selectedEvents, base.selectedEvents),
    severity: typeof value.severity === "string" ? value.severity : base.severity,
    province: typeof value.province === "string" ? value.province : base.province,
  };
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
    filterGroupId:
      typeof value.filterGroupId === "string" &&
      FILTER_GROUP_IDS.has(value.filterGroupId)
        ? value.filterGroupId
        : DEFAULT_FILTER_GROUP_ID,
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

  const rawFilterGroups = isRecord(value.filterGroups)
    ? value.filterGroups
    : {};
  const eventPanels = isRecord(value.eventPanels) ? value.eventPanels : {};
  const selectedId =
    typeof value.selectedId === "string" &&
    cards.some((card) => card.id === value.selectedId)
      ? value.selectedId
      : null;
  const filterGroups = createDefaultFilterGroups();
  for (const group of FILTER_GROUP_DEFS) {
    filterGroups[group.id] = sanitizeFilterGroup(
      group.id,
      rawFilterGroups[group.id]
    );
  }
  const activeFilterGroupId =
    typeof value.activeFilterGroupId === "string" &&
    FILTER_GROUP_IDS.has(value.activeFilterGroupId)
      ? value.activeFilterGroupId
      : DEFAULT_FILTER_GROUP_ID;
  return {
    cards,
    selectedId,
    filterGroups,
    activeFilterGroupId,
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
