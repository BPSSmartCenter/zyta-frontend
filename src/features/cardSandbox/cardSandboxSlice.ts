import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  CardSandboxState,
  SandboxCard,
  SandboxCardId,
  SandboxCardKind,
  SandboxCardRect,
} from "./types";
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

const initialCards: SandboxCard[] = [
  {
    id: "card-1",
    kind: "blank",
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
    title: "Card 3",
    x: 2040,
    y: 120,
    width: 620,
    height: 760,
    color: "#fef3c7",
    zIndex: 30,
    collapsed: false,
  },
  {
    id: "card-4",
    kind: "wellbeing",
    title: "Card 4",
    x: 120,
    y: 1200,
    width: 620,
    height: 760,
    color: "#fae8ff",
    zIndex: 40,
    collapsed: false,
  },
  {
    id: "card-5",
    kind: "blank",
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
    title: "ZYTA Events",
    x: 2720,
    y: 120,
    width: 620,
    height: 760,
    color: "#e0e7ff",
    zIndex: 60,
    collapsed: false,
  },
  {
    id: "card-7",
    kind: "facerec",
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

function createDefaultState(): CardSandboxState {
  return {
    cards: initialCards.map(cloneCard),
    selectedId: initialCards[1]?.id ?? null,
    mapPanel: {
      selectedEvents: ["all"],
      severity: "all",
      province: "all",
    },
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

function swapLayer(
  cards: SandboxCard[],
  id: SandboxCardId,
  direction: "up" | "down"
) {
  const sorted = normalizeLayers(cards);
  const currentIndex = sorted.findIndex((card) => card.id === id);
  const targetIndex =
    direction === "up" ? currentIndex + 1 : currentIndex - 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sorted.length) {
    return sorted;
  }
  const currentZ = sorted[currentIndex].zIndex;
  sorted[currentIndex] = {
    ...sorted[currentIndex],
    zIndex: sorted[targetIndex].zIndex,
  };
  sorted[targetIndex] = { ...sorted[targetIndex], zIndex: currentZ };
  return normalizeLayers(sorted);
}

function createCard(kind: SandboxCardKind, index: number, maxZ: number) {
  const isMap = kind === "map";
  const isEventPanel =
    kind === "alerts" ||
    kind === "wellbeing" ||
    kind === "zyta" ||
    kind === "facerec";
  const isStatsPanel = kind === "devices" || kind === "users";
  const isSnapshot = kind === "snapshot";
  const titleByKind: Record<SandboxCardKind, string> = {
    blank: `Card ${index + 1}`,
    map: "Map Panel",
    alerts: "Alert Events",
    wellbeing: "Well-being Events",
    zyta: "ZYTA Events",
    facerec: "Face Recognize",
    devices: "Device Count",
    users: "User Management",
    snapshot: "Snapshot Chart",
  };
  return {
    id: createId(),
    kind,
    title: titleByKind[kind],
    x: 120 + (index % 5) * 36,
    y: 96 + (index % 5) * 32,
    width: isSnapshot ? 1320 : isMap ? 960 : isEventPanel ? 620 : isStatsPanel ? 560 : 520,
    height: isSnapshot ? 720 : isMap ? 780 : isEventPanel ? 760 : isStatsPanel ? 520 : 300,
    color: CARD_COLORS[index % CARD_COLORS.length],
    zIndex: maxZ + 10,
    collapsed: false,
  } satisfies SandboxCard;
}

const slice = createSlice({
  name: "cardSandbox",
  initialState,
  reducers: {
    addCard(state, action: PayloadAction<{ kind?: SandboxCardKind } | undefined>) {
      const index = state.cards.length;
      const maxZ = Math.max(0, ...state.cards.map((card) => card.zIndex));
      const card = createCard(action.payload?.kind ?? "blank", index, maxZ);
      state.cards.push(card);
      state.selectedId = card.id;
    },
    selectCard(state, action: PayloadAction<SandboxCardId | null>) {
      state.selectedId = action.payload;
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
        card.collapsed = false;
        card.width = card.expandedSize?.width ?? 260;
        card.height = card.expandedSize?.height ?? 160;
        card.expandedSize = undefined;
        return;
      }
      card.collapsed = true;
      card.expandedSize = {
        width: card.width,
        height: card.height,
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
    bringCardFront(state, action: PayloadAction<SandboxCardId>) {
      const maxZ = Math.max(0, ...state.cards.map((card) => card.zIndex));
      state.cards = normalizeLayers(
        state.cards.map((card) =>
          card.id === action.payload ? { ...card, zIndex: maxZ + 10 } : card
        )
      );
    },
    sendCardBack(state, action: PayloadAction<SandboxCardId>) {
      const minZ = Math.min(0, ...state.cards.map((card) => card.zIndex));
      state.cards = normalizeLayers(
        state.cards.map((card) =>
          card.id === action.payload ? { ...card, zIndex: minZ - 10 } : card
        )
      );
    },
    bringCardForward(state, action: PayloadAction<SandboxCardId>) {
      state.cards = swapLayer(state.cards, action.payload, "up");
    },
    sendCardBackward(state, action: PayloadAction<SandboxCardId>) {
      state.cards = swapLayer(state.cards, action.payload, "down");
    },
    resetCardSandbox() {
      return createDefaultState();
    },
    toggleMapEvent(state, action: PayloadAction<string>) {
      const value = action.payload;
      if (value === "all") {
        state.mapPanel.selectedEvents = ["all"];
        return;
      }
      const previous = state.mapPanel.selectedEvents;
      const has = previous.includes(value);
      const next = has
        ? previous.filter((item) => item !== value)
        : [...previous.filter((item) => item !== "all"), value];
      state.mapPanel.selectedEvents = next.length === 0 ? ["all"] : next;
    },
    setMapSeverity(state, action: PayloadAction<string>) {
      state.mapPanel.severity = action.payload;
    },
    setMapProvince(state, action: PayloadAction<string>) {
      state.mapPanel.province = action.payload;
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
