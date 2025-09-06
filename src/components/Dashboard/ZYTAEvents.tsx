import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import { useTranslation } from "react-i18next";

type Noti = {
  type: string;
  title: string;
  titleKey?: string;
  site: string;
  date: string;
  img?: string;
};

type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: Noti[];
};

export default function ZYTAEvents({ search, setSearch, items }: Props) {
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
      <h1 className="text-[19px] font-inter font-semibold text-[#1E1E1E]">
        {t("zyta.title")}
      </h1>

      <SearchInput
        value={search}
        placeholder={t("search.placeholder")}
        onChange={setSearch}
        className="font-poppins"
      />

      <div className="lg:h-[1170px] md:h-[1070px] overflow-y-auto px-2">
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
                  type={n.type as any}
                  img={n.img}
                  title={title}
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
