import React from "react";
import { createSiteGroup, listSiteGroups, type SiteGroup } from "../features/siteGroups";

export function useSiteGroups() {
  const [groups, setGroups] = React.useState<SiteGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listSiteGroups();
      setGroups(Array.isArray(items) ? items : []);
    } catch (err: any) {
      setError(err?.message ?? "failed");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const create = React.useCallback(async (name: string, code?: string, utilityId?: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("name is required");
    const resp = await createSiteGroup({ name: trimmed, code, utilityId });
    const item = (resp as any)?.item ?? resp;
    if (item?.id) {
      setGroups((prev) => {
        if (prev.some((g) => g.id === item.id)) return prev;
        return [...prev, item].sort((a, b) => a.name.localeCompare(b.name, "th"));
      });
    } else {
      await refresh();
    }
    return item as SiteGroup;
  }, [refresh]);

  return { groups, loading, error, refresh, create };
}
