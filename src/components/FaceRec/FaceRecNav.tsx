// src/components/FaceRec/FaceRecNav.tsx
import { exportImage } from "../../assets";
import { useTranslation } from "react-i18next";
import MiniFiltersBar from "../Shared/MiniFiltersBar";

type Props = { title: string };

export default function FaceRecNav({ title }: Props) {
  const { t } = useTranslation("dashboard");

  return (
    <nav className="flex justify-between mt-10 bg-white rounded-full p-8">
      <div className="flex gap-3 items-center">
        <div className="w-[60px] flex items-center justify-center rounded-full bg-[#A9DB4E] w-auto ">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="white"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-users-icon lucide-users m-4"
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <path d="M16 3.128a4 4 0 0 1 0 7.744" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <circle cx="9" cy="7" r="4" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>

      <div className="gap-6 flex items-center">
        <MiniFiltersBar page="facerec" />
        {/* Import button */}
        <button
          type="button"
          className="inline-flex h-10 w-10 md:w-[105px] items-center justify-center rounded-md border border-gray-300 px-3 text-sm text-[#414651] font-inter font-bold hover:cursor-pointer focus:bg-gray-50"
          aria-label={t("navbar.import", { defaultValue: "Import" })}
          title={t("navbar.import", { defaultValue: "Import" })}
        >
          <span className="truncate flex items-center gap-2">
            {/* ไอคอนเป็นภาพตกแต่ง ใช้ alt="" */}
            <img src={exportImage} alt="" aria-hidden="true" />
            <span className="hidden md:inline">{t("navbar.import")}</span>
            <span className="sr-only">{t("navbar.import", { defaultValue: "Import" })}</span>
          </span>
        </button>

        {/* Bell button */}
        <button
          type="button"
          className="justify-center items-center hover:cursor-pointer"
          aria-label={t("navbar.notifications", { defaultValue: "Notifications" })}
          title={t("navbar.notifications", { defaultValue: "Notifications" })}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-bell-icon lucide-bell"
            aria-hidden="true"
          >
            <path d="M10.268 21a2 2 0 0 0 3.464 0" />
            <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
          </svg>
          <span className="sr-only">
            {t("navbar.notifications", { defaultValue: "Notifications" })}
          </span>
        </button>
      </div>
    </nav>
  );
}
