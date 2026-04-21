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

type Props = {
  tree: HierarchyTree;
  selectedValue: string | null;
  onSelect: (value: string) => void;
  /** true = เปิดทุก utility/group อัตโนมัติ (ตอน search) */
  autoExpand?: boolean;
};

export default function SiteSelectionList({
  tree,
  selectedValue,
  onSelect,
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
    if (selectedValue === "all") return;
    for (const u of tree.utilities) {
      const inUng = u.ungroupedSites.some((s) => s.value === selectedValue);
      const groupWith = u.groups.find((g) =>
        g.sites.some((s) => s.value === selectedValue)
      );
      if (inUng || groupWith) {
        setOpenU((prev) => new Set(prev).add(u.id));
        if (groupWith) setOpenG((prev) => new Set(prev).add(groupWith.id));
        initialExpandRef.done = true;
        return;
      }
    }
    for (const g of tree.orphanGroups) {
      if (g.sites.some((s) => s.value === selectedValue)) {
        setOpenG((prev) => new Set(prev).add(g.id));
        initialExpandRef.done = true;
        return;
      }
    }
  }, [tree, selectedValue, initialExpandRef]);

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
  onSelect,
}: {
  node: UtilityNode;
  expanded: boolean;
  onToggle: () => void;
  openGroups: Set<string>;
  onToggleGroup: (id: string) => void;
  selectedValue: string | null;
  onSelect: (v: string) => void;
}) {
  const total =
    node.ungroupedSites.length +
    node.groups.reduce((s, g) => s + g.sites.length, 0);
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-slate-50"
      >
        <span
          className={`material-icons-outlined text-[20px] text-slate-400 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        >
          chevron_right
        </span>
        <span className="material-icons-outlined text-[18px] text-[#0063bf]">
          business
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-800">
          {node.label}
        </span>
        <span className="text-xs text-slate-400">{total}</span>
      </button>
      {expanded && (
        <ul className="ml-3 flex flex-col gap-0.5 border-l border-slate-100 pl-2">
          {node.groups.map((g) => (
            <GroupItem
              key={g.id}
              node={g}
              expanded={openGroups.has(g.id)}
              onToggle={() => onToggleGroup(g.id)}
              selectedValue={selectedValue}
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
  onSelect,
  depth,
}: {
  node: GroupNode;
  expanded: boolean;
  onToggle: () => void;
  selectedValue: string | null;
  onSelect: (v: string) => void;
  depth: number;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-slate-50"
      >
        <span
          className={`material-icons-outlined text-[18px] text-slate-400 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        >
          chevron_right
        </span>
        <span className="material-icons-outlined text-[16px] text-slate-500">
          folder
        </span>
        <span className="flex-1 text-sm font-medium text-slate-700">
          {node.label}
        </span>
        <span className="text-xs text-slate-400">{node.sites.length}</span>
      </button>
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
