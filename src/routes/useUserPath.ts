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
  const base = uid ? `/u/${uid}` : "";

  const abs = (path: string) => {
    if (!uid) return path; // fallback when not under /u/:uid scope
    if (!path) return base;
    // handle full URLSearch style like "?a=b"
    if (path.startsWith("?")) return `${base}${path}`;
    // normalize to single slash
    return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
  };

  return { uid, base, abs };
}
