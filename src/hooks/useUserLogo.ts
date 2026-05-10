import { useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { selectAuthUser } from "../features/auth";
import { buildBrandingLogoSrc } from "../utils/branding";
import { brandImage } from "../assets";

/**
 * Resolve the user's branding logo src. Reads from Redux (populated by
 * `bootstrapAuth` / login thunks) so we don't fire a redundant /users/me request
 * each time a component needs the logo.
 */
export function useUserLogo(): string {
  const authUser = useAppSelector(selectAuthUser);
  return useMemo(() => {
    const resolved = authUser?.brandingLogoUrl
      ? buildBrandingLogoSrc(authUser.brandingLogoUrl)
      : null;
    return resolved ?? brandImage;
  }, [authUser?.brandingLogoUrl]);
}
