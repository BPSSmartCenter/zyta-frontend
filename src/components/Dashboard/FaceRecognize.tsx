import SearchInput from "../SearchInput";
import NotiCard from "../notiCard";
import EventPanelState from "./EventPanelState";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";
import { resolveFaceRecKind } from "../../utils/notis";

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

const USE_MOCK_REDIRECT = false;
const OPEN_IN_NEW_TAB = false;
const MOCK_FACEREC_URL =
  "https://bpstech.online/d/dbb32996-2e79-4e04-9963-48e62e2c885d/21062885-26cd-5e06-a9b8-67c449dc0cfb?orgId=1&from=1710928419213&to=1774000419213";

const resolveDefaultTab = (n: FR): "licensePlates" | "faceScan" => {
  const kind = resolveFaceRecKind(n as any);
  if (kind === "face") return "faceScan";
  if (kind === "plate") return "licensePlates";
  return "licensePlates";
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
    if (USE_MOCK_REDIRECT) {
      if (OPEN_IN_NEW_TAB) {
        window.open(MOCK_FACEREC_URL, "_blank", "noopener");
      } else {
        window.location.href = MOCK_FACEREC_URL;
      }
      return;
    }

    // เส้นทางเดิม — พร้อมสลับกลับเมื่อไหร่ก็แค่ปิด USE_MOCK_REDIRECT
    const defaultActive = resolveDefaultTab(n);
    navigate(abs("/facerec"), { state: { noti: n, defaultActive } });
  };
  return (
    <form
      className={[
        "flex flex-col gap-3 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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
