import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Noti } from "../../data/Dashboard/notis";
import React from "react";

type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: Noti[];
};

/* ---------------- helpers: map noti -> event key ---------------- */
type EventKey = "fire" | "motion" | "offline" | "fall" | "sleep";

const bag = (n: any) =>
  [n?.event, n?.titleKey, n?.title, n?.type, n?.subtype, n?.category, n?.key]
    .filter(Boolean)
    .map((x: any) => String(x).toLowerCase().trim())
    .join(" | ");

const getEventKey = (n: Noti): EventKey => {
  const s = bag(n);

  if (/\bfire\b/.test(s) || s.includes("fire detected")) return "fire";

  if (
    /notis\.(camera|device)offline/.test(s) ||
    /(?:camera|device)\s*offline/.test(s) ||
    /\boffline\b/.test(s) ||
    /ออฟ.?ไลน์/.test(s)
  )
    return "offline";

  // ✅ ให้ fall มาก่อน motion
  if (
    /\bfall\b/.test(s) ||
    s.includes("ตรวจพบคนล้ม") ||
    s.includes("ตรวจพบการล้ม") ||
    s.includes("fall detected")
  )
    return "fall";

  if (/\bsleep\b/.test(s) || s.includes("ตรวจพบคนหลับนานกว่าปกติ"))
    return "sleep";

  if (
    /\bmotion\b/.test(s) ||
    s.includes("motion detected") ||
    s.includes("ตรวจจับการเคลื่อนไหว")
  )
    return "motion";

  // default เพื่อให้เข้าเพจ alert ได้แน่ ๆ
  return "motion";
};
/* ---------------------------------------------------------------- */

export default function AlertEvents({ search, setSearch, items }: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const navigate = useNavigate();

  const formatDateForUI = (s: string) => {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    const isTH = (i18n.language || "").startsWith("th");
    const locale = isTH ? "th-TH-u-nu-latn" : "en-GB";
    return d.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleClick = (n: Noti) => {
    const ev = getEventKey(n);
    navigate(`/alert?event=${ev}`);
  };

  // เรียงใหม่→เก่า (คงพฤติกรรมเดิม)
  const list = React.useMemo(() => {
    const q = (search || "").toLowerCase().trim();

    // เรียงใหม่→เก่าเหมือนเดิม
    const sorted = [...items].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (!q) return sorted;

    // ใช้ bag() + site + date ให้ค้นหาทั้ง alert + wellbeing ได้
    return sorted.filter((n: any) => {
      const hay = [
        bag(n), // event/titleKey/title (รองรับ i18n key เดิม)
        n?.site, // ชื่อไซต์
        n?.title, // ชื่อเรื่อง plain
        n?.type, // ประเภท เช่น motion/offline/...
        n?.date, // string วันที่
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [items, search, i18n.language]);

  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-3">
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        {t("alerts.allTimeTitle")}
      </h1>

      <SearchInput
        value={search}
        placeholder={t("search.placeholder")}
        onChange={setSearch}
        className="font-poppins"
      />

      <div className="lg:h-[590px] h-[350px] overflow-y-auto px-2">
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="rounded-md px-3 py-2 text-sm text-gray-500">
              {t("common.noResults")}
            </div>
          ) : (
            list.map((n, i) => {
              const title = n.titleKey
                ? t(n.titleKey, { defaultValue: n.title })
                : n.title;
              const site = t(`sites.${n.site}`, { defaultValue: n.site });
              const dateText = formatDateForUI(n.date);

              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleClick(n)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleClick(n);
                  }}
                  className="cursor-pointer outline-none select-none"
                >
                  <NotiCard
                    type={n.type as any}
                    title={title}
                    site={site}
                    date={dateText}
                    img={n.img as any}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </form>
  );
}
