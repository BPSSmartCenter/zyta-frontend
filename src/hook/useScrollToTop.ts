// src/hooks/useScrollToTop.ts
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * เลื่อนจอขึ้นบนสุดทุกครั้งที่ path (หรือ query) เปลี่ยน
 * - ถ้ามี hash (#id) จะพยายามเลื่อนไปยัง element นั้นแทน
 * - ใช้ requestAnimationFrame เพื่อให้รอให้ DOM หลัง route render เสร็จก่อน
 */
export function useScrollToTop({ smooth = false, watchSearch = true } = {}) {
  const { pathname, hash, search } = useLocation();

  useEffect(() => {
    const doScroll = () => {
      // ถ้ามี hash เช่น /page#section — ลองเลื่อนไปยัง element เป้าหมาย
      if (hash) {
        const el = document.getElementById(hash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
          return;
        }
      }
      // ไม่มี hash หรือหา element ไม่เจอ — เลื่อนขึ้นบนสุดของหน้า
      window.scrollTo({ top: 0, left: 0, behavior: smooth ? "smooth" : "auto" });
    };

    // รอให้ route/render เสร็จจริง ๆ ก่อนค่อยเลื่อน
    const raf = requestAnimationFrame(doScroll);
    return () => cancelAnimationFrame(raf);

    // เปลี่ยน path ให้เลื่อนแน่ ๆ
    // ถ้าอยากให้เปลี่ยน query แล้วเลื่อนด้วย ให้เปิด watchSearch (ค่า default = true)
  }, [pathname, hash, watchSearch ? search : null, smooth]);
}

/**
 * เวอร์ชันคอมโพเเนนต์ — เผื่ออยาก import ไปวางใน App ได้เลย
 */
export default function ScrollToTop({ smooth = false, watchSearch = true }) {
  useScrollToTop({ smooth, watchSearch });
  return null;
}
