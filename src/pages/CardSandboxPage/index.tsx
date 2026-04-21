import React from "react";
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
  useCardBoardInteractions,
  useLayeredCards,
  useSandboxPan,
} from "../../features/cardSandbox";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;
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

const dashboardWidgetKinds = new Set<SandboxCard["kind"]>([
  "zyta",
  "facerec",
  "devices",
  "users",
  "snapshot",
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
    bringSelectedFront,
    sendSelectedBack,
    bringSelectedForward,
    sendSelectedBackward,
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
    <main className="min-h-screen bg-[#eef2f7] text-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#123A42] text-white shadow-sm">
            <span className="material-icons-outlined text-[20px]">dashboard_customize</span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-950">
              Card Sandbox
            </h1>
            <p className="truncate text-xs text-slate-500">
              Layered draggable and resizable card prototype
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ToolButton icon="add" label="Add card" onClick={() => addCard()} />
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
          <div className="mx-1 h-6 w-px bg-slate-200" />
          <ToolButton
            icon="flip_to_front"
            label="Bring front"
            onClick={bringSelectedFront}
            disabled={!selectedCard}
          />
          <ToolButton
            icon="keyboard_arrow_up"
            label="Bring forward"
            onClick={bringSelectedForward}
            disabled={!selectedCard}
          />
          <ToolButton
            icon="keyboard_arrow_down"
            label="Send backward"
            onClick={sendSelectedBackward}
            disabled={!selectedCard}
          />
          <ToolButton
            icon="flip_to_back"
            label="Send back"
            onClick={sendSelectedBack}
            disabled={!selectedCard}
          />
          <div className="mx-1 h-6 w-px bg-slate-200" />
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
            className="h-9 min-w-[64px] rounded-md border border-slate-200 px-2 text-sm font-semibold tabular-nums text-slate-700 transition hover:bg-slate-100"
          >
            {zoomPercent}%
          </button>
          <ToolButton
            icon="zoom_in"
            label="Zoom in"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
          />
          <div className="mx-1 h-6 w-px bg-slate-200" />
          <ToolButton icon="restart_alt" label="Reset" onClick={reset} />
        </div>
      </header>

      <div className="grid h-[calc(100vh-4rem)] grid-cols-[minmax(0,1fr)]">
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
                <ScreenGuides />
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

        {/* <aside className="border-l border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4">
            <h2 className="text-sm font-semibold text-slate-950">Inspector</h2>
            {selectedCard ? (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Metric label="X" value={Math.round(selectedCard.x)} />
                <Metric label="Y" value={Math.round(selectedCard.y)} />
                <Metric label="W" value={Math.round(selectedCard.width)} />
                <Metric label="H" value={Math.round(selectedCard.height)} />
                <Metric label="Zoom" value={zoomPercent} suffix="%" />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No selection</p>
            )}
          </div>

          <div className="px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-950">Layers</h2>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {cards.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {layerOrder.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => selectCard(card.id)}
                  className={`flex h-10 items-center gap-2 rounded-md border px-2 text-left transition ${
                    selectedId === card.id
                      ? "border-[#3AB8EE] bg-[#3AB8EE]/10 text-[#0063bf]"
                      : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-slate-300"
                    style={{ backgroundColor: card.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {card.title}
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">
                    {card.zIndex}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside> */}
      </div>
    </main>
  );
}

function ScreenGuides() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {Array.from({ length: BOARD_ROWS }).map((_, row) =>
        Array.from({ length: BOARD_COLS }).map((__, col) => {
          const index = row * BOARD_COLS + col + 1;
          return (
            <div
              key={`${row}-${col}`}
              className="absolute border border-dashed border-sky-500/45"
              style={{
                left: col * SCREEN_WIDTH,
                top: row * SCREEN_HEIGHT,
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
              }}
            >
              <span className="absolute left-4 top-4 rounded-md border border-sky-200 bg-white/85 px-2 py-1 text-xs font-semibold text-sky-700 shadow-sm">
                Screen {index} · 1920x1080
              </span>
            </div>
          );
        })
      )}
      <div
        className="absolute top-0 bottom-0 border-l-2 border-sky-600/55"
        style={{ left: SCREEN_WIDTH }}
      />
      <div
        className="absolute left-0 right-0 border-t-2 border-sky-600/55"
        style={{ top: SCREEN_HEIGHT }}
      />
    </div>
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
          aria-label={`Close ${card.title}`}
          title="Close card"
          className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded bg-white/60 text-slate-600 opacity-75 transition hover:bg-white hover:text-red-600 hover:opacity-100"
        >
          <span className="material-icons-outlined text-[14px]">close</span>
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onToggleCollapsed(card.id)}
          aria-label={`Expand ${card.title}`}
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
            {card.title}
          </span>
        </div>

        <span aria-hidden="true" />

        <div className="flex shrink-0 items-center justify-self-end gap-1">
          <span className="rounded bg-white/60 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
            z {card.zIndex}
          </span>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onToggleCollapsed(card.id)}
            aria-label={`Collapse ${card.title}`}
            title="Collapse card"
            className="grid h-6 w-6 place-items-center rounded bg-white/55 text-slate-600 transition hover:bg-white hover:text-slate-950"
          >
            <span className="material-icons-outlined text-[16px]">remove</span>
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onDelete(card.id)}
            aria-label={`Close ${card.title}`}
            title="Close card"
            className="grid h-6 w-6 place-items-center rounded bg-white/55 text-slate-600 transition hover:bg-white hover:text-red-600"
          >
            <span className="material-icons-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      <div
        className={`h-[calc(100%-2.75rem)] rounded-b-lg p-3 ${
          card.kind === "filters" ? "overflow-visible" : "overflow-hidden"
        }`}
      >
        {card.kind === "filters" ? (
          <div className="h-full overflow-visible rounded-md border border-slate-200 bg-white">
            <SandboxFilterControlCard cardId={card.id} />
          </div>
        ) : card.kind === "map" ? (
          <div
            data-sandbox-card-scroll="true"
            className="h-full overflow-auto rounded-md border border-slate-200 bg-white"
          >
            <SandboxMapPanelCard cardId={card.id} />
          </div>
        ) : card.kind === "alerts" || card.kind === "wellbeing" ? (
          <div
            data-sandbox-card-scroll="true"
            className="h-full overflow-auto rounded-md border border-slate-200 bg-white"
          >
            <SandboxDashboardEventsCard cardId={card.id} variant={card.kind} />
          </div>
        ) : isDashboardWidgetKind(card.kind) ? (
          <div
            data-sandbox-card-scroll="true"
            className="h-full overflow-auto rounded-md border border-slate-200 bg-white"
          >
            <SandboxDashboardWidgetCard cardId={card.id} variant={card.kind} />
          </div>
        ) : (
          <div className="h-full rounded-md border border-dashed border-slate-300 bg-white/70" />
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
          ? "border-red-100 text-red-600 hover:bg-red-50"
          : "border-slate-200 text-slate-700 hover:bg-slate-100"
      } disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent`}
    >
      <span className="material-icons-outlined text-[20px]">{icon}</span>
    </button>
  );
}
