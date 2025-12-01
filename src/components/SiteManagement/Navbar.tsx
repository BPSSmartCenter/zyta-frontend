import { useTranslation } from "react-i18next";

type Props = { title: string };

export default function Navbar({ title }: Props) {
  const { t } = useTranslation("dashboard");

  return (
    <nav className="flex justify-between mt-10 bg-white rounded-full p-8">
      <div className="flex gap-3 items-center">
        <div className="w-[60px] h-[60px] flex items-center justify-center rounded-full bg-[#A9DB4E]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="36"
            viewBox="0 0 28 36"
            aria-hidden="true"
          >
            <path
              d="M14 0c7.732 0 14 6.268 14 14 0 9.941-14 22-14 22S0 23.941 0 14C0 6.268 6.268 0 14 0z"
              fill="#FFFFFF"
            />
            <circle cx="14" cy="13.5" r="5" fill="#A9DB4E" />
          </svg>
        </div>
        <h1 className="text-[19px] md:text-2xl font-semibold">{title}</h1>
      </div>

      <div className="gap-6 flex items-center">
        <button
          type="button"
          className="justify-center items-center hover:cursor-pointer"
          aria-label={t("navbar.notifications", {
            defaultValue: "Notifications",
          })}
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
