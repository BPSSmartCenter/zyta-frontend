type PathLocation = {
  pathname: string;
  search?: string;
  hash?: string;
};

export type LoginRedirectState = {
  returnTo: string;
};

const AUTH_ENTRY_PATHS = new Set([
  "/",
  "/register",
  "/forgot",
  "/reset",
  "/verify-email",
]);

function isSafeInternalPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//");
}

function parseInternalPath(path: string) {
  if (!isSafeInternalPath(path)) return null;

  try {
    return new URL(path, "https://bps.local");
  } catch {
    return null;
  }
}

export function createLoginRedirectState(
  location: PathLocation
): LoginRedirectState | undefined {
  const returnTo = `${location.pathname}${location.search ?? ""}${
    location.hash ?? ""
  }`;

  if (!isSafeInternalPath(returnTo) || AUTH_ENTRY_PATHS.has(location.pathname)) {
    return undefined;
  }

  return { returnTo };
}

export function getReturnToFromState(state: unknown) {
  if (!state || typeof state !== "object" || !("returnTo" in state)) {
    return undefined;
  }

  const returnTo = (state as LoginRedirectState).returnTo;
  return typeof returnTo === "string" ? returnTo : undefined;
}

export function buildPostLoginPath(userId: string | number, returnTo?: string) {
  const encodedUserId = encodeURIComponent(String(userId));
  const fallbackPath = `/u/${encodedUserId}/dashboard`;
  if (!returnTo) return fallbackPath;

  const url = parseInternalPath(returnTo);
  if (!url) return fallbackPath;

  if (AUTH_ENTRY_PATHS.has(url.pathname) || url.pathname === "/dashboard") {
    return fallbackPath;
  }

  const userScopedMatch = url.pathname.match(/^\/u\/[^/]+(?<path>\/.*)?$/);
  if (!userScopedMatch) return fallbackPath;

  const userScopedPath = userScopedMatch.groups?.path || "/dashboard";
  return `/u/${encodedUserId}${userScopedPath}${url.search}${url.hash}`;
}
