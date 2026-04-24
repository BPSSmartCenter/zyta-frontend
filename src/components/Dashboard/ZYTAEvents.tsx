import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import EventPanelState from "./EventPanelState";
import { useTranslation } from "react-i18next";
import { alertImage, insuranceImage } from "../../assets";

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
  showTitle?: boolean;
  loading?: boolean;
};

export default function ZYTAEvents({
  search,
  setSearch,
  items,
  showTitle = true,
  loading = false,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const list = items;

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
    <form className="flex flex-col justify-center py-2 px-3 gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {showTitle && (
        <h1 className="text-[19px] font-inter font-semibold text-[#1E1E1E]">
          {t("zyta.title")}
        </h1>
      )}

      <SearchInput
        value={search}
        placeholder={t("search.placeholder")}
        onChange={setSearch}
        className="font-poppins"
        disableMenu
      />

      <div className="h-[350px] lg:h-[558px] overflow-y-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.length === 0 ? (
          <EventPanelState
            loading={loading}
            emptyText={t("common.noResults")}
            loadingText={t("common.loadingEvents", {
              defaultValue: "Loading events...",
            })}
          />
        ) : (
          <div className="space-y-2">
            {list.map((n, i) => {
              const key = String(n.titleKey || "").toLowerCase();
              const isSos = key === "zytanotis.sos";
              const isAssistant = key === "zytanotis.assistant";
              const title = isSos || isAssistant
                ? n.title
                : n.titleKey
                ? t(n.titleKey, { defaultValue: n.title })
                : n.title;
              const site = t(`sites.${n.site}`, { defaultValue: n.site });
              const dateText = formatDateForUI(n.date);
              const img = isSos
                ? n.img || alertImage
                : isAssistant
                ? n.img || insuranceImage
                : n.img;

              return (
                <NotiCard
                  key={i}
                  type={n.type as any}
                  titleKey={n.titleKey as string | undefined}
                  img={img}
                  title={title}
                  site={site}
                  date={dateText}
                  meta={(n as any)?.meta ?? undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </form>
  );
}
