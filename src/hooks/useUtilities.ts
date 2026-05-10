import React from "react";
import {
  listUtilities,
  createUtility,
  updateUtility,
  deleteUtility,
  type Utility,
} from "../features/utilities";

export function useUtilities() {
  const [utilities, setUtilities] = React.useState<Utility[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listUtilities();
      setUtilities(Array.isArray(items) ? items : []);
    } catch (err: any) {
      setError(err?.message ?? "failed");
      setUtilities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const create = React.useCallback(
    async (name: string, code?: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("name is required");
      const item = await createUtility({ name: trimmed, code });
      if (item?.id) {
        setUtilities((prev) => {
          if (prev.some((u) => u.id === item.id)) return prev;
          return [...prev, item].sort((a, b) =>
            a.name.localeCompare(b.name, "th")
          );
        });
      } else {
        await refresh();
      }
      return item;
    },
    [refresh]
  );

  const update = React.useCallback(
    async (utilityId: string, data: { name?: string; code?: string | null }) => {
      const item = await updateUtility(utilityId, data);
      setUtilities((prev) =>
        prev.map((u) => (u.id === utilityId ? { ...u, ...item } : u))
      );
      return item;
    },
    []
  );

  const remove = React.useCallback(
    async (utilityId: string) => {
      await deleteUtility(utilityId);
      setUtilities((prev) => prev.filter((u) => u.id !== utilityId));
    },
    []
  );

  return { utilities, loading, error, refresh, create, update, remove };
}
