import React from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [pendingLng, setPendingLng] = React.useState<"th" | "en" | null>(null);

  // เปลี่ยนภาษาแบบไม่รีโหลดทั้งหน้า
  const setLng = (lng: "th" | "en") => {
    if (i18n.language === lng || pendingLng) return; // กดภาษาที่ใช้อยู่แล้ว ไม่ต้องทำอะไร
    setPendingLng(lng);
    void i18n
      .changeLanguage(lng)
      .catch(() => {
        // noop: ให้ผู้ใช้ลองกดอีกครั้งหากโหลดภาษาไม่สำเร็จ
      })
      .finally(() => setPendingLng(null));
  };

  const isActive = (lng: "th" | "en") =>
    pendingLng ? pendingLng === lng : i18n.language === lng;

  // ซ่อนปุ่มเมื่อมีการ scroll ลง (ไม่อยู่บนสุด) และแสดงเมื่อกลับไปบนสุดของหน้า
  const [show, setShow] = React.useState(true);

  React.useEffect(() => {
    const onScroll = () => {
      // อนุโลมความคลาดเคลื่อนไม่กี่พิกเซล (เช่น iOS bounce) ด้วย threshold 2px
      const atTop = (window.scrollY || window.pageYOffset) <= 2;
      setShow(atTop);
    };
    onScroll(); // เช็คครั้งแรกตอน mount
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const btnClass = (lng: "th" | "en") =>
    `px-3 py-1 text-sm cursor-pointer select-none transition-colors
     hover:bg-gray-600 hover:text-white ${
       isActive(lng) ? "bg-gray-900 text-white" : "bg-white text-gray-700"
     }`;

  // แยก class เดิมออกเป็นส่วน ๆ เพื่อประกอบเหมือนเดิม
  const base =
    "fixed right-3 top-3 sm:right-4 sm:top-4 z-50 transition-all duration-200";
  const visible = "opacity-100 translate-y-0 pointer-events-auto";
  const hidden = "opacity-0 -translate-y-2 pointer-events-none";

  const content = (
    <fieldset
      aria-label="Language switcher"
      aria-busy={pendingLng ? "true" : "false"}
      className="inline-flex rounded-lg border border-gray-200 overflow-hidden shadow bg-white"
    >
      {/* TH */}
      <input
        id="lng-th"
        type="radio"
        name="lng"
        className="sr-only"
        checked={isActive("th")}
         disabled={Boolean(pendingLng)}
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
        disabled={Boolean(pendingLng)}
        onChange={() => setLng("en")}
      />
      <label htmlFor="lng-en" className={btnClass("en")}>
        EN
      </label>
    </fieldset>
  );

  // เรนเดอร์ 2 กรณี เพื่อให้ aria-hidden เป็น string literal
  return show ? (
    <div className={`${base} ${visible}`} aria-hidden="false">
      {content}
    </div>
  ) : (
    <div className={`${base} ${hidden}`} aria-hidden="true">
      {content}
    </div>
  );
}
