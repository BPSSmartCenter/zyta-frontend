import type { ReactNode } from "react";

export type GlassHoverSidebarItem = {
  id: string;
  label: string;
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
  event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
  item: GlassHoverSidebarItem
) {
  if (item.disabled) {
    event.preventDefault();
    return;
  }

  if (item.onSelect) {
    event.preventDefault();
    item.onSelect();
  }
}

function SidebarItem({
  item,
  depth = 0,
}: {
  item: GlassHoverSidebarItem;
  depth?: number;
}) {
  const interactiveClassName = cx(
    "group/item flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm font-semibold outline-none transition",
    "focus-visible:ring-4 focus-visible:ring-cyan-400/20",
    depth > 0 && "py-2 text-[13px] font-medium",
    item.active
      ? "bg-[#0877A8] text-white shadow-[0_14px_30px_rgba(8,119,168,0.24)]"
      : "text-slate-700 hover:bg-white/75 hover:text-slate-950",
    item.disabled && "pointer-events-none cursor-not-allowed opacity-40"
  );

  const icon = item.icon ? (
    <span
      className={cx(
        "material-icons-outlined grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[19px] transition",
        item.active
          ? "bg-white/18 text-white"
          : "bg-white/60 text-slate-500 group-hover/item:text-[#0877A8]"
      )}
      aria-hidden="true"
    >
      {item.icon}
    </span>
  ) : null;

  const label = (
    <>
      {icon}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span
          className={cx(
            "rounded-full px-2 py-0.5 text-[11px] font-bold",
            item.active ? "bg-white/20 text-white" : "bg-slate-900/5 text-slate-500"
          )}
        >
          {item.badge}
        </span>
      )}
    </>
  );

  return (
    <li>
      {item.href ? (
        <a
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          aria-disabled={item.disabled || undefined}
          className={interactiveClassName}
          onClick={(event) => handleItemSelect(event, item)}
        >
          {label}
        </a>
      ) : (
        <button
          type="button"
          aria-current={item.active ? "page" : undefined}
          disabled={item.disabled}
          className={interactiveClassName}
          onClick={(event) => handleItemSelect(event, item)}
        >
          {label}
        </button>
      )}

      {item.children?.length ? (
        <ul className="mt-1 space-y-1 pl-11">
          {item.children.map((child) => (
            <SidebarItem key={child.id} item={child} depth={depth + 1} />
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
  toggleLabel = "Toggle sidebar",
  className,
  open = false,
  onOpenChange,
  onLogout,
}: GlassHoverSidebarProps) {
  const cardClassName = cx(
    "rounded-[24px] border border-white/45 bg-white/68 backdrop-blur-2xl ring-1 ring-slate-900/5",
    open
      ? "shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
      : "shadow-none group-hover/sidebar:shadow-[0_24px_80px_rgba(15,23,42,0.22)] focus-within:shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
  );

  return (
    <aside
      aria-label={ariaLabel}
      className={cx(
        "group/sidebar pointer-events-none fixed left-0 top-0 z-[1100] h-dvh w-[320px]",
        className
      )}
    >
      <div
        className="pointer-events-auto absolute left-0 top-0 h-full w-7"
        aria-hidden="true"
      />

      <div
        className={cx(
          "pointer-events-auto absolute left-0 top-4 h-[calc(100dvh-2rem)] w-[288px]",
          "transition-transform duration-300 ease-out motion-reduce:transition-none",
          open
            ? "translate-x-3"
            : "translate-x-[calc(-100%-2px)] group-hover/sidebar:translate-x-3 focus-within:translate-x-3"
        )}
      >
        <button
          type="button"
          className="absolute right-[-24px] top-1/2 z-10 flex h-28 w-[24px] -translate-y-1/2 items-center justify-center rounded-r-full bg-white/68 shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur-2xl outline-none transition [clip-path:inset(-60px_-60px_-60px_0)] hover:bg-white/75 focus-visible:ring-4 focus-visible:ring-cyan-400/20"
          aria-label={toggleLabel}
          aria-expanded={open}
          onClick={() => onOpenChange?.(!open)}
        >
          <span
            className={cx(
              "material-icons-outlined text-[18px] text-slate-500 transition group-hover/sidebar:rotate-180",
              open && "rotate-180"
            )}
          >
            chevron_right
          </span>
        </button>

        <div className="flex h-full flex-col gap-3">
          <div className={cx(cardClassName, "shrink-0 overflow-hidden px-4 py-4")}>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-white/70 shadow-sm ring-1 ring-white/70">
                {logo ?? (
                  <span className="material-icons-outlined text-[24px] text-[#0877A8]">
                    dashboard
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">
                  {title}
                </p>
                <p className="truncate text-xs font-medium text-slate-500">
                  {subtitle}
                </p>
              </div>
            </div>
            {headerSlot}
          </div>

          <div className={cx(cardClassName, "min-h-0 flex-1 overflow-hidden")}>
            <nav className="flex h-full flex-col overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <SidebarItem key={item.id} item={item} />
                ))}
              </ul>

              {footerItems.length > 0 && (
                <ul className="mt-4 space-y-1.5 pt-3">
                  {footerItems.map((item) => (
                    <SidebarItem key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </nav>
          </div>

          {(account || onLogout) && (
            <div className={cx(cardClassName, "shrink-0 overflow-hidden p-3")}>
              <div className="flex items-center gap-3 rounded-[16px] bg-white/58 p-2 shadow-sm ring-1 ring-white/60">
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {account?.name ?? "Account"}
                  </p>
                  {account?.email && (
                    <p className="truncate text-xs font-medium text-slate-500">
                      {account.email}
                    </p>
                  )}
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-slate-500 transition hover:bg-white hover:text-[#D90452] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-400/20"
                    aria-label="Sign out"
                  >
                    <span className="material-icons-outlined text-[20px]">
                      logout
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
