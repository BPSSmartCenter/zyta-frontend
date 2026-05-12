import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  CardSandboxState,
  SandboxDateValue,
  SandboxCard,
  SandboxCardId,
  SandboxFilterGroup,
  SandboxFilterGroupId,
  SandboxCardKind,
  SandboxCardRect,
  SandboxScopeOption,
} from "./types";
import { getCardResizeConstraints } from "./geometry";
import { loadCardSandboxState } from "./cardSandboxStorage";

const CARD_COLORS = [
  "#e0f2fe",
  "#dcfce7",
  "#fef3c7",
  "#fae8ff",
  "#fee2e2",
  "#e0e7ff",
];
const COLLAPSED_CARD_WIDTH = 64;
const COLLAPSED_CARD_HEIGHT = 52;
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

const initialCards: SandboxCard[] = [
  {
    id: "card-filters",
    kind: "filters",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "Main Filters",
    x: 120,
    y: 120,
    width: 360,
    height: 250,
    color: "#dbeafe",
    zIndex: 110,
    collapsed: false,
  },
  {
    id: "card-1",
    kind: "blank",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "Card 1",
    x: 120,
    y: 120,
    width: 520,
    height: 300,
    color: "#e0f2fe",
    zIndex: 10,
    collapsed: false,
  },
  {
    id: "card-2",
    kind: "map",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "Card 2",
    x: 820,
    y: 120,
    width: 960,
    height: 780,
    color: "#dcfce7",
    zIndex: 20,
    collapsed: false,
  },
  {
    id: "card-3",
    kind: "alerts",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "Card 3",
    x: 2040,
    y: 120,
    width: 360,
    height: 540,
    color: "#fef3c7",
    zIndex: 30,
    collapsed: false,
  },
  {
    id: "card-4",
    kind: "wellbeing",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "Well-being Events",
    x: 120,
    y: 1200,
    width: 360,
    height: 540,
    color: "#fae8ff",
    zIndex: 40,
    collapsed: false,
  },
  {
    id: "card-5",
    kind: "blank",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "Card 5",
    x: 2040,
    y: 1200,
    width: 740,
    height: 420,
    color: "#fee2e2",
    zIndex: 50,
    collapsed: false,
  },
  {
    id: "card-6",
    kind: "zyta",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "ZYTA Events",
    x: 2720,
    y: 120,
    width: 360,
    height: 540,
    color: "#e0e7ff",
    zIndex: 60,
    collapsed: false,
  },
  {
    id: "card-7",
    kind: "facerec",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "Face Recognize",
    x: 2720,
    y: 920,
    width: 620,
    height: 760,
    color: "#e0f2fe",
    zIndex: 70,
    collapsed: false,
  },
  {
    id: "card-8",
    kind: "devices",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "Device Count",
    x: 820,
    y: 960,
    width: 560,
    height: 520,
    color: "#dcfce7",
    zIndex: 80,
    collapsed: false,
  },
  {
    id: "card-9",
    kind: "users",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "User Management",
    x: 1420,
    y: 960,
    width: 560,
    height: 520,
    color: "#fef3c7",
    zIndex: 90,
    collapsed: false,
  },
  {
    id: "card-10",
    kind: "snapshot",
    filterGroupId: DEFAULT_FILTER_GROUP_ID,
    title: "Snapshot Chart",
    x: 820,
    y: 1500,
    width: 1320,
    height: 620,
    color: "#fae8ff",
    zIndex: 100,
    collapsed: false,
  },
];

function cloneCard(card: SandboxCard): SandboxCard {
  return {
    ...card,
    expandedSize: card.expandedSize ? { ...card.expandedSize } : undefined,
  };
}

function todayValue(): SandboxDateValue {
  const date = new Date();
  return {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
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

function createDefaultState(): CardSandboxState {
  const cards = initialCards.map(cloneCard);
  return {
    cards,
    selectedId: initialCards[1]?.id ?? null,
    filterGroups: createDefaultFilterGroups(),
    activeFilterGroupId: DEFAULT_FILTER_GROUP_ID,
    eventPanels: {
      alertSearch: "",
      wellbeingSearch: "",
      faceSearch: "",
      zytaSearch: "",
    },
  };
}

const initialState: CardSandboxState =
  loadCardSandboxState() ?? createDefaultState();

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `card-${Date.now().toString(36)}`;
}

function normalizeLayers(cards: SandboxCard[]) {
  return [...cards]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((card, index) => ({ ...card, zIndex: (index + 1) * 10 }));
}

function createCard(
  kind: SandboxCardKind,
  index: number,
  maxZ: number,
  filterGroupId: SandboxFilterGroupId
) {
  const isMap = kind === "map";
  const isAlerts =
    kind === "alerts" ||
    kind === "wellbeing" ||
    kind === "zyta";
  const isEventPanel = kind === "facerec";
  const isStatsPanel = kind === "devices" || kind === "users";
  const isSnapshot = kind === "snapshot";
  const isFilters = kind === "filters";
  const isUtility =
    kind === "electric_meter" ||
    kind === "water_meter" ||
    kind === "air_sensor";
  const titleByKind: Record<SandboxCardKind, string> = {
    blank: `Card ${index + 1}`,
    filters: "Main Filters",
    map: "Map Panel",
    alerts: "Alert Events",
    wellbeing: "Well-being Events",
    zyta: "ZYTA Events",
    facerec: "Face Recognize",
    devices: "Device Count",
    users: "User Management",
    snapshot: "Snapshot Chart",
    electric_meter: "Electric Meter",
    water_meter: "Water Meter",
    air_sensor: "Air Sensor",
  };
  return {
    id: createId(),
    kind,
    filterGroupId,
    title: titleByKind[kind],
    x: 120 + (index % 5) * 36,
    y: 96 + (index % 5) * 32,
    width: isSnapshot
      ? 1320
      : isMap
      ? 960
      : isAlerts
      ? 360
      : isEventPanel
      ? 620
      : isStatsPanel
      ? 560
      : isFilters
      ? 360
      : isUtility
      ? 1080
      : 520,
    height: isSnapshot
      ? 720
      : isMap
      ? 780
      : isAlerts
      ? 540
      : isEventPanel
      ? 760
      : isStatsPanel
      ? 520
      : isFilters
      ? 250
      : isUtility
      ? 720
      : 300,
    color: CARD_COLORS[index % CARD_COLORS.length],
    zIndex: maxZ + 10,
    collapsed: false,
  } satisfies SandboxCard;
}

function ensureFilterGroup(
  state: CardSandboxState,
  id: SandboxFilterGroupId
): SandboxFilterGroup {
  if (!state.filterGroups[id]) {
    const fallback =
      FILTER_GROUP_DEFS.find((group) => group.id === id) ??
      FILTER_GROUP_DEFS[0];
    state.filterGroups[id] = createDefaultFilterGroup(fallback);
  }
  return state.filterGroups[id];
}

const slice = createSlice({
  name: "cardSandbox",
  initialState,
  reducers: {
    addCard(state, action: PayloadAction<{ kind?: SandboxCardKind } | undefined>) {
      const index = state.cards.length;
      const maxZ = Math.max(0, ...state.cards.map((card) => card.zIndex));
      const card = createCard(
        action.payload?.kind ?? "blank",
        index,
        maxZ,
        state.activeFilterGroupId
      );
      state.cards.push(card);
      state.selectedId = card.id;
    },
    selectCard(state, action: PayloadAction<SandboxCardId | null>) {
      state.selectedId = action.payload;
      if (!action.payload) return;
      const maxZ = Math.max(0, ...state.cards.map((card) => card.zIndex));
      state.cards = normalizeLayers(
        state.cards.map((card) =>
          card.id === action.payload ? { ...card, zIndex: maxZ + 10 } : card
        )
      );
    },
    updateCardRect(
      state,
      action: PayloadAction<{ id: SandboxCardId; rect: SandboxCardRect }>
    ) {
      const card = state.cards.find((item) => item.id === action.payload.id);
      if (card) Object.assign(card, action.payload.rect);
    },
    toggleCardCollapsed(state, action: PayloadAction<SandboxCardId>) {
      const card = state.cards.find((item) => item.id === action.payload);
      if (!card) return;
      if (card.collapsed) {
        const constraints = getCardResizeConstraints(card.kind);
        card.collapsed = false;
        card.width = Math.max(
          card.expandedSize?.width ?? constraints.minWidth,
          constraints.minWidth
        );
        card.height = Math.max(
          card.expandedSize?.height ?? constraints.minHeight,
          constraints.minHeight
        );
        card.expandedSize = undefined;
        return;
      }
      const constraints = getCardResizeConstraints(card.kind);
      card.collapsed = true;
      card.expandedSize = {
        width: Math.max(card.width, constraints.minWidth),
        height: Math.max(card.height, constraints.minHeight),
      };
      card.width = COLLAPSED_CARD_WIDTH;
      card.height = COLLAPSED_CARD_HEIGHT;
    },
    duplicateCard(state, action: PayloadAction<SandboxCardId>) {
      const source = state.cards.find((card) => card.id === action.payload);
      if (!source) return;
      const maxZ = Math.max(0, ...state.cards.map((card) => card.zIndex));
      const duplicate: SandboxCard = {
        ...source,
        id: createId(),
        title: `${source.title} Copy`,
        x: source.x + 32,
        y: source.y + 32,
        zIndex: maxZ + 10,
      };
      state.cards.push(duplicate);
      state.selectedId = duplicate.id;
    },
    deleteCard(state, action: PayloadAction<SandboxCardId>) {
      const cards = normalizeLayers(
        state.cards.filter((card) => card.id !== action.payload)
      );
      state.cards = cards;
      state.selectedId = cards.at(-1)?.id ?? null;
    },
    setCardFilterGroup(
      state,
      action: PayloadAction<{
        cardId: SandboxCardId;
        filterGroupId: SandboxFilterGroupId;
      }>
    ) {
      ensureFilterGroup(state, action.payload.filterGroupId);
      const card = state.cards.find((item) => item.id === action.payload.cardId);
      if (!card) return;
      card.filterGroupId = action.payload.filterGroupId;
      state.activeFilterGroupId = action.payload.filterGroupId;
    },
    setActiveFilterGroup(state, action: PayloadAction<SandboxFilterGroupId>) {
      ensureFilterGroup(state, action.payload);
      state.activeFilterGroupId = action.payload;
    },
    resetCardSandbox() {
      return createDefaultState();
    },
    setFilterGroupSite(
      state,
      action: PayloadAction<{
        id: SandboxFilterGroupId;
        selectedSite: string;
      }>
    ) {
      const group = ensureFilterGroup(state, action.payload.id);
      group.selectedSite = action.payload.selectedSite;
      group.selectedGroupSite = null;
      group.selectedUtility = null;
    },
    setFilterGroupGroup(
      state,
      action: PayloadAction<{
        id: SandboxFilterGroupId;
        group: SandboxScopeOption;
      }>
    ) {
      const group = ensureFilterGroup(state, action.payload.id);
      group.selectedSite = "all";
      group.selectedGroupSite = action.payload.group;
    },
    setFilterGroupUtility(
      state,
      action: PayloadAction<{
        id: SandboxFilterGroupId;
        utility: SandboxScopeOption;
      }>
    ) {
      const group = ensureFilterGroup(state, action.payload.id);
      group.selectedSite = "all";
      group.selectedUtility = action.payload.utility;
      group.selectedGroupSite = null;
    },
    setFilterGroupDate(
      state,
      action: PayloadAction<{ id: SandboxFilterGroupId; date: SandboxDateValue }>
    ) {
      const group = ensureFilterGroup(state, action.payload.id);
      group.date = action.payload.date;
    },
    toggleFilterGroupEvent(
      state,
      action: PayloadAction<{ id: SandboxFilterGroupId; value: string }>
    ) {
      const group = ensureFilterGroup(state, action.payload.id);
      const value = action.payload.value;
      if (value === "all") {
        group.selectedEvents = ["all"];
        return;
      }
      const previous = group.selectedEvents;
      const has = previous.includes(value);
      const next = has
        ? previous.filter((item) => item !== value)
        : [...previous.filter((item) => item !== "all"), value];
      group.selectedEvents = next.length === 0 ? ["all"] : next;
    },
    setFilterGroupSeverity(
      state,
      action: PayloadAction<{ id: SandboxFilterGroupId; value: string }>
    ) {
      const group = ensureFilterGroup(state, action.payload.id);
      group.severity = action.payload.value;
    },
    setFilterGroupProvince(
      state,
      action: PayloadAction<{ id: SandboxFilterGroupId; value: string }>
    ) {
      const group = ensureFilterGroup(state, action.payload.id);
      group.province = action.payload.value;
    },
    setAlertSearch(state, action: PayloadAction<string>) {
      state.eventPanels.alertSearch = action.payload;
    },
    setWellbeingSearch(state, action: PayloadAction<string>) {
      state.eventPanels.wellbeingSearch = action.payload;
    },
    setFaceSearch(state, action: PayloadAction<string>) {
      state.eventPanels.faceSearch = action.payload;
    },
    setZytaSearch(state, action: PayloadAction<string>) {
      state.eventPanels.zytaSearch = action.payload;
    },
  },
});

export const cardSandboxActions = slice.actions;
export default slice.reducer;

export type { CardSandboxState };
