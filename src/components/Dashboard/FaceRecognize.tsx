import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import { useTranslation } from "react-i18next";

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

export default function FaceRecognize({ search, setSearch, items }: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);

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

  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-3">
      <h1 className="text-[18px]  font-inter font-semibold text-[#1E1E1E]">
        {t("face.title")}
      </h1>

      <SearchInput
        value={search}
        placeholder={t("face.searchPlaceholder")}
        onChange={setSearch}
        className="font-poppins"
        inputClassName="placeholder:text-[13px]!"
      />

      <div className="h-[680px] overflow-y-auto px-2">
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
                <NotiCard
                  key={i}
                  type={n.type}
                  img={n.img}
                  title={title}
                  detail={n.detail}
                  site={site}
                  date={dateText}
                />
              );
            })
          )}
        </div>
      </div>
    </form>
  );
}
