// src/components/Auth/ResetPasswordPage.tsx
import { useState } from "react";
import brandImage from "../../assets/brand.png";
import { useTranslation } from "react-i18next";

export default function ResetPasswordPage({
  onSubmit,
}: { onSubmit?: (password: string) => void }) {
  const { t } = useTranslation(["reset"]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passMin = password.length >= 10;
  const passComplex = /[0-9]/.test(password) && /[A-Z]/.test(password) && /[a-z]/.test(password);
  const confirmOk = confirm === password && password.length > 0;
  const formValid = passMin && passComplex && confirmOk;

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;
    onSubmit?.(password);
  };

  return (
    <div className="flex justify-center items-center w-screen h-screen px-4">
      <div className="flex-col flex justify-center items-center bg-white min-w-[300px] sm:min-w-[360px] md:min-w-[400px] lg:min-w-[450px] max-w-[90%] sm:max-w-[400px] md:max-w-[500px] rounded-lg p-6">
        <div className="w-[140px] sm:w-[165px] h-[140px]">
          <img className="w-full h-auto" src={brandImage} alt="Brand" />
        </div>
        <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-center select-none">
          {t("reset.title")}
        </h1>
        <span className="mt-3 mb-6 text-center text-sm sm:text-base select-none">
          {t("reset.subtitle")}
        </span>

        <form className="flex flex-col w-full" onSubmit={handle} noValidate>
          <div className="flex gap-1 flex-col mt-4 w-full">
            <label>{t("fields.password.label")}</label>
            <input
              className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
              type="password"
              placeholder={t("fields.password.placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex gap-1 flex-col mt-4 w-full">
              <label>{t("fields.confirm.label")}</label>
              <input
                className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
                type="password"
                placeholder={t("fields.confirm.placeholder")}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                {...(!confirmOk && confirm.length > 0 ? { "aria-invalid": "true", "aria-describedby": "confirm-error" } : {})}
              />
              <div className="h-[10px] mt-[-4px]" aria-live="polite">
                {!confirmOk && confirm.length > 0 && (
                  <span id="confirm-error" className="select-none text-[#EC0357] text-[12px]">
                    {t("fields.confirm.mismatch")}
                  </span>
                )}
              </div>
            </div>

            {/* Password conditions */}
            <div className="mt-2 space-y-1 text-sm text-gray-700 select-none">
              <div className="flex items-center gap-2">
                <i className={["material-icons-outlined checkIcon text-[18px]", passMin ? "text-cyan-500" : "text-gray-400"].join(" ")}>check_circle</i>
                <span>{t("requirements.minLen")}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className={["material-icons-outlined checkIcon text-[18px]", passComplex ? "text-cyan-500" : "text-gray-400"].join(" ")}>check_circle</i>
                <span>{t("requirements.complex")}</span>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3 mt-6">
            <button
              className="bg-cyan w-full font-bold text-white px-4 py-2 rounded-sm hover:bg-blue hover:cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              disabled={!formValid}
            >
              {t("reset.actions.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
