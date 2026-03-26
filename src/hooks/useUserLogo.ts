import { useState, useEffect } from "react";
import { me as apiMe } from "../api/user";
import { buildBrandingLogoSrc } from "../utils/branding";
import { brandImage } from "../assets";

const LOGO_CACHE_KEY = "bps_user_branding_logo";

export function useUserLogo(): string {
  const [logoSrc, setLogoSrc] = useState<string>(() => {
    try { return localStorage.getItem(LOGO_CACHE_KEY) || brandImage; } catch { return brandImage; }
  });

  useEffect(() => {
    (async () => {
      try {
        const me = await apiMe();
        if (me?.brandingLogoUrl) {
          const resolved = buildBrandingLogoSrc(me.brandingLogoUrl) ?? undefined;
          if (resolved) {
            setLogoSrc(resolved);
            try { localStorage.setItem(LOGO_CACHE_KEY, resolved); } catch {}
            return;
          }
        }
        setLogoSrc(brandImage);
        try { localStorage.removeItem(LOGO_CACHE_KEY); } catch {}
      } catch {
        // keep current value
      }
    })();
  }, []);

  return logoSrc;
}
