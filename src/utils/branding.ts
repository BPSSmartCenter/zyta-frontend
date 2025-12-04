export function buildBrandingLogoSrc(raw?: string | null): string | null {
  if (!raw) return null;
  if (/^(data:|https?:\/\/)/i.test(raw)) {
    return raw;
  }

  const env = import.meta.env;
  // Prefer dedicated asset origin but fall back to API base (minus /api) for dev/staging.
  const preferredBase =
    (env?.VITE_API_URL && env.VITE_API_URL.trim()) ||
    (env?.VITE_API_BASE_URL && env.VITE_API_BASE_URL.trim()) ||
    "";
  if (!preferredBase) return raw;

  let normalizedBase = preferredBase.replace(/\/api\/?$/i, "");
  if (!normalizedBase) normalizedBase = preferredBase;
  if (normalizedBase.endsWith("/")) {
    normalizedBase = normalizedBase.slice(0, -1);
  }
  const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
  return `${normalizedBase}${normalizedPath}`;
}
