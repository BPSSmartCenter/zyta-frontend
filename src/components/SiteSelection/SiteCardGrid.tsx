// src/components/SiteSelection/SiteCardGrid.tsx
//
// Grid of building-icon cards for site selection. Replaces the prior
// tree/dropdown list with a more visual picker. Sites are grouped by their
// site_group / utility (same hierarchy structure from siteTree.ts), but
// rendered as section headers + card grid instead of expandable rows.

import type {
  HierarchyTree,
  SiteNode,
  GroupNode,
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
  /**
   * If provided, an "All sites" card is rendered as the first item in the
   * grid (same card shape as a site, with a globe icon).
   */
  allSites?: {
    label: string;
    count: number;
    active: boolean;
    onSelect: () => void;
  };
};

/**
 * Pick a Material Icon name that visually matches the site type. Falls back
 * to `apartment` when no keyword matches. Keep the keyword list small and
 * Thai/English friendly.
 */
function pickIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("โรงพยาบาล") || lower.includes("hospital"))
    return "local_hospital";
  if (
    lower.includes("โรงเรียน") ||
    lower.includes("สาธิต") ||
    lower.includes("school")
  )
    return "school";
  if (lower.includes("สัตว") || lower.includes("vet")) return "pets";
  if (lower.includes("คลัง") || lower.includes("warehouse")) return "warehouse";
  if (
    lower.includes("ออฟฟิศ") ||
    lower.includes("office") ||
    lower.includes("hq") ||
    lower.includes("บริษัท")
  )
    return "business";
  if (lower.includes("ห้าง") || lower.includes("store") || lower.includes("mall"))
    return "store";
  if (lower.includes("โรงงาน") || lower.includes("factory"))
    return "factory";
  return "apartment";
}

/**
 * Pick a deterministic accent color per group/site name so the grid feels
 * varied but stable across renders.
 */
function pickAccent(key: string): {
  ring: string;
  bg: string;
  iconBg: string;
  iconText: string;
} {
  // Light pastel palette — readable on white, distinct from cyan selection state.
  const palette = [
    { ring: "ring-sky-200", bg: "bg-sky-50", iconBg: "bg-sky-100", iconText: "text-sky-600" },
    { ring: "ring-violet-200", bg: "bg-violet-50", iconBg: "bg-violet-100", iconText: "text-violet-600" },
    { ring: "ring-emerald-200", bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconText: "text-emerald-600" },
    { ring: "ring-amber-200", bg: "bg-amber-50", iconBg: "bg-amber-100", iconText: "text-amber-700" },
    { ring: "ring-rose-200", bg: "bg-rose-50", iconBg: "bg-rose-100", iconText: "text-rose-600" },
    { ring: "ring-teal-200", bg: "bg-teal-50", iconBg: "bg-teal-100", iconText: "text-teal-600" },
  ];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

export default function SiteCardGrid({
  tree,
  selectedValue,
  onSelect,
  selectedGroup = null,
  onSelectGroup,
  selectedUtility = null,
  onSelectUtility,
  allSites,
}: Props) {
  const sections = collectSections(tree);

  return (
    <div className="flex flex-col gap-6">
      {allSites && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AllSitesCard
            label={allSites.label}
            count={allSites.count}
            selected={allSites.active}
            onClick={allSites.onSelect}
          />
        </div>
      )}

      {sections.map((section) => {
        const utilityActive =
          section.utility !== null &&
          selectedUtility !== null &&
          (selectedUtility.id === section.utility.id ||
            selectedUtility.label === section.utility.label);
        const groupActive =
          section.group !== null &&
          selectedGroup !== null &&
          (selectedGroup.id === section.group.id ||
            selectedGroup.label === section.group.label);

        return (
          <section key={section.key} className="flex flex-col gap-3">
            <SectionHeader
              label={section.title}
              count={section.sites.length}
              icon={section.headerIcon}
              groupActive={groupActive}
              utilityActive={utilityActive}
              onClickGroup={
                section.group && onSelectGroup
                  ? () =>
                      onSelectGroup({
                        id: section.group!.id,
                        label: section.group!.label,
                      })
                  : undefined
              }
              onClickUtility={
                section.utility && !section.group && onSelectUtility
                  ? () =>
                      onSelectUtility({
                        id: section.utility!.id,
                        label: section.utility!.label,
                      })
                  : undefined
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {section.sites.map((site) => (
                <SiteCard
                  key={site.value}
                  site={site}
                  selected={selectedValue === site.value}
                  onClick={() => onSelect(site.value)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section helper — flatten utility/group tree into a list of card sections
// ---------------------------------------------------------------------------

type Section = {
  key: string;
  title: string;
  headerIcon: string;
  utility: UtilityNode | null;
  group: GroupNode | null;
  sites: SiteNode[];
};

function collectSections(tree: HierarchyTree): Section[] {
  const sections: Section[] = [];

  for (const utility of tree.utilities) {
    for (const group of utility.groups) {
      sections.push({
        key: `u:${utility.id}/g:${group.id}`,
        title: group.label,
        headerIcon: "folder",
        utility,
        group,
        sites: group.sites,
      });
    }
    if (utility.ungroupedSites.length > 0) {
      sections.push({
        key: `u:${utility.id}/ungrouped`,
        title: utility.label,
        headerIcon: "business",
        utility,
        group: null,
        sites: utility.ungroupedSites,
      });
    }
  }

  for (const group of tree.orphanGroups) {
    sections.push({
      key: `og:${group.id}`,
      title: group.label,
      headerIcon: "folder",
      utility: null,
      group,
      sites: group.sites,
    });
  }

  if (tree.ungrouped.length > 0) {
    sections.push({
      key: "ungrouped",
      title: "อื่นๆ",
      headerIcon: "more_horiz",
      utility: null,
      group: null,
      sites: tree.ungrouped,
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SectionHeader({
  label,
  count,
  icon,
  groupActive,
  utilityActive,
  onClickGroup,
  onClickUtility,
}: {
  label: string;
  count: number;
  icon: string;
  groupActive: boolean;
  utilityActive: boolean;
  onClickGroup?: () => void;
  onClickUtility?: () => void;
}) {
  const active = groupActive || utilityActive;
  const clickable = onClickGroup ?? onClickUtility;
  const handleClick = onClickGroup ?? onClickUtility;
  const helperText = onClickGroup
    ? "เลือกทั้งกลุ่ม"
    : onClickUtility
      ? "เลือกทั้ง utility"
      : null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={clickable ? handleClick : undefined}
        disabled={!clickable}
        className={`group inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
          active
            ? "bg-[#3AB8EE]/15 text-[#0063bf]"
            : "bg-slate-100 text-slate-600"
        } ${clickable ? "cursor-pointer hover:bg-[#3AB8EE]/10" : "cursor-default"}`}
      >
        <span className="material-icons-outlined text-[15px]">{icon}</span>
        <span>{label}</span>
        <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-500">
          {count}
        </span>
        {active && (
          <span className="material-icons-outlined text-[15px] text-[#3AB8EE]">
            check_circle
          </span>
        )}
      </button>
      {helperText && (
        <span className="text-[11px] text-slate-400">{helperText}</span>
      )}
    </div>
  );
}

function AllSitesCard({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-[#3AB8EE] bg-[#3AB8EE]/8 shadow-[0_0_0_4px_rgba(58,184,238,0.15)]"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#3AB8EE]/40 hover:bg-[#3AB8EE]/5 hover:shadow-md",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none material-icons-outlined absolute -right-3 -bottom-3 text-[88px] opacity-[0.08] transition-opacity group-hover:opacity-[0.16] ${
          selected ? "text-[#3AB8EE]" : "text-slate-400"
        }`}
      >
        public
      </span>

      <span
        className={`inline-grid h-11 w-11 place-items-center rounded-xl transition-colors ${
          selected ? "bg-[#3AB8EE] text-white" : "bg-cyan-100 text-cyan-600"
        }`}
      >
        <span className="material-icons-outlined text-[24px]">public</span>
      </span>

      <div className="relative flex w-full flex-col">
        <span
          className={`line-clamp-2 text-sm font-semibold leading-snug ${
            selected ? "text-[#0063bf]" : "text-slate-900"
          }`}
        >
          {label}
        </span>
        <span className="mt-0.5 text-[11px] font-medium text-slate-400">
          {count} ไซต์ทั้งหมด
        </span>
      </div>

      {selected && (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[#3AB8EE] text-white shadow-sm"
        >
          <span className="material-icons-outlined text-[16px]">check</span>
        </span>
      )}
    </button>
  );
}

function SiteCard({
  site,
  selected,
  onClick,
}: {
  site: SiteNode;
  selected: boolean;
  onClick: () => void;
}) {
  const icon = pickIcon(site.label);
  const accent = pickAccent(site.groupLabel ?? site.label);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "group relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-[#3AB8EE] bg-[#3AB8EE]/8 shadow-[0_0_0_4px_rgba(58,184,238,0.15)]"
          : `border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#3AB8EE]/40 hover:bg-[#3AB8EE]/5 hover:shadow-md ring-1 ring-transparent hover:${accent.ring}`,
      ].join(" ")}
    >
      {/* Decorative background icon (ghost building) */}
      <span
        aria-hidden="true"
        className={`pointer-events-none material-icons-outlined absolute -right-3 -bottom-3 text-[88px] opacity-[0.08] transition-opacity group-hover:opacity-[0.16] ${
          selected ? "text-[#3AB8EE]" : "text-slate-400"
        }`}
      >
        {icon}
      </span>

      {/* Main icon chip */}
      <span
        className={`inline-grid h-11 w-11 place-items-center rounded-xl transition-colors ${
          selected
            ? "bg-[#3AB8EE] text-white"
            : `${accent.iconBg} ${accent.iconText}`
        }`}
      >
        <span className="material-icons-outlined text-[24px]">{icon}</span>
      </span>

      <div className="relative flex w-full flex-col">
        <span
          className={`line-clamp-2 text-sm font-semibold leading-snug ${
            selected ? "text-[#0063bf]" : "text-slate-900"
          }`}
        >
          {site.label}
        </span>
      </div>

      {/* Selected checkmark badge */}
      {selected && (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[#3AB8EE] text-white shadow-sm"
        >
          <span className="material-icons-outlined text-[16px]">check</span>
        </span>
      )}
    </button>
  );
}
