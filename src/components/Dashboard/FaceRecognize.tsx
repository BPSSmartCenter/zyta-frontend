import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type FR = {
  type: any;
  img?: string;
  title: string;
  titleKey?: string;
  detail?: string;
  site: string;
  date: string;
};

type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: FR[];
};

const USE_MOCK_REDIRECT = true;
const OPEN_IN_NEW_TAB = false;
const MOCK_FACEREC_URL =
  "https://bpstech.online/d/dbb32996-2e79-4e04-9963-48e62e2c885d/21062885-26cd-5e06-a9b8-67c449dc0cfb?orgId=1&from=1710928419213&to=1774000419213";

export default function FaceRecognize({ search, setSearch, items }: Props) {
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

  const handleClick = (n: FR) => {
    if (USE_MOCK_REDIRECT) {
      if (OPEN_IN_NEW_TAB) {
        window.open(MOCK_FACEREC_URL, "_blank", "noopener");
      } else {
        window.location.href = MOCK_FACEREC_URL;
      }
      return;
    }

    // เส้นทางเดิม — พร้อมสลับกลับเมื่อไหร่ก็แค่ปิด USE_MOCK_REDIRECT
    navigate("/facerec", { state: { noti: n } });
  };
  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-3">
      <h1 className="text-[18px] font-inter font-semibold text-[#1E1E1E]">
        {t("face.title")}
      </h1>

      <SearchInput
        value={search}
        placeholder={t("face.searchPlaceholder")}
        onChange={setSearch}
        className="font-poppins"
        inputClassName="placeholder:text-[13px]!"
      />

      <div className="lg-1399:h-[500px] lg:h-full h-[350px] overflow-y-auto px-2">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-md px-3 py-2 text-sm text-gray-500">
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
                    type={n.type}
                    img={n.img}
                    title={title}
                    detail={n.detail}
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
