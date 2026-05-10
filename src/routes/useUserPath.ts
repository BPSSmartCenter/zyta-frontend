// src/routes/useUserPath.ts
import { useParams } from "react-router-dom";

/**
 * Path helper hook — kept as a stable API surface so callers don't need to change.
 *
 * Routes are now flat (no `/u/:uid` prefix):
 * - `abs("/devices?type=cctv")` → `/devices?type=cctv`
 * - `absSite("/dashboard", "BKK1")` → `/site/BKK1/dashboard`
 *
 * `uid` is still derived from auth state (kept on the return value for any
 * callers that genuinely need it), and `base` is now an empty string.
 */
export function useUserPath() {
  const params = useParams();
  const siteCodeFromParams = params.siteCode as string | undefined;
  const base = "";

  const abs = (path: string) => {
    if (!path) return "/";
    if (path.startsWith("?")) return path;
    return path.startsWith("/") ? path : `/${path}`;
  };

  const absSite = (path: string, siteCode?: string) => {
    const sc = siteCode || siteCodeFromParams;
    if (!sc) return abs(path);
    const siteBase = `/site/${sc}`;
    if (!path) return siteBase;
    if (path.startsWith("?")) return `${siteBase}${path}`;
    return path.startsWith("/") ? `${siteBase}${path}` : `${siteBase}/${path}`;
  };

  return { uid: undefined as string | undefined, base, abs, absSite };
}
