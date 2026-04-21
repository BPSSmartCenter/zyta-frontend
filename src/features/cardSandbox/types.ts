export type SandboxCardId = string;
export type SandboxCardKind =
  | "blank"
  | "filters"
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

export type SandboxDateValue = {
  y: number;
  m: number;
  d: number;
};

export type SandboxScopeOption = {
  id: string;
  label: string;
} | null;

export type SandboxFilterGroupId = string;

export type SandboxFilterGroup = {
  id: SandboxFilterGroupId;
  label: string;
  color: string;
  selectedSite: string;
  selectedGroupSite: SandboxScopeOption;
  selectedUtility: SandboxScopeOption;
  date: SandboxDateValue;
  selectedEvents: string[];
  severity: string;
  province: string;
};

export type SandboxCard = SandboxCardRect & {
  id: SandboxCardId;
  kind: SandboxCardKind;
  filterGroupId: SandboxFilterGroupId;
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
  filterGroups: Record<SandboxFilterGroupId, SandboxFilterGroup>;
  activeFilterGroupId: SandboxFilterGroupId;
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
