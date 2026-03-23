import React from "react";
import Dropdown from "../Dropdown";

export type SiteOption = {
  label: string;
  value: string;
  i18nKey?: string;
  groupLabel?: string | null;
  groupId?: string | null;
  utilityId?: string | null;
  utilityLabel?: string | null;
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
  selectedUtility?: { id: string; label: string } | null;
  onSelectUtility?: (utility: { id: string; label: string }) => void;
};

/* ── Tree data types ── */

type SiteNode = SiteOption;

type GroupNode = {
  id: string;
  label: string;
  sites: SiteNode[];
};

type UtilityNode = {
  id: string;
  label: string;
  groups: GroupNode[];
  ungroupedSites: SiteNode[];
};

type HierarchyTree = {
  utilities: UtilityNode[];
  /** Groups without utility */
  orphanGroups: GroupNode[];
  /** Sites without group and utility */
  ungrouped: SiteNode[];
};

/* ── Build hierarchy from flat options ── */

function buildHierarchyTree(options: SiteOption[]): HierarchyTree {
  const utilityMap = new Map<string, UtilityNode>();
  const orphanGroupMap = new Map<string, GroupNode>();
  const ungrouped: SiteNode[] = [];

  for (const opt of options) {
    const uId = opt.utilityId ?? null;
    const uLabel = opt.utilityLabel ?? null;
    const gId = opt.groupId ?? opt.groupLabel ?? null;
    const gLabel = opt.groupLabel ?? null;

    // Site has utility
    if (uId && uLabel) {
      let uNode = utilityMap.get(uId);
      if (!uNode) {
        uNode = { id: uId, label: uLabel, groups: [], ungroupedSites: [] };
        utilityMap.set(uId, uNode);
      }
      if (gId && gLabel) {
        let gNode = uNode.groups.find((g) => g.id === String(gId));
        if (!gNode) {
          gNode = { id: String(gId), label: gLabel, sites: [] };
          uNode.groups.push(gNode);
        }
        gNode.sites.push(opt);
      } else {
        uNode.ungroupedSites.push(opt);
      }
      continue;
    }

    // Site has group but no utility
    if (gId && gLabel) {
      const key = String(gId);
      let gNode = orphanGroupMap.get(key);
      if (!gNode) {
        gNode = { id: key, label: gLabel, sites: [] };
        orphanGroupMap.set(key, gNode);
      }
      gNode.sites.push(opt);
      continue;
    }

    // No group, no utility
    ungrouped.push(opt);
  }

  const sortTh = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label, "th");

  const utilities = Array.from(utilityMap.values()).sort(sortTh);
  for (const u of utilities) u.groups.sort(sortTh);

  const orphanGroups = Array.from(orphanGroupMap.values()).sort(sortTh);

  return { utilities, orphanGroups, ungrouped };
}

/* ── Helpers ── */

const normalizeKey = (value: string) => value.trim().toLowerCase();

function countSites(node: UtilityNode | GroupNode): number {
  if ("groups" in node) {
    return (
      node.groups.reduce((sum, g) => sum + g.sites.length, 0) +
      node.ungroupedSites.length
    );
  }
  return node.sites.length;
}

/* ── Component ── */

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
  selectedUtility = null,
  onSelectUtility,
}: GroupedSiteDropdownProps) {
  const [expandedUtilities, setExpandedUtilities] = React.useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = React.useState(false);

  const displayLabel = React.useCallback(
    (opt: SiteOption) => (getLabel ? getLabel(opt) : opt.label),
    [getLabel]
  );

  const allOption = options.find((opt) => normalizeKey(opt.value) === "all") ?? null;
  const normalOptions = allOption
    ? options.filter((opt) => opt.value !== allOption.value)
    : options;

  const tree = React.useMemo(
    () => buildHierarchyTree(normalOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(normalOptions)]
  );

  // Determine if we have any utility data at all (for backward compat: render old style if no utilities)
  const hasUtilities = tree.utilities.length > 0;

  const toggleUtility = (id: string) => {
    setExpandedUtilities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reset expand state when menu closes
  React.useEffect(() => {
    if (!menuOpen) {
      setExpandedUtilities(new Set());
      setExpandedGroups(new Set());
    }
  }, [menuOpen]);

  /* ── Button label ── */
  const getButtonLabel = React.useCallback(() => {
    if (selectedUtility && normalizeKey(value) === "all") {
      if (selectedGroup) return `${selectedUtility.label} › ${selectedGroup.label}`;
      return selectedUtility.label;
    }
    if (selectedGroup && normalizeKey(value) === "all") return selectedGroup.label;
    const opt = options.find((o) => o.value === value) ?? options[0];
    return opt ? displayLabel(opt) : "";
  }, [value, selectedUtility, selectedGroup, options, displayLabel]);

  /* ── Render helpers ── */

  const renderSiteItem = (
    opt: SiteOption,
    indent: number,
    getItemProps: any
  ) => (
    <button
      key={opt.value}
      {...getItemProps(opt, {
        className:
          "flex w-full items-center rounded-lg py-1.5 text-left text-sm hover:bg-gray-100 hover:cursor-pointer whitespace-nowrap",
      })}
      style={{ paddingLeft: `${indent * 16 + 12}px`, paddingRight: "12px" }}
      title={displayLabel(opt)}
    >
      <i className="material-icons text-[14px] text-gray-400 mr-1.5">location_on</i>
      <span className="truncate">{displayLabel(opt)}</span>
    </button>
  );

  const renderGroupNode = (
    group: GroupNode,
    indent: number,
    getItemProps: any
  ) => {
    const isExpanded = expandedGroups.has(group.id);
    const count = group.sites.length;
    return (
      <div key={group.id}>
        <div className="flex items-center">
          {/* expand/collapse toggle */}
          <button
            type="button"
            className="flex items-center justify-center w-6 h-6 hover:bg-gray-100 rounded"
            style={{ marginLeft: `${indent * 16 + 4}px` }}
            onClick={(e) => {
              e.stopPropagation();
              toggleGroup(group.id);
            }}
          >
            <i className="material-icons text-[16px] text-gray-400">
              {isExpanded ? "expand_more" : "chevron_right"}
            </i>
          </button>
          {/* group label (clickable = select group scope) */}
          <button
            type="button"
            className="flex flex-1 items-center gap-1 rounded-lg py-1.5 pr-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 hover:cursor-pointer"
            onClick={() => {
              if (onSelectGroup) {
                onSelectGroup({ id: group.id, label: group.label });
              } else {
                toggleGroup(group.id);
              }
            }}
          >
            <i className="material-icons text-[16px] text-gray-500 mr-1">folder</i>
            <span className="truncate">{group.label}</span>
            <span className="ml-auto text-[11px] text-gray-400 tabular-nums">{count}</span>
          </button>
        </div>
        {isExpanded &&
          group.sites.map((site) => renderSiteItem(site, indent + 1, getItemProps))}
      </div>
    );
  };

  const renderUtilityNode = (
    utility: UtilityNode,
    getItemProps: any
  ) => {
    const isExpanded = expandedUtilities.has(utility.id);
    const count = countSites(utility);
    return (
      <div key={utility.id}>
        {/* Utility header row */}
        <div className="flex items-center">
          <button
            type="button"
            className="flex items-center justify-center w-6 h-6 hover:bg-gray-100 rounded ml-1"
            onClick={(e) => {
              e.stopPropagation();
              toggleUtility(utility.id);
            }}
          >
            <i className="material-icons text-[16px] text-gray-500">
              {isExpanded ? "expand_more" : "chevron_right"}
            </i>
          </button>
          <button
            type="button"
            className="flex flex-1 items-center gap-1 rounded-lg py-2 pr-3 text-left text-sm font-semibold text-gray-800 hover:bg-blue-50 hover:cursor-pointer"
            onClick={() => {
              if (onSelectUtility) {
                onSelectUtility({ id: utility.id, label: utility.label });
              } else {
                toggleUtility(utility.id);
              }
            }}
          >
            <i className="material-icons text-[16px] text-blue-500 mr-1">business</i>
            <span className="truncate">{utility.label}</span>
            <span className="ml-auto text-[11px] text-gray-400 tabular-nums">{count}</span>
          </button>
        </div>

        {isExpanded && (
          <div>
            {utility.groups.map((g) => renderGroupNode(g, 1, getItemProps))}
            {utility.ungroupedSites.map((s) =>
              renderSiteItem(s, 2, getItemProps)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dropdown
      options={options as any}
      value={value}
      onChange={(val) => onChange(val)}
      onOpenChange={setMenuOpen}
      className={rootClassName}
    >
      {({ open, getButtonProps, getMenuProps, getItemProps }) => {
        return (
          <>
            <button {...getButtonProps({ className: buttonClassName })}>
              <span className="whitespace-nowrap truncate max-w-[200px]">{getButtonLabel()}</span>
              <i className="material-icons leading-none">
                {open ? "arrow_drop_up" : "arrow_drop_down"}
              </i>
            </button>

            <div
              {...getMenuProps({
                className: [
                  menuClassName,
                  "transition-all duration-150",
                  open
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 -translate-y-1 pointer-events-none",
                  menuOffsetClassName,
                ].join(" "),
              })}
            >
              {/* All Sites option */}
              {allOption && (
                <button
                  {...getItemProps(allOption, {
                    className:
                      "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-gray-100 hover:cursor-pointer",
                  })}
                >
                  <i className="material-icons text-[16px] text-gray-500 mr-2">public</i>
                  {displayLabel(allOption)}
                </button>
              )}

              {/* ── Utility nodes (new 3-tier) ── */}
              {hasUtilities && (
                <>
                  {tree.utilities.map((u) => renderUtilityNode(u, getItemProps))}

                  {/* Orphan groups (groups without utility) */}
                  {tree.orphanGroups.length > 0 && (
                    <div className="mt-1 border-t border-gray-100 pt-1">
                      <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-400">
                        ไม่ระบุการไฟฟ้า
                      </div>
                      {tree.orphanGroups.map((g) =>
                        renderGroupNode(g, 0, getItemProps)
                      )}
                    </div>
                  )}

                  {/* Ungrouped sites */}
                  {showUngrouped && tree.ungrouped.length > 0 && (
                    <div className="mt-1 border-t border-gray-100 pt-1">
                      {showUngroupedHeader && (
                        <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-400">
                          ไม่มีกลุ่ม
                        </div>
                      )}
                      {tree.ungrouped.map((s) =>
                        renderSiteItem(s, 0, getItemProps)
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── Fallback: old 2-tier layout (no utilities exist) ── */}
              {!hasUtilities && (
                <>
                  {tree.orphanGroups.map((g) =>
                    renderGroupNode(g, 0, getItemProps)
                  )}

                  {showUngrouped && tree.ungrouped.length > 0 && (
                    <>
                      {showUngroupedHeader && (
                        <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-400">
                          Other sites
                        </div>
                      )}
                      {tree.ungrouped.map((s) =>
                        renderSiteItem(s, 0, getItemProps)
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </>
        );
      }}
    </Dropdown>
  );
}
