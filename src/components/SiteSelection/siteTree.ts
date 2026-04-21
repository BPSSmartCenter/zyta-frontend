// src/components/SiteSelection/siteTree.ts
//
// Build a 3-level hierarchy (Utility → Group → Site) from flat SiteOption[].
// Extracted/duplicated from SiteDropdownGrouped.tsx so this component is
// self-contained (ไม่ผูก internal ของ dropdown เดิม)

import type { SiteOption } from "../../features/siteSelection";

export type SiteNode = SiteOption;

export type GroupNode = {
  id: string;
  label: string;
  sites: SiteNode[];
};

export type UtilityNode = {
  id: string;
  label: string;
  groups: GroupNode[];
  ungroupedSites: SiteNode[];
};

export type HierarchyTree = {
  utilities: UtilityNode[];
  /** Groups without utility */
  orphanGroups: GroupNode[];
  /** Sites without group and utility */
  ungrouped: SiteNode[];
};

const BPS_UTILITY: Pick<UtilityNode, "id" | "label"> = {
  id: "__bps",
  label: "BPS",
};

function standaloneGroupForSite(site: SiteNode): GroupNode {
  return {
    id: `__site:${site.value}`,
    label: site.label,
    sites: [site],
  };
}

function bpsGroupForSite(site: SiteNode): GroupNode {
  return {
    id: `__bps:${site.value}`,
    label: site.label,
    sites: [site],
  };
}

export function buildHierarchyTree(options: SiteOption[]): HierarchyTree {
  const utilityMap = new Map<string, UtilityNode>();
  const orphanGroupMap = new Map<string, GroupNode>();
  const ungrouped: SiteNode[] = [];

  for (const opt of options) {
    const uId = opt.utilityId ?? null;
    const uLabel = opt.utilityLabel ?? null;
    const gId = opt.groupId ?? opt.groupLabel ?? null;
    const gLabel = opt.groupLabel ?? null;

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
        uNode.groups.push(standaloneGroupForSite(opt));
      }
      continue;
    }

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

    ungrouped.push(opt);
  }

  const sortTh = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label, "th");
  const sortUtility = (a: UtilityNode, b: UtilityNode) => {
    if (a.id === BPS_UTILITY.id && b.id !== BPS_UTILITY.id) return 1;
    if (b.id === BPS_UTILITY.id && a.id !== BPS_UTILITY.id) return -1;
    return sortTh(a, b);
  };

  const utilities = Array.from(utilityMap.values()).sort(sortUtility);
  for (const u of utilities) {
    u.groups.sort(sortTh);
    u.groups.forEach((g) => g.sites.sort(sortTh));
    u.ungroupedSites.sort(sortTh);
  }
  const orphanGroups = Array.from(orphanGroupMap.values()).sort(sortTh);
  orphanGroups.forEach((g) => g.sites.sort(sortTh));
  ungrouped.sort(sortTh);

  if (ungrouped.length > 0) {
    utilities.push({
      ...BPS_UTILITY,
      groups: ungrouped.map(bpsGroupForSite),
      ungroupedSites: [],
    });
  }

  return { utilities, orphanGroups, ungrouped: [] };
}

export function countUtilitySites(node: UtilityNode): number {
  return (
    node.groups.reduce((sum, g) => sum + g.sites.length, 0) +
    node.ungroupedSites.length
  );
}

/** Filter hierarchy ตาม search query (case-insensitive, Thai-friendly) */
export function filterHierarchy(
  tree: HierarchyTree,
  query: string
): HierarchyTree {
  const q = query.trim().toLowerCase();
  if (!q) return tree;

  const matchSite = (s: SiteNode) =>
    s.label.toLowerCase().includes(q) ||
    s.value.toLowerCase().includes(q) ||
    (s.groupLabel ?? "").toLowerCase().includes(q) ||
    (s.utilityLabel ?? "").toLowerCase().includes(q);

  const utilities: UtilityNode[] = tree.utilities
    .map((u) => {
      const groups = u.groups
        .map((g) => ({ ...g, sites: g.sites.filter(matchSite) }))
        .filter((g) => g.sites.length > 0 || g.label.toLowerCase().includes(q));
      const ungroupedSites = u.ungroupedSites.filter(matchSite);
      const utilityMatches = u.label.toLowerCase().includes(q);
      if (utilityMatches) {
        // ถ้า utility label match — แสดงทั้งหมดภายใต้ utility นั้น
        return { ...u };
      }
      if (groups.length === 0 && ungroupedSites.length === 0) return null;
      return { ...u, groups, ungroupedSites };
    })
    .filter((u): u is UtilityNode => u !== null);

  const orphanGroups = tree.orphanGroups
    .map((g) =>
      g.label.toLowerCase().includes(q)
        ? { ...g }
        : { ...g, sites: g.sites.filter(matchSite) }
    )
    .filter((g) => g.sites.length > 0);

  const ungrouped = tree.ungrouped.filter(matchSite);

  return { utilities, orphanGroups, ungrouped };
}
