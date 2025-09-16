import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Noti } from "../../data/Dashboard/notis";

type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: Noti[];
};

/* ---------------- helpers: map noti -> event key ---------------- */
type EventKey = "fire" | "motion" | "offline" | "fall" | "sleep";

const bag = (n: any) =>
  [n?.event, n?.titleKey, n?.title]
    .filter(Boolean)
    .map((x: any) => String(x).toLowerCase().trim())
    .join(" | ");

const getEventKey = (n: Noti): EventKey => {
  const s = bag(n);
  if (/\bfire\b/.test(s) || s.includes("fire detected")) return "fire";
  if (/\bmotion\b/.test(s) || s.includes("motion detected")) return "motion";
  if (/\bfall\b/.test(s) || s.includes("ตรวจพบคนล้ม")) return "fall";
  if (
    /notis\.(camera|device)offline/.test(s) ||  // notis.deviceOffline / notis.cameraOffline
    /(?:camera|device)\s*offline/.test(s) ||    // "Device offline" / "Camera offline"
    /\boffline\b/.test(s) ||                    // คำว่า offline
    /ออฟ.?ไลน์/.test(s)                        // ไทย: ออฟไลน์
  ) return "offline";
  if (/\bsleep\b/.test(s) || s.includes("ตรวจพบคนหลับนานกว่าปกติ")) return "sleep";
  // default ให้เข้าเพจ alert ได้แน่ ๆ
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
  const list = [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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
