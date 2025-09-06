import React from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const setLng = (lng: "th" | "en") => i18n.changeLanguage(lng);
  const isActive = (lng: "th" | "en") => i18n.language === lng;

  // ซ่อนปุ่มเมื่อมีการ scroll ลง (ไม่อยู่บนสุด) และแสดงเมื่อกลับไปบนสุดของหน้า
  const [show, setShow] = React.useState(true);

  React.useEffect(() => {
    const onScroll = () => {
      // อนุโลมความคลาดเคลื่อนไม่กี่พิกเซล (เช่น iOS bounce) ด้วย threshold 2px
      const atTop = (window.scrollY || window.pageYOffset) <= 2;
      setShow(atTop);
    };
    // เรียกหนึ่งครั้งตอน mount เพื่อเช็คตำแหน่งเริ่มต้น
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const btnClass = (lng: "th" | "en") =>
    `px-3 py-1 text-sm cursor-pointer select-none transition-colors
     hover:bg-gray-600 hover:text-white ${
       isActive(lng) ? "bg-gray-900 text-white" : "bg-white text-gray-700"
     }`;

  return (
    <div
      className={[
        // ขยับตำแหน่งนิดหน่อย (mobile ใกล้มุมขึ้นเล็กน้อย)
        "fixed right-3 top-3 sm:right-4 sm:top-4 z-50",
        // แอนิเมชันซ่อน/แสดง
        "transition-all duration-200",
        show
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-2 pointer-events-none",
      ].join(" ")}
      aria-hidden={!show as any}
    >
      <fieldset
        aria-label="Language switcher"
        className="inline-flex rounded-lg border border-gray-200 overflow-hidden shadow bg-white"
      >
        {/* TH */}
        <input
          id="lng-th"
          type="radio"
          name="lng"
          className="sr-only"
          checked={isActive("th")}
          onChange={() => setLng("th")}
        />
        <label htmlFor="lng-th" className={btnClass("th")}>
          ไทย
        </label>

        {/* EN */}
        <input
          id="lng-en"
          type="radio"
          name="lng"
          className="sr-only"
          checked={isActive("en")}
          onChange={() => setLng("en")}
        />
        <label htmlFor="lng-en" className={btnClass("en")}>
          EN
        </label>
      </fieldset>
    </div>
  );
}
