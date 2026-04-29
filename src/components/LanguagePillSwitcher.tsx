import React from "react";
import { useTranslation } from "react-i18next";

type Props = {
  name?: string;
};

export default function LanguagePillSwitcher({
  name = "language-switcher",
}: Props) {
  const { i18n } = useTranslation(["dashboard"]);
  const [pendingLng, setPendingLng] = React.useState<"th" | "en" | null>(null);

  const setLng = (lng: "th" | "en") => {
    if (i18n.language === lng || pendingLng) return;
    setPendingLng(lng);
    void i18n
      .changeLanguage(lng)
      .catch(() => undefined)
      .finally(() => setPendingLng(null));
  };

  const isActive = (lng: "th" | "en") =>
    pendingLng ? pendingLng === lng : i18n.language === lng;

  return (
    <fieldset
      aria-label="Language switcher"
      aria-busy={pendingLng ? "true" : "false"}
      className="inline-flex h-11 items-center rounded-[18px] border border-[#CDEFFF] bg-white p-1 shadow-[0_12px_30px_rgba(57,184,238,0.12)]"
    >
      <input
        id={`${name}-th`}
        type="radio"
        name={name}
        className="sr-only"
        checked={isActive("th")}
        disabled={Boolean(pendingLng)}
        onChange={() => setLng("th")}
      />
      <label
        htmlFor={`${name}-th`}
        className={[
          "inline-flex h-9 items-center rounded-[14px] px-3 text-sm font-semibold transition",
          isActive("th")
            ? "bg-[#39B8EE] text-white"
            : "text-[#5B6B7F] hover:bg-[#E9F9FF] hover:text-[#1689BC]",
        ].join(" ")}
      >
        ไทย
      </label>

      <input
        id={`${name}-en`}
        type="radio"
        name={name}
        className="sr-only"
        checked={isActive("en")}
        disabled={Boolean(pendingLng)}
        onChange={() => setLng("en")}
      />
      <label
        htmlFor={`${name}-en`}
        className={[
          "inline-flex h-9 items-center rounded-[14px] px-3 text-sm font-semibold transition",
          isActive("en")
            ? "bg-[#39B8EE] text-white"
            : "text-[#5B6B7F] hover:bg-[#E9F9FF] hover:text-[#1689BC]",
        ].join(" ")}
      >
        EN
      </label>
    </fieldset>
  );
}
