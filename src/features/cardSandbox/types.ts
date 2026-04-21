export type SandboxCardId = string;
export type SandboxCardKind =
  | "blank"
  | "map"
  | "alerts"
  | "wellbeing"
  | "zyta"
  | "facerec"
  | "devices"
  | "users"
  | "snapshot";

export type SandboxCardRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SandboxCard = SandboxCardRect & {
  id: SandboxCardId;
  kind: SandboxCardKind;
  title: string;
  color: string;
  zIndex: number;
  collapsed: boolean;
  expandedSize?: {
    width: number;
    height: number;
  };
};

export type CardSandboxState = {
  cards: SandboxCard[];
  selectedId: SandboxCardId | null;
  mapPanel: {
    selectedEvents: string[];
    severity: string;
    province: string;
  };
  eventPanels: {
    alertSearch: string;
    wellbeingSearch: string;
    faceSearch: string;
    zytaSearch: string;
  };
};

export type ResizeHandle =
  | "n"
  | "e"
  | "s"
  | "w"
  | "ne"
  | "se"
  | "sw"
  | "nw";

export type BoardBounds = {
  width: number;
  height: number;
};
