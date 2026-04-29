import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import EventPanelState from "./EventPanelState";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";
import { resolveFaceRecPath } from "../../utils/faceRecRoutes";

type FR = {
  type: any;
  img?: string;
  title: string;
  titleKey?: string;
  detail?: string;
  site: string;
  date: string;
  meta?: Record<string, unknown> | null;
};

type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: FR[];
  loading?: boolean;
  showTitle?: boolean;
  fillAvailableHeight?: boolean;
};

export default function FaceRecognize({
  search,
  setSearch,
  items,
  loading = false,
  showTitle = true,
  fillAvailableHeight = false,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const navigate = useNavigate();

  const { abs } = useUserPath();
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

  const handleClick = (n: FR) => {
    navigate(abs(resolveFaceRecPath(n)), { state: { noti: n } });
  };
  return (
    <form
      className={[
        "flex flex-col gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        fillAvailableHeight ? "h-full min-h-0" : "justify-center",
      ].join(" ")}
    >
      {showTitle ? (
        <h1 className="text-[18px] font-inter font-semibold text-[#1E1E1E]">
          {t("face.title")}
        </h1>
      ) : null}

      <SearchInput
        value={search}
        placeholder={t("face.searchPlaceholder")}
        onChange={setSearch}
        className="shrink-0 font-poppins"
        inputClassName="placeholder:text-[13px]!"
        disableMenu
      />

      <div
        className={[
          "overflow-y-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          fillAvailableHeight
            ? "min-h-0 flex-1"
            : "h-[350px] lg-1399:h-[500px]",
        ].join(" ")}
      >
        <div className="space-y-2">
          {list.length === 0 ? (
            <EventPanelState
              loading={loading}
              emptyText={t("common.noResults")}
              loadingText={t("common.loadingEvents", {
                defaultValue: "Loading events...",
              })}
            />
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
                type={n.type}
                titleKey={n.titleKey}
                img={n.img}
                title={title}
                site={site}
                date={dateText}
                meta={(n as any)?.meta ?? undefined}
                forceImageOnly
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
