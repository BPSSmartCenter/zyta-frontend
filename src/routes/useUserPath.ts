// src/routes/useUserPath.ts
import { useParams } from "react-router-dom";


/**
 * Helper hook to construct absolute paths under `/u/:uid` safely.
 * - `abs("/devices?type=cctv")` -> `/u/:uid/devices?type=cctv`
 * - `abs("devices?type=cctv")`  -> `/u/:uid/devices?type=cctv`
 * - If no uid in params, returns the input path unchanged.
 */
export function useUserPath() {
  const params = useParams();
  const uid = params.uid as string | undefined;
  const siteCodeFromParams = params.siteCode as string | undefined;
  const base = uid ? `/u/${uid}` : "";

  const abs = (path: string) => {
    if (!uid) return path; // fallback when not under /u/:uid scope
    if (!path) return base;
    if (path.startsWith("?")) return `${base}${path}`;
    return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
  };

  // Build under /u/:uid/site/:siteCode
  const absSite = (path: string, siteCode?: string) => {
    if (!uid) return path;
    const sc = siteCode || siteCodeFromParams;
    if (!sc) return abs(path);
    const siteBase = `${base}/site/${sc}`;
    if (!path) return siteBase;
    if (path.startsWith("?")) return `${siteBase}${path}`;
    return path.startsWith("/") ? `${siteBase}${path}` : `${siteBase}/${path}`;
  };

  return { uid, base, abs, absSite };
}
