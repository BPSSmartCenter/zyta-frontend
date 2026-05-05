import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import EventPanelState from "./EventPanelState";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";
import { resolveAlertEventKey } from "../../utils/notis";

/* ----- types ----- */
type WB = {
  type: string;
  title: string;
  site: string;
  date: string;
  img?: string;
  titleKey?: string;
  meta?: Record<string, unknown> | null;
};
type Props = {
  search: string;
  setSearch: (v: string) => void;
  items: WB[];
  showTitle?: boolean;
  loading?: boolean;
  fillAvailableHeight?: boolean;
};

/* ----- helpers: map noti -> event key ----- */
type EventKey = "fire" | "motion" | "offline" | "fall" | "sleep";

const getEventKey = (n: WB): EventKey | null => {
  const key = resolveAlertEventKey(n as any);
  return (key as EventKey | null) ?? null;
};
/* ------------------------------------------ */

export default function WellBeingEvents({
  search,
  setSearch,
  items,
  showTitle = true,
  loading = false,
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

  const navigateToEvent = (ev: EventKey | null) => {
    if (!ev) return;
    navigate(abs(`/alert?event=${ev}`));
  };

  return (
    <form
      className={[
        "flex flex-col gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        fillAvailableHeight ? "h-full min-h-0" : "justify-center",
      ].join(" ")}
    >
      {showTitle && (
        <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
          {t("wellbeing.title")}
        </h1>
      )}
      <SearchInput
        value={search}
        placeholder={t("search.placeholder")}
        onChange={setSearch}
        className="shrink-0 font-poppins"
        disableMenu
      />
      <div
        className={[
          "overflow-y-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          fillAvailableHeight
            ? "min-h-0 flex-1"
            : showTitle
              ? "h-[340px] lg-1399:h-[490px]"
              : "h-[350px] lg:h-[558px]",
        ].join(" ")}
      >
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
              const title = n.titleKey
                ? t(n.titleKey, { defaultValue: n.title })
                : n.title;
              const site = t(`sites.${n.site}`, { defaultValue: n.site });
              const dateText = formatDateForUI(n.date);
              const eventKey = getEventKey(n);
              const isNavigable = Boolean(eventKey);

              return (
                <div
                  key={i}
                  role={isNavigable ? "button" : "presentation"}
                  tabIndex={isNavigable ? 0 : -1}
                  onClick={() => {
                    if (isNavigable) navigateToEvent(eventKey);
                  }}
                  onKeyDown={(e) => {
                    if (!isNavigable) return;
                    if (e.key === "Enter" || e.key === " ") {
                      navigateToEvent(eventKey);
                    }
                  }}
                  className={`${isNavigable ? "cursor-pointer" : "cursor-default"} outline-none select-none`}
                >
                <NotiCard
                  type={n.type as any}
                  titleKey={n.titleKey}
                  title={title}
                  img={n.img as any}
                  meta={(n as any)?.meta ?? undefined}
                  site={site}
                  date={dateText}
                  forceDefaultImage
                />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </form>
  );
}
