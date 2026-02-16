import React from "react";
import Dropdown from "../Dropdown";

export type SiteOption = {
  label: string;
  value: string;
  i18nKey?: string;
  groupLabel?: string | null;
  groupId?: string | null;
};

type GroupedSiteDropdownProps = {
  options: SiteOption[];
  value: string;
  onChange: (value: string) => void;
  getLabel?: (opt: SiteOption) => string;
  buttonClassName?: string;
  menuClassName?: string;
  menuOffsetClassName?: string;
  rootClassName?: string;
  showUngrouped?: boolean;
  showUngroupedHeader?: boolean;
  selectedGroup?: { id: string; label: string } | null;
  onSelectGroup?: (group: { id: string; label: string }) => void;
};

type GroupedSite = {
  id: string;
  label: string;
  sites: SiteOption[];
};

const normalizeKey = (value: string) => value.trim().toLowerCase();
const SUBMENU_MIN_WIDTH = 220;
const SUBMENU_PREFERRED_WIDTH = 320;
const SUBMENU_GAP = 8;

const buildGroupSites = (options: SiteOption[]): {
  groups: GroupedSite[];
  remaining: SiteOption[];
} => {
  const grouped = new Map<string, SiteOption[]>();
  const remaining = options.filter((opt) => !opt.groupLabel);

  options.forEach((opt) => {
    const label = String(opt.groupLabel || "").trim();
    if (!label) return;
    const list = grouped.get(label) ?? [];
    list.push(opt);
    grouped.set(label, list);
  });

  const groups: GroupedSite[] = Array.from(grouped.entries()).map(([label, sites]) => ({
    id: label,
    label,
    sites,
  }));
  groups.sort((a, b) => a.label.localeCompare(b.label, "th"));
  return { groups, remaining };
};

export default function SiteDropdownGrouped({
  options,
  value,
  onChange,
  getLabel,
  buttonClassName =
    "inline-flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-md border border-gray-300 px-3 text-sm hover:cursor-pointer focus:bg-gray-50",
  menuClassName =
    "absolute left-0 top-full z-[1200] mt-2 min-w-[280px] max-w-[420px] max-h-[420px] overflow-auto whitespace-nowrap rounded-md border border-gray-300 bg-white p-1 shadow-md",
  menuOffsetClassName = "",
  rootClassName,
  showUngrouped = false,
  showUngroupedHeader = true,
  selectedGroup = null,
  onSelectGroup,
}: GroupedSiteDropdownProps) {
  const [activeGroupId, setActiveGroupId] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [submenuSide, setSubmenuSide] = React.useState<"right" | "left">("right");
  const [submenuMaxWidth, setSubmenuMaxWidth] = React.useState<number>(SUBMENU_PREFERRED_WIDTH);

  const pickSubmenuSide = (el: HTMLElement | null) => {
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const pad = 12;
    const rightSpace = viewportWidth - rect.right - SUBMENU_GAP - pad;
    const leftSpace = rect.left - SUBMENU_GAP - pad;
    const clampWidth = (space: number) =>
      Math.max(SUBMENU_MIN_WIDTH, Math.min(SUBMENU_PREFERRED_WIDTH, space));

    const willOverflowRight = rightSpace < SUBMENU_PREFERRED_WIDTH;
    const canRight = rightSpace >= SUBMENU_MIN_WIDTH;
    const canLeft = leftSpace >= SUBMENU_MIN_WIDTH;

    if (willOverflowRight && canLeft) {
      setSubmenuSide("left");
      setSubmenuMaxWidth(clampWidth(leftSpace));
      return;
    }
    if (canRight) {
      setSubmenuSide("right");
      setSubmenuMaxWidth(clampWidth(rightSpace));
      return;
    }
    if (canLeft) {
      setSubmenuSide("left");
      setSubmenuMaxWidth(clampWidth(leftSpace));
      return;
    }

    if (rightSpace >= leftSpace) {
      setSubmenuSide("right");
      setSubmenuMaxWidth(Math.max(160, rightSpace));
    } else {
      setSubmenuSide("left");
      setSubmenuMaxWidth(Math.max(160, leftSpace));
    }
  };

  const displayLabel = React.useCallback(
    (opt: SiteOption) => (getLabel ? getLabel(opt) : opt.label),
    [getLabel]
  );

  const allOption = options.find((opt) => normalizeKey(opt.value) === "all") ?? null;
  const normalOptions = allOption ? options.filter((opt) => opt.value !== allOption.value) : options;
  const { groups, remaining } = React.useMemo(
    () => buildGroupSites(normalOptions),
    [JSON.stringify(normalOptions)]
  );

  React.useEffect(() => {
    if (!menuOpen) setActiveGroupId(null);
  }, [menuOpen]);

  return (
    <Dropdown
      options={options as any}
      value={value}
      onChange={(val) => onChange(val)}
      onOpenChange={setMenuOpen}
      className={rootClassName}
    >
      {({ open, selected, options: rawOptions, getButtonProps, getMenuProps, getItemProps }) => {
        const siteOptionList = rawOptions as SiteOption[];
        const fallbackOption = selected ?? siteOptionList.find((opt) => opt.value === value) ?? siteOptionList[0];
        const selectedLabel = fallbackOption
          ? displayLabel(fallbackOption)
          : siteOptionList[0]
          ? displayLabel(siteOptionList[0])
          : "";

        const buttonLabel =
          selectedGroup && normalizeKey(value) === "all" ? selectedGroup.label : selectedLabel;

        return (
          <>
            <button {...getButtonProps({ className: buttonClassName })}>
              <span className="whitespace-nowrap">{buttonLabel}</span>
              <i className="material-icons leading-none">{open ? "arrow_drop_up" : "arrow_drop_down"}</i>
            </button>

            <div
              {...getMenuProps({
                className: [
                  menuClassName,
                  "transition-all duration-150",
                  open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none",
                  "overflow-visible",
                  menuOffsetClassName,
                ].join(" "),
              })}
              onMouseLeave={() => setActiveGroupId(null)}
            >
              {allOption && (
                <button
                  {...getItemProps(allOption, {
                    className:
                      "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer",
                  })}
                >
                  {displayLabel(allOption)}
                </button>
              )}

              {groups.map((group) => (
                <div
                  key={group.id}
                  className="relative"
                  onMouseLeave={() => setActiveGroupId((prev) => (prev === group.id ? null : prev))}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer"
                    onMouseEnter={(e) => {
                      pickSubmenuSide(e.currentTarget as HTMLElement);
                      setActiveGroupId(group.id);
                    }}
                    onFocus={(e) => {
                      pickSubmenuSide(e.currentTarget as HTMLElement);
                      setActiveGroupId(group.id);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onSelectGroup) {
                        onSelectGroup({ id: group.id, label: group.label });
                        return;
                      }
                      setActiveGroupId(group.id);
                    }}
                  >
                    <span className="whitespace-nowrap">{group.label}</span>
                    <i className="material-icons text-[18px] leading-none text-gray-500">chevron_right</i>
                  </button>

                  <div
                    className={[
                      "absolute top-0 min-w-[220px] rounded-md border border-gray-300 bg-white p-1 shadow-md",
                      activeGroupId === group.id ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                      "transition-opacity duration-150",
                    ].join(" ")}
                    style={
                      submenuSide === "right"
                        ? { left: "100%", marginLeft: 0, maxWidth: `${submenuMaxWidth}px` }
                        : { right: "100%", marginRight: 0, maxWidth: `${submenuMaxWidth}px` }
                    }
                  >
                    <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-400">{group.label}</div>
                    {group.sites.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No sites in this group</div>
                    ) : (
                      group.sites.map((opt) => (
                        <button
                          key={opt.value}
                          {...getItemProps(opt, {
                            className:
                              "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer whitespace-nowrap",
                          })}
                          title={displayLabel(opt)}
                        >
                          <span className="whitespace-nowrap">{displayLabel(opt)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))}

              {showUngrouped && remaining.length > 0 && (
                <>
                  {showUngroupedHeader && (
                    <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-400">Other sites</div>
                  )}
                  {remaining.map((opt) => (
                    <button
                      key={opt.value}
                      {...getItemProps(opt, {
                        className:
                          "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer",
                      })}
                    >
                      {displayLabel(opt)}
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        );
      }}
    </Dropdown>
  );
}
