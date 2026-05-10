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
  "/login",
  "/register",
  "/forgot",
  "/reset",
  "/verify-email",
]);

const FALLBACK_PATH = "/dashboard";

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

export function buildPostLoginPath(_userId: string | number, returnTo?: string) {
  if (!returnTo) return FALLBACK_PATH;

  const url = parseInternalPath(returnTo);
  if (!url) return FALLBACK_PATH;

  if (AUTH_ENTRY_PATHS.has(url.pathname)) {
    return FALLBACK_PATH;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
