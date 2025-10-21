import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";

/* ----- types ----- */
type WB = {
  type: string;
  title: string;
  site: string;
  date: string;
  img?: string;
  titleKey?: string;
};
type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: WB[];
};

/* ----- helpers: map noti -> event key ----- */
type EventKey = "fire" | "motion" | "offline" | "fall" | "sleep";

const bag = (n: any) =>
  [n?.event, n?.titleKey, n?.title]
    .filter(Boolean)
    .map((x: any) => String(x).toLowerCase().trim())
    .join(" | ");

const getEventKey = (n: WB): EventKey => {
  const s = bag(n);
  if (/\bfire\b/.test(s) || s.includes("fire detected")) return "fire";
  if (/\bmotion\b/.test(s) || s.includes("motion detected")) return "motion";
  if (/\bfall\b/.test(s) || s.includes("ตรวจพบคนล้ม")) return "fall";
  if (
    /notis\.(camera|device)offline/.test(s) ||
    /(?:camera|device)\s*offline/.test(s) ||
    /\boffline\b/.test(s) ||
    /ออฟ.?ไลน์/.test(s)
  )
    return "offline";
  if (/\bsleep\b/.test(s) || s.includes("ตรวจพบคนหลับนานกว่าปกติ"))
    return "sleep";
  return "motion";
};
/* ------------------------------------------ */

export default function WellBeingEvents({ search, setSearch, items }: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const navigate = useNavigate();

  const { abs } = useUserPath();
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

  const handleClick = (n: WB) => {
    const ev = getEventKey(n);
    navigate(abs(`/alert?event=${ev}`));
  };

  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-3">
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        {t("wellbeing.title")}
      </h1>
      <SearchInput
        value={search}
        placeholder={t("search.placeholder")}
        onChange={setSearch}
        className="font-poppins"
      />
      <div className="lg-1399:h-[375px] h-[350px] lg:h	full overflow-y-auto px-2">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
              {t("common.noResults")}
            </div>
          ) : (
            items.map((n, i) => {
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
                    img={n.img as any}
                    site={site}
                    date={dateText}
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
