import {
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

export type GlassHoverSidebarItem = {
  id: string;
  label: string;
  section?: boolean;
  icon?: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  badge?: string | number;
  children?: GlassHoverSidebarItem[];
  onSelect?: () => void;
};

export type GlassHoverSidebarAccount = {
  name: string;
  email?: string;
  avatarSrc?: string;
};

type GlassHoverSidebarProps = {
  title?: string;
  subtitle?: string;
  logo?: ReactNode;
  headerSlot?: ReactNode;
  items: GlassHoverSidebarItem[];
  footerItems?: GlassHoverSidebarItem[];
  account?: GlassHoverSidebarAccount;
  ariaLabel?: string;
  toggleLabel?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onLogout?: () => void;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function handleItemSelect(
  event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
  item: GlassHoverSidebarItem,
  onActivate?: () => void
) {
  if (item.disabled) {
    event.preventDefault();
    return;
  }

  if (item.onSelect) {
    event.preventDefault();
    item.onSelect();
  }

  onActivate?.();
}

function SidebarItem({
  item,
  depth = 0,
  compactDesktop = false,
  onActivate,
  hideCompactDivider = false,
}: {
  item: GlassHoverSidebarItem;
  depth?: number;
  compactDesktop?: boolean;
  onActivate?: () => void;
  hideCompactDivider?: boolean;
}) {
  if (item.section) {
    return (
      <li
        className={cx(
          depth > 0 && "pl-8",
          compactDesktop ? "pt-2 first:pt-0" : "pt-4 first:pt-0"
        )}
      >
        {compactDesktop && !hideCompactDivider ? (
          <div
            className="hidden lg:ml-auto lg:mr-3 lg:block lg:w-11 lg:border-t lg:border-slate-200/70"
            aria-hidden="true"
          />
        ) : null}
        {!compactDesktop ? (
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition-all">
            {item.label}
          </div>
        ) : null}
      </li>
    );
  }

  const interactiveClassName = cx(
    "group/item flex min-h-[38px] w-full items-center gap-2.5 rounded-[16px] px-3 text-left text-[15px] font-medium outline-none transition",
    "focus-visible:ring-4 focus-visible:ring-cyan-400/15",
    depth > 0 && "min-h-[34px] text-[14px]",
    compactDesktop &&
      "lg:ml-auto lg:mr-4 lg:min-h-[44px] lg:w-11 lg:justify-center ",
    item.active
      ? "bg-gradient-to-r from-[#EAF7FD] via-[#F5FBFF] to-white text-[#0877A8] shadow-[inset_0_0_0_1px_rgba(58,184,238,0.18)]"
      : "text-slate-600 hover:bg-gradient-to-r hover:from-[#EDF9FE] hover:via-white hover:to-[#F3FBFF] hover:text-[#0877A8]",
    item.disabled && "pointer-events-none cursor-not-allowed opacity-35"
  );

  const icon = item.icon ? (
    <span
      className={cx(
        "material-icons-outlined h-6 w-6 shrink-0 flex items-center justify-center m-auto text-[20px] leading-none transition",
        item.active
          ? "text-[#0877A8] "
          : "text-slate-500 group-hover/item:text-slate-900"
      )}
      aria-hidden="true"
    >
      {item.icon}
    </span>
  ) : null;

  const label = (
    <>
      {icon}
      {!compactDesktop ? (
        <span className="min-w-0 flex-1 truncate transition-all">
          {item.label}
        </span>
      ) : null}
      {item.badge !== undefined ? (
        <span
          className={cx(
            "rounded-full px-2 py-0.5 text-[11px] font-bold transition-all",
            compactDesktop && "hidden",
            item.active ? "bg-white text-[#0877A8]" : "bg-slate-100 text-slate-500"
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </>
  );

  return (
    <li className={cx(depth > 0 && "pl-8")}>
      {item.href ? (
        <a
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          aria-disabled={item.disabled || undefined}
          className={interactiveClassName}
          onClick={(event) => handleItemSelect(event, item, onActivate)}
        >
          {label}
        </a>
      ) : (
        <button
          type="button"
          aria-current={item.active ? "page" : undefined}
          disabled={item.disabled}
          className={interactiveClassName}
          onClick={(event) => handleItemSelect(event, item, onActivate)}
        >
          {label}
        </button>
      )}

      {item.children?.length ? (
        <ul className="mt-1 space-y-0.5">
          {item.children.map((child) => (
            <SidebarItem
              key={child.id}
              item={child}
              depth={depth + 1}
              compactDesktop={compactDesktop}
              onActivate={onActivate}
              hideCompactDivider={hideCompactDivider}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function GlassHoverSidebar({
  title = "BPS Command",
  subtitle = "Operations Center",
  logo,
  headerSlot,
  items,
  footerItems = [],
  account,
  ariaLabel = "Application sidebar",
  toggleLabel: _toggleLabel = "Toggle sidebar",
  className,
  open = false,
  onOpenChange: _onOpenChange,
  onLogout,
}: GlassHoverSidebarProps) {
  const asideRef = useRef<HTMLElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const expanded = open || (!selectionLocked && (isHovered || isFocusWithin));
  const compactDesktop = !expanded;

  const blurActiveSidebarElement = () => {
    if (typeof document === "undefined") return;
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) return;
    if (!asideRef.current?.contains(activeElement)) return;
    activeElement.blur();
  };

  const handleItemActivate = () => {
    setSelectionLocked(true);
    setIsHovered(false);
    setIsFocusWithin(false);
    blurActiveSidebarElement();
  };

  const handleMouseEnter = () => {
    if (!open) {
      setSelectionLocked(false);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setSelectionLocked(false);
  };

  const handleFocusCapture = () => {
    setSelectionLocked(false);
    setIsFocusWithin(true);
  };

  const handleBlurCapture = (event: FocusEvent<HTMLElement>) => {
    const currentTarget = event.currentTarget;
    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      const nextFocusWithin =
        activeElement instanceof Node && currentTarget.contains(activeElement);
      setIsFocusWithin(nextFocusWithin);
      if (!nextFocusWithin && !isHovered) {
        setSelectionLocked(false);
      }
    });
  };

  const firstSectionId = [...items, ...footerItems].find(
    (item) => item.section
  )?.id;
  const lastSectionId = [...items, ...footerItems]
    .slice()
    .reverse()
    .find((item) => item.section)?.id;

  return (
    <aside
      ref={asideRef}
      aria-label={ariaLabel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      className={cx(
        "group/sidebar pointer-events-none fixed left-0 top-0 z-[1100] h-dvh w-[296px]",
        className
      )}
    >
      <div
        className="pointer-events-auto absolute left-0 top-0 h-full w-6"
        aria-hidden="true"
      />

      <div
        className={cx(
          "pointer-events-auto absolute left-0 top-0 h-full w-[272px]",
          "transition-transform duration-300 ease-out motion-reduce:transition-none",
          expanded
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-[calc(-100%+76px)]"
        )}
      >
        {/* <button
          type="button"
          className="absolute right-[-18px] top-[22px] z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.12)] outline-none transition hover:bg-white focus-visible:ring-4 focus-visible:ring-cyan-400/15"
          aria-label={toggleLabel}
          aria-expanded={open}
          onClick={() => onOpenChange?.(!open)}
        >
          <span
            className={cx(
              "material-icons-outlined text-[20px] transition",
              open && "rotate-180"
            )}
          >
            chevron_right
          </span>
        </button> */}

        <div className="flex h-full flex-col overflow-hidden rounded-r-[10px] border border-slate-200/70 border-l-0 bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div
            className={cx(
              "border-b border-slate-200/70 p-4 transition-all",
              compactDesktop && ""
            )}
          >
            <div
              className={cx(
                "flex items-center gap-3",
                compactDesktop && "lg:justify-end"
              )}
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl">
                {logo ?? (
                  <span className="material-icons-outlined text-[24px] text-[#0877A8]">
                    dashboard
                  </span>
                )}
              </div>
              <div
                className={cx(
                  "min-w-0 transition-all",
                  compactDesktop && "hidden"
                )}
              >
                <p className="truncate text-sm font-bold text-slate-950">
                  {title}
                </p>
                <p className="truncate text-xs font-medium text-slate-500">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>

          {headerSlot ? (
            <div
              className={cx(
                "border-b border-slate-200/70 px-4 py-3",
                compactDesktop && "hidden"
              )}
            >
              {headerSlot}
            </div>
          ) : null}

          <div
            className={cx(
              "min-h-0 flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              compactDesktop && "lg:px-0"
            )}
          >
            <nav>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    compactDesktop={compactDesktop}
                    onActivate={handleItemActivate}
                    hideCompactDivider={
                      item.section &&
                      (item.id === firstSectionId || item.id === lastSectionId)
                    }
                  />
                ))}
              </ul>
            </nav>
          </div>

          {(footerItems.length > 0 || account || onLogout) ? (
            <div
              className={cx(
                "shrink-0 border-t border-slate-200/70 px-3 py-3",
                compactDesktop && "lg:px-2"
              )}
            >
              {footerItems.length > 0 ? (
                <ul
                  className={cx(
                    "space-y-0.5",
                    compactDesktop && "hidden"
                  )}
                >
                  {footerItems.map((item) => (
                    <SidebarItem
                      key={item.id}
                      item={item}
                      compactDesktop={compactDesktop}
                      onActivate={handleItemActivate}
                      hideCompactDivider={
                        item.section &&
                        (item.id === firstSectionId || item.id === lastSectionId)
                      }
                    />
                  ))}
                </ul>
              ) : null}

              {(account || onLogout) ? (
                <div
                  className={cx(
                    "mt-3 flex items-center rounded-[20px] bg-slate-50/80 px-3 py-3 transition-all",
                    compactDesktop &&
                      "lg:justify-center lg:rounded-full lg:bg-transparent lg:px-0 lg:py-2"
                  )}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100">
                    {account?.avatarSrc ? (
                      <img
                        src={account.avatarSrc}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="material-icons-outlined text-[20px] text-slate-500">
                        person
                      </span>
                    )}
                  </div>
                  <div
                    className={cx(
                      "min-w-0 flex-1 transition-all",
                      compactDesktop && "hidden"
                    )}
                  >
                    <p className="truncate text-sm font-bold text-slate-900">
                      {account?.name ?? "Account"}
                    </p>
                    {account?.email ? (
                      <p className="truncate text-xs font-medium text-slate-500">
                        {account.email}
                      </p>
                    ) : null}
                  </div>
                  {onLogout ? (
                    <button
                      type="button"
                      onClick={onLogout}
                      className={cx(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-[#D90452] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-400/20",
                        compactDesktop && "hidden"
                      )}
                      aria-label="Sign out"
                    >
                      <span className="material-icons-outlined text-[20px]">
                        logout
                      </span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
