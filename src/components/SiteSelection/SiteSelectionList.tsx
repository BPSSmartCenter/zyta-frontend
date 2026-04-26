// src/components/SiteSelection/SiteSelectionList.tsx
//
// Render tree ของ Utility → Group → Site แบบ expandable
// ใช้ใน SiteSelectionModal

import { useEffect, useMemo, useState } from "react";
import type {
  GroupNode,
  HierarchyTree,
  SiteNode,
  UtilityNode,
} from "./siteTree";
import type {
  SelectedGroupSite,
  SelectedUtility,
} from "../../features/siteSelection";

type Props = {
  tree: HierarchyTree;
  selectedValue: string | null;
  onSelect: (value: string) => void;
  selectedGroup?: SelectedGroupSite;
  onSelectGroup?: (group: NonNullable<SelectedGroupSite>) => void;
  selectedUtility?: SelectedUtility;
  onSelectUtility?: (utility: NonNullable<SelectedUtility>) => void;
  /** true = เปิดทุก utility/group อัตโนมัติ (ตอน search) */
  autoExpand?: boolean;
};

export default function SiteSelectionList({
  tree,
  selectedValue,
  onSelect,
  selectedGroup = null,
  onSelectGroup,
  selectedUtility = null,
  onSelectUtility,
  autoExpand = false,
}: Props) {
  // expanded sets
  const [openU, setOpenU] = useState<Set<string>>(new Set());
  const [openG, setOpenG] = useState<Set<string>>(new Set());

  // เมื่อ autoExpand เปลี่ยน (เช่นเริ่ม search) — เปิดทุก utility/group
  useEffect(() => {
    if (autoExpand) {
      setOpenU(new Set(tree.utilities.map((u) => u.id)));
      const groupIds = [
        ...tree.utilities.flatMap((u) => u.groups.map((g) => g.id)),
        ...tree.orphanGroups.map((g) => g.id),
      ];
      setOpenG(new Set(groupIds));
    }
  }, [autoExpand, tree]);

  // Auto-expand ancestor ของ selectedValue ในครั้งแรกที่ render
  const initialExpandRef = useMemo(() => ({ done: false }), []);
  useEffect(() => {
    if (initialExpandRef.done || !selectedValue) return;
    if (selectedValue === "all" && !selectedUtility && !selectedGroup) return;
    if (selectedUtility) {
      setOpenU((prev) => new Set(prev).add(selectedUtility.id));
      initialExpandRef.done = true;
      return;
    }
    for (const u of tree.utilities) {
      const selectedGroupInUtility = selectedGroup
        ? u.groups.find(
            (g) =>
              g.id === selectedGroup.id || g.label === selectedGroup.label
          )
        : null;
      const inUng = u.ungroupedSites.some((s) => s.value === selectedValue);
      const groupWith = u.groups.find((g) =>
        g.sites.some((s) => s.value === selectedValue)
      );
      if (inUng || groupWith || selectedGroupInUtility) {
        setOpenU((prev) => new Set(prev).add(u.id));
        if (groupWith) setOpenG((prev) => new Set(prev).add(groupWith.id));
        if (selectedGroupInUtility) {
          setOpenG((prev) => new Set(prev).add(selectedGroupInUtility.id));
        }
        initialExpandRef.done = true;
        return;
      }
    }
    for (const g of tree.orphanGroups) {
      const isGroupSelected =
        selectedGroup &&
        (selectedGroup.id === g.id || selectedGroup.label === g.label);
      if (isGroupSelected || g.sites.some((s) => s.value === selectedValue)) {
        setOpenG((prev) => new Set(prev).add(g.id));
        initialExpandRef.done = true;
        return;
      }
    }
  }, [tree, selectedValue, selectedUtility, selectedGroup, initialExpandRef]);

  const toggleU = (id: string) =>
    setOpenU((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  const toggleG = (id: string) =>
    setOpenG((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <ul className="flex flex-col gap-1">
      {tree.utilities.map((u) => (
        <UtilityItem
          key={u.id}
          node={u}
          expanded={openU.has(u.id)}
          onToggle={() => toggleU(u.id)}
          openGroups={openG}
          onToggleGroup={toggleG}
          selectedValue={selectedValue}
          selectedUtility={selectedUtility}
          onSelectUtility={onSelectUtility}
          selectedGroup={selectedGroup}
          onSelectGroup={onSelectGroup}
          onSelect={onSelect}
        />
      ))}

      {tree.orphanGroups.length > 0 &&
        tree.orphanGroups.map((g) => (
          <GroupItem
            key={`orphan-${g.id}`}
            node={g}
            expanded={openG.has(g.id)}
            onToggle={() => toggleG(g.id)}
            selectedValue={selectedValue}
            selectedGroup={selectedGroup}
            onSelectGroup={onSelectGroup}
            onSelect={onSelect}
            depth={0}
          />
        ))}

      {tree.ungrouped.map((s) => (
        <SiteRow
          key={s.value}
          site={s}
          depth={0}
          selected={selectedValue === s.value}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────

function UtilityItem({
  node,
  expanded,
  onToggle,
  openGroups,
  onToggleGroup,
  selectedValue,
  selectedUtility,
  onSelectUtility,
  selectedGroup,
  onSelectGroup,
  onSelect,
}: {
  node: UtilityNode;
  expanded: boolean;
  onToggle: () => void;
  openGroups: Set<string>;
  onToggleGroup: (id: string) => void;
  selectedValue: string | null;
  selectedUtility: SelectedUtility;
  onSelectUtility?: (utility: NonNullable<SelectedUtility>) => void;
  selectedGroup: SelectedGroupSite;
  onSelectGroup?: (group: NonNullable<SelectedGroupSite>) => void;
  onSelect: (v: string) => void;
}) {
  const total =
    node.ungroupedSites.length +
    node.groups.reduce((s, g) => s + g.sites.length, 0);
  const selected =
    selectedValue === "all" &&
    selectedUtility !== null &&
    (selectedUtility.id === node.id || selectedUtility.label === node.label);
  return (
    <li>
      <div className="flex items-center gap-2 rounded-md px-2 py-1">
        <button
          type="button"
          onClick={onToggle}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-slate-50"
          aria-label={expanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
        >
          <span
            className={`material-icons-outlined text-[20px] text-slate-400 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          >
            chevron_right
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSelectUtility?.({ id: node.id, label: node.label })}
          className={`flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-left transition ${
            selected
              ? "bg-[#3AB8EE]/10 text-[#0063bf]"
              : "hover:bg-slate-50 text-slate-800"
          }`}
        >
          <span className="material-icons-outlined text-[18px] text-[#0063bf]">
            business
          </span>
          <span className="flex-1 text-sm font-semibold">{node.label}</span>
          <span className="text-xs text-slate-400">{total}</span>
          {selected && (
            <span className="material-icons-outlined text-[20px] text-[#3AB8EE]">
              check
            </span>
          )}
        </button>
      </div>
      {expanded && (
        <ul className="ml-3 flex flex-col gap-0.5 border-l border-slate-100 pl-2">
          {node.groups.map((g) => (
            <GroupItem
              key={g.id}
              node={g}
              expanded={openGroups.has(g.id)}
              onToggle={() => onToggleGroup(g.id)}
              selectedValue={selectedValue}
              selectedGroup={selectedGroup}
              onSelectGroup={onSelectGroup}
              onSelect={onSelect}
              depth={1}
            />
          ))}
          {node.ungroupedSites.map((s) => (
            <SiteRow
              key={s.value}
              site={s}
              depth={1}
              selected={selectedValue === s.value}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function GroupItem({
  node,
  expanded,
  onToggle,
  selectedValue,
  selectedGroup,
  onSelectGroup,
  onSelect,
  depth,
}: {
  node: GroupNode;
  expanded: boolean;
  onToggle: () => void;
  selectedValue: string | null;
  selectedGroup: SelectedGroupSite;
  onSelectGroup?: (group: NonNullable<SelectedGroupSite>) => void;
  onSelect: (v: string) => void;
  depth: number;
}) {
  const selected =
    selectedValue === "all" &&
    selectedGroup !== null &&
    (selectedGroup.id === node.id || selectedGroup.label === node.label);
  return (
    <li>
      <div className="flex items-center gap-2 rounded-md px-2 py-1">
        <button
          type="button"
          onClick={onToggle}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-slate-50"
          aria-label={expanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
        >
          <span
            className={`material-icons-outlined text-[18px] text-slate-400 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          >
            chevron_right
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (onSelectGroup) {
              onSelectGroup({ id: node.id, label: node.label });
              return;
            }
            onToggle();
          }}
          className={`flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-left transition ${
            selected
              ? "bg-[#3AB8EE]/10 text-[#0063bf]"
              : "hover:bg-slate-50 text-slate-700"
          }`}
        >
          <span className="material-icons-outlined text-[16px] text-slate-500">
            folder
          </span>
          <span className="flex-1 text-sm font-medium">{node.label}</span>
          <span className="text-xs text-slate-400">{node.sites.length}</span>
          {selected && (
            <span className="material-icons-outlined text-[20px] text-[#3AB8EE]">
              check
            </span>
          )}
        </button>
      </div>
      {expanded && (
        <ul className="ml-3 flex flex-col gap-0.5 border-l border-slate-100 pl-2">
          {node.sites.map((s) => (
            <SiteRow
              key={s.value}
              site={s}
              depth={depth + 1}
              selected={selectedValue === s.value}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function SiteRow({
  site,
  selected,
  onSelect,
}: {
  site: SiteNode;
  depth: number;
  selected: boolean;
  onSelect: (v: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(site.value)}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition ${
          selected
            ? "bg-[#3AB8EE]/10 text-[#0063bf]"
            : "hover:bg-slate-50 text-slate-700"
        }`}
      >
        <span
          className={`material-icons-outlined text-[16px] ${
            selected ? "text-[#3AB8EE]" : "text-slate-300"
          }`}
        >
          {selected ? "radio_button_checked" : "radio_button_unchecked"}
        </span>
        <span className="flex-1 truncate text-sm">
          <span className="font-medium">{site.label}</span>
          {site.value !== site.label && (
            <span className="ml-2 text-xs text-slate-400">({site.value})</span>
          )}
        </span>
        {selected && (
          <span className="material-icons-outlined text-[18px] text-[#3AB8EE]">
            check
          </span>
        )}
      </button>
    </li>
  );
}
