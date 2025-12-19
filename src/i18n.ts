import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

i18n
  .use(HttpBackend) // โหลดไฟล์แปลจาก public/locales/{lng}/{ns}.json
  .use(LanguageDetector) // ตรวจจาก localStorage, querystring, navigator ฯลฯ
  .use(initReactI18next)
  .init({
    fallbackLng: "th", // ดีฟอลต์เป็นไทย
    supportedLngs: ["th", "en"],
    ns: [
      "common",
      "dashboard",
      "signin",
      "signup",
      "devices",
      "alert",
      "billing",
      "userManagement",
      "siteManagement",
    ],
    defaultNS: "common",
    debug: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "querystring", "navigator"],
      caches: ["localStorage"],
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
