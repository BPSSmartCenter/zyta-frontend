import React from "react";
import { brandImage } from "../../assets";
import {
  cardSandboxActions,
  selectSandboxFilterGroupForCard,
  selectSandboxFilterGroupList,
  type ResizeHandle,
  type SandboxCard,
  type SandboxFilterGroup,
  SandboxDashboardEventsCard,
  SandboxDashboardWidgetCard,
  SandboxFilterControlCard,
  SandboxMapPanelCard,
  SandboxUtilityPanelCard,
  useCardBoardInteractions,
  useLayeredCards,
  useSandboxPan,
} from "../../features/cardSandbox";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1200;
const BOARD_COLS = 2;
const BOARD_ROWS = 2;
const BOARD_WIDTH = SCREEN_WIDTH * BOARD_COLS;
const BOARD_HEIGHT = SCREEN_HEIGHT * BOARD_ROWS;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.75;
const ZOOM_STEP = 0.1;
const WHEEL_ZOOM_STEP = 0.08;

type SandboxWidgetKind = Extract<
  SandboxCard["kind"],
  "zyta" | "facerec" | "devices" | "users" | "snapshot"
>;

type SandboxUtilityKind = Extract<
  SandboxCard["kind"],
  "electric_meter" | "water_meter" | "air_sensor"
>;

const dashboardWidgetKinds = new Set<SandboxCard["kind"]>([
  "zyta",
  "facerec",
  "devices",
  "users",
  "snapshot",
]);

const utilityPanelKinds = new Set<SandboxCard["kind"]>([
  "electric_meter",
  "water_meter",
  "air_sensor",
]);

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function shouldKeepCardWheel(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest("[data-sandbox-card-scroll]") ||
      target.closest("input, textarea, select")
  );
}

function isDashboardWidgetKind(kind: SandboxCard["kind"]): kind is SandboxWidgetKind {
  return dashboardWidgetKinds.has(kind);
}

function isUtilityPanelKind(kind: SandboxCard["kind"]): kind is SandboxUtilityKind {
  return utilityPanelKinds.has(kind);
}

const resizeHandles: Array<{
  id: ResizeHandle;
  className: string;
  cursor: string;
}> = [
  { id: "nw", className: "-left-1.5 -top-1.5", cursor: "cursor-nwse-resize" },
  { id: "n", className: "left-1/2 -top-1.5 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { id: "ne", className: "-right-1.5 -top-1.5", cursor: "cursor-nesw-resize" },
  { id: "e", className: "-right-1.5 top-1/2 -translate-y-1/2", cursor: "cursor-ew-resize" },
  { id: "se", className: "-right-1.5 -bottom-1.5", cursor: "cursor-nwse-resize" },
  { id: "s", className: "left-1/2 -bottom-1.5 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { id: "sw", className: "-left-1.5 -bottom-1.5", cursor: "cursor-nesw-resize" },
  { id: "w", className: "-left-1.5 top-1/2 -translate-y-1/2", cursor: "cursor-ew-resize" },
];

export default function CardSandboxPage() {
  const viewportRef = React.useRef<HTMLElement | null>(null);
  const boardRef = React.useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const {
    cards,
    selectedId,
    selectedCard,
    selectCard,
    updateCardRect,
    toggleCardCollapsed,
    addCard,
    reset,
    duplicateSelected,
    deleteSelected,
    deleteCard,
  } = useLayeredCards();
  const { activeCardId, interactionKind, startDrag, startResize } =
    useCardBoardInteractions({
      boardRef,
      viewportScale: zoom,
      selectCard,
      updateCardRect,
    });
  const { isPanning, startPan } = useSandboxPan({
    viewportRef,
    onPanStart: () => selectCard(null),
  });
  const zoomPercent = Math.round(zoom * 100);
  const zoomOut = React.useCallback(() => {
    setZoom((value) => clampZoom(value - ZOOM_STEP));
  }, []);
  const zoomIn = React.useCallback(() => {
    setZoom((value) => clampZoom(value + ZOOM_STEP));
  }, []);
  const resetZoom = React.useCallback(() => {
    setZoom(1);
  }, []);
  const handleWheelZoom = React.useCallback((event: React.WheelEvent<HTMLElement>) => {
    if (event.deltaY === 0 || shouldKeepCardWheel(event.target)) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    event.preventDefault();

    const viewportRect = viewport.getBoundingClientRect();
    const pointerX = event.clientX - viewportRect.left;
    const pointerY = event.clientY - viewportRect.top;
    const scrollX = viewport.scrollLeft + pointerX;
    const scrollY = viewport.scrollTop + pointerY;
    const direction = event.deltaY < 0 ? 1 : -1;

    setZoom((currentZoom) => {
      const nextZoom = clampZoom(currentZoom + direction * WHEEL_ZOOM_STEP);
      if (nextZoom === currentZoom) return currentZoom;

      const scaleRatio = nextZoom / currentZoom;

      window.requestAnimationFrame(() => {
        viewport.scrollLeft = scrollX * scaleRatio - pointerX;
        viewport.scrollTop = scrollY * scaleRatio - pointerY;
      });

      return nextZoom;
    });
  }, []);

  const renderOrder = React.useMemo(
    () => [...cards].sort((a, b) => a.zIndex - b.zIndex),
    [cards]
  );

  return (
    <main className="relative min-h-screen bg-[#eef2f7] text-slate-900">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex justify-center bg-transparent px-4">
        <img
          src={brandImage}
          alt="BPS"
          className="h-20 w-auto object-contain drop-shadow-[0_8px_22px_rgba(15,23,42,0.18)]"
        />
      </header>

      <div className="grid h-screen grid-cols-[minmax(0,1fr)]">
        <section
          ref={viewportRef}
          onPointerDown={startPan}
          onWheel={handleWheelZoom}
          className={`overflow-auto overscroll-contain bg-[#dfe6ef] ${
            isPanning ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <div className="p-0">
            <div
              className="relative"
              style={{
                width: BOARD_WIDTH * zoom,
                height: BOARD_HEIGHT * zoom,
              }}
            >
              <div
                ref={boardRef}
                className="relative origin-top-left rounded-lg border border-slate-300 bg-white shadow-sm"
                style={{
                  width: BOARD_WIDTH,
                  height: BOARD_HEIGHT,
                  transform: `scale(${zoom})`,
                  backgroundImage:
                    "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              >
                {renderOrder.map((card) => (
                  <SandboxLayerCard
                    key={card.id}
                    card={card}
                    selected={selectedId === card.id}
                    active={activeCardId === card.id}
                    interactionKind={interactionKind}
                    onSelect={selectCard}
                    onToggleCollapsed={toggleCardCollapsed}
                    onDelete={deleteCard}
                    onStartDrag={startDrag}
                    onStartResize={startResize}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[1000] flex justify-center px-4">
        <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 overflow-x-auto rounded-2xl border border-white/70 bg-white/70 p-2 shadow-[0_18px_54px_rgba(15,23,42,0.22)] backdrop-blur-2xl ring-1 ring-slate-900/5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ToolButton
            icon="tune"
            label="Add filter card"
            onClick={() => addCard("filters")}
          />
          <ToolButton
            icon="map"
            label="Add map card"
            onClick={() => addCard("map")}
          />
          <ToolButton
            icon="notifications"
            label="Add alert events card"
            onClick={() => addCard("alerts")}
          />
          <ToolButton
            icon="health_and_safety"
            label="Add wellbeing card"
            onClick={() => addCard("wellbeing")}
          />
          <ToolButton
            icon="security"
            label="Add ZYTA events card"
            onClick={() => addCard("zyta")}
          />
          <ToolButton
            icon="face"
            label="Add face recognize card"
            onClick={() => addCard("facerec")}
          />
          <ToolButton
            icon="devices"
            label="Add devices card"
            onClick={() => addCard("devices")}
          />
          <ToolButton
            icon="manage_accounts"
            label="Add user management card"
            onClick={() => addCard("users")}
          />
          <ToolButton
            icon="bar_chart"
            label="Add snapshot chart card"
            onClick={() => addCard("snapshot")}
          />
          <ToolButton
            icon="bolt"
            label="Add electric meter card"
            onClick={() => addCard("electric_meter")}
          />
          <ToolButton
            icon="water_drop"
            label="Add water meter card"
            onClick={() => addCard("water_meter")}
          />
          <ToolButton
            icon="air"
            label="Add air sensor card"
            onClick={() => addCard("air_sensor")}
          />
          <ToolButton
            icon="content_copy"
            label="Duplicate"
            onClick={duplicateSelected}
            disabled={!selectedCard}
          />
          <ToolButton
            icon="delete"
            label="Delete"
            onClick={deleteSelected}
            disabled={!selectedCard}
            danger
          />
          <div className="mx-1 h-6 w-px shrink-0 bg-slate-300/70" />
          <ToolButton
            icon="zoom_out"
            label="Zoom out"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
          />
          <button
            type="button"
            onClick={resetZoom}
            title="Reset zoom"
            aria-label="Reset zoom"
            className="h-9 min-w-[64px] shrink-0 rounded-md border border-white/70 bg-white/45 px-2 text-sm font-semibold tabular-nums text-slate-700 shadow-sm transition hover:bg-white/75"
          >
            {zoomPercent}%
          </button>
          <ToolButton
            icon="zoom_in"
            label="Zoom in"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
          />
          <div className="mx-1 h-6 w-px shrink-0 bg-slate-300/70" />
          <ToolButton icon="restart_alt" label="Reset" onClick={reset} />
        </div>
      </div>
    </main>
  );
}

function SandboxLayerCard({
  card,
  selected,
  active,
  interactionKind,
  onSelect,
  onToggleCollapsed,
  onDelete,
  onStartDrag,
  onStartResize,
}: {
  card: SandboxCard;
  selected: boolean;
  active: boolean;
  interactionKind: "drag" | "resize" | null;
  onSelect: (id: string | null) => void;
  onToggleCollapsed: (id: string) => void;
  onDelete: (id: string) => void;
  onStartDrag: (event: React.PointerEvent, card: SandboxCard) => void;
  onStartResize: (
    event: React.PointerEvent,
    card: SandboxCard,
    handle: ResizeHandle
  ) => void;
}) {
  const dispatch = useAppDispatch();
  const filterGroups = useAppSelector(selectSandboxFilterGroupList);
  const filterGroup = useAppSelector((state) =>
    selectSandboxFilterGroupForCard(state, card.id)
  );
  const groupColor = filterGroup?.color ?? card.color;
  const displayTitle =
    card.kind === "filters" && filterGroup
      ? getFilterGroupTitle(filterGroup)
      : card.title;
  const cardNumber = getCardNumber(card.title);

  if (card.collapsed) {
    return (
      <div
        data-sandbox-card="true"
        role="button"
        tabIndex={0}
        onPointerDown={(event) => {
          event.stopPropagation();
          onStartDrag(event, card);
        }}
        onDoubleClick={() => onToggleCollapsed(card.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            onToggleCollapsed(card.id);
          }
        }}
        className={`group/card absolute grid cursor-grab place-items-center overflow-hidden rounded-lg border text-left shadow-[0_14px_36px_rgba(15,23,42,0.16)] outline-none transition-shadow active:cursor-grabbing ${
          selected
            ? "border-[#3AB8EE] ring-2 ring-[#3AB8EE]/35"
            : "border-slate-300"
        } ${active && interactionKind === "drag" ? "shadow-[0_18px_44px_rgba(15,23,42,0.24)]" : ""}`}
        style={{
          left: card.x,
          top: card.y,
          width: card.width,
          height: card.height,
          zIndex: card.zIndex,
          backgroundColor: groupColor,
        }}
      >
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDelete(card.id)}
          aria-label={`Close ${displayTitle}`}
          title="Close card"
          className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded bg-white/60 text-slate-600 opacity-75 transition hover:bg-white hover:text-red-600 hover:opacity-100"
        >
          <span className="material-icons-outlined text-[14px]">close</span>
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onToggleCollapsed(card.id)}
          aria-label={`Expand ${displayTitle}`}
          title="Expand card"
          className="grid h-10 w-10 place-items-center rounded-md text-2xl font-black tabular-nums text-slate-950 transition hover:bg-white/45"
        >
          {cardNumber}
        </button>
      </div>
    );
  }

  return (
    <div
      data-sandbox-card="true"
      role="button"
      tabIndex={0}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(card.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(card.id);
      }}
      className={`absolute overflow-visible rounded-lg border bg-white text-left shadow-[0_14px_36px_rgba(15,23,42,0.16)] outline-none transition-shadow ${
        selected
          ? "border-[#3AB8EE] ring-2 ring-[#3AB8EE]/35"
          : "border-slate-300"
      } ${active && interactionKind === "drag" ? "shadow-[0_18px_44px_rgba(15,23,42,0.24)]" : ""}`}
      style={{
        left: card.x,
        top: card.y,
        width: card.width,
        height: card.height,
        zIndex: card.zIndex,
      }}
    >
      <div
        onPointerDown={(event) => onStartDrag(event, card)}
        className="grid h-11 cursor-grab grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-t-lg border-b border-slate-200 px-3 active:cursor-grabbing"
        style={{ backgroundColor: groupColor }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <SandboxGroupColorPicker
            cardId={card.id}
            groups={filterGroups}
            selectedGroup={filterGroup}
            onSelect={(filterGroupId) =>
              dispatch(
                cardSandboxActions.setCardFilterGroup({
                  cardId: card.id,
                  filterGroupId,
                })
              )
            }
          />
          <span className="min-w-0 truncate text-xs font-bold uppercase text-slate-900">
            {displayTitle}
          </span>
        </div>

        <span aria-hidden="true" />

        <div className="flex shrink-0 items-center justify-self-end gap-1">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onToggleCollapsed(card.id)}
            aria-label={`Collapse ${displayTitle}`}
            title="Collapse card"
            className="grid h-6 w-6 place-items-center rounded bg-white/55 text-slate-600 transition hover:bg-white hover:text-slate-950"
          >
            <span className="material-icons-outlined text-[16px]">remove</span>
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onDelete(card.id)}
            aria-label={`Close ${displayTitle}`}
            title="Close card"
            className="grid h-6 w-6 place-items-center rounded bg-white/55 text-slate-600 transition hover:bg-white hover:text-red-600"
          >
            <span className="material-icons-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      <div
        className={`h-[calc(100%-2.75rem)] rounded-b-lg p-4 ${
          card.kind === "filters" ? "overflow-visible" : "overflow-hidden"
        }`}
      >
        {card.kind === "filters" ? (
          <div className="h-full overflow-visible bg-white">
            <SandboxFilterControlCard cardId={card.id} />
          </div>
        ) : card.kind === "map" ? (
          <div className="h-full overflow-hidden bg-white">
            <SandboxMapPanelCard cardId={card.id} />
          </div>
        ) : card.kind === "alerts" || card.kind === "wellbeing" ? (
          <div
            data-sandbox-card-scroll="true"
            className="h-full overflow-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <SandboxDashboardEventsCard cardId={card.id} variant={card.kind} />
          </div>
        ) : isDashboardWidgetKind(card.kind) ? (
          <div
            data-sandbox-card-scroll="true"
            className="h-full overflow-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <SandboxDashboardWidgetCard cardId={card.id} variant={card.kind} />
          </div>
        ) : isUtilityPanelKind(card.kind) ? (
          <div
            data-sandbox-card-scroll="true"
            className="h-full overflow-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <SandboxUtilityPanelCard cardId={card.id} variant={card.kind} />
          </div>
        ) : (
          <div className="h-full border border-dashed border-slate-300 bg-white/70" />
        )}
      </div>

      {selected &&
        !card.collapsed &&
        resizeHandles.map((handle) => (
          <button
            key={handle.id}
            type="button"
            aria-label={`Resize ${handle.id}`}
            onPointerDown={(event) => onStartResize(event, card, handle.id)}
            className={`absolute h-3 w-3 rounded-full border border-[#0063bf] bg-white shadow ${handle.className} ${handle.cursor}`}
          />
        ))}
    </div>
  );
}

function SandboxGroupColorPicker({
  cardId,
  groups,
  selectedGroup,
  onSelect,
}: {
  cardId: string;
  groups: SandboxFilterGroup[];
  selectedGroup: SandboxFilterGroup | null;
  onSelect: (filterGroupId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative shrink-0"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label={`Select group for ${cardId}`}
        title={selectedGroup?.label ?? "Select group"}
        onClick={() => setOpen((value) => !value)}
        className="grid h-7 w-7 place-items-center rounded-md bg-white/65 shadow-sm ring-1 ring-white/70 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        <span
          className="h-4 w-4 rounded-full border border-slate-400/35"
          style={{ backgroundColor: selectedGroup?.color ?? "#e2e8f0" }}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[1500] mt-2 w-36 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                onSelect(group.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <span
                className="h-4 w-4 rounded-full border border-slate-300"
                style={{ backgroundColor: group.color }}
              />
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
              {selectedGroup?.id === group.id && (
                <span className="material-icons-outlined text-[15px] text-[#0877A8]">
                  check
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getFilterGroupTitle(group: SandboxFilterGroup) {
  if (group.selectedSite && group.selectedSite !== "all") {
    return group.selectedSite;
  }
  return (
    group.selectedGroupSite?.label ??
    group.selectedUtility?.label ??
    "All sites"
  );
}

function getCardNumber(title: string) {
  return title.match(/\d+/)?.[0] ?? "#";
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-md border text-sm transition ${
        danger
          ? "border-red-100/80 bg-white/45 text-red-600 shadow-sm hover:bg-red-50/90"
          : "border-white/70 bg-white/45 text-slate-700 shadow-sm hover:bg-white/75 hover:text-slate-950"
      } disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent`}
    >
      <span className="material-icons-outlined text-[20px]">{icon}</span>
    </button>
  );
}
