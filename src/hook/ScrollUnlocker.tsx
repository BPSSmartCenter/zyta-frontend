// ScrollUnlocker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function unlockScroll() {
  document.querySelectorAll<HTMLElement>(".hs-overlay-backdrop").forEach(b => b.remove());
  document.body.classList.remove("hs-overlay-open","hs-overlay-body-open","overflow-hidden");
  document.documentElement.classList.remove("hs-overlay-open");
}

export default function ScrollUnlocker() {
  const location = useLocation();
  useEffect(() => {
    unlockScroll();
  }, [location.pathname]);  // เรียกทุกครั้งที่เปลี่ยน path
  return null;
}
