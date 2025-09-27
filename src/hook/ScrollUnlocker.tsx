// src/hook/ScrollUnlocker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function unlockScrollHard() {
  // 1) ลบ backdrop ที่ค้าง
  document.querySelectorAll<HTMLElement>(".hs-overlay-backdrop, .preline-backdrop").forEach(b => {
    try { b.remove(); } catch {}
  });

  // 2) ถอด class ที่ล็อกสกรอล์
  const clsToRemove = ["hs-overlay-open","hs-overlay-body-open","overflow-hidden","overflow-y-hidden","fixed"];
  document.body.classList.remove(...clsToRemove);
  document.documentElement.classList.remove(...clsToRemove);

  // 3) ถอด inline style ที่อาจค้างอยู่
  const clearStyle = (el: HTMLElement) => {
    // ถ้าเคยโดน set เป็น overflow:hidden / position:fixed / height:100% ฯลฯ
    el.style.overflow = "";
    el.style.overflowY = "";
    el.style.position = "";
    el.style.height = "";
  };
  clearStyle(document.body);
  clearStyle(document.documentElement);

  // 4) เผื่อบาง lib ใส่ style โดยตรงผ่าน attribute
  document.body.removeAttribute("data-hs-overlay-open");
}

export default function ScrollUnlocker() {
  const location = useLocation();

  useEffect(() => {
    // กวาดทันทีเมื่อเปลี่ยนเส้นทาง
    unlockScrollHard();
    // แล้วกวาดซ้ำอีกครั้งหลัง transition เผื่อ backdrop ถูกใส่ช้ากว่า
    const t = setTimeout(unlockScrollHard, 0);
    const t2 = setTimeout(unlockScrollHard, 250);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [location.pathname]);

  return null;
}
