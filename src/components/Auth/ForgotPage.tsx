// src/components/Auth/ForgotPage.tsx
import { useState } from "react";
import brandImage from "../../assets/brand.png";
import { useTranslation } from "react-i18next";

interface Props {
  onSubmit?: (email: string) => void;
  submitting?: boolean;
  submitLabel?: string;
  remoteError?: string;
}

export default function ForgotPage({
  onSubmit,
  submitting,
  submitLabel,
  remoteError,
}: Props) {
  const { t } = useTranslation(["reset"]);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const isEmailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const invalid = touched && !isEmailValid(email);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid(email) || submitting) return;
    onSubmit?.(email.trim());
  };

  return (
    <div className="flex justify-center items-center w-screen h-screen px-4">
      <div className="flex-col flex justify-center items-center bg-white min-w-[300px] sm:min-w-[360px] md:min-w-[400px] lg:min-w-[450px] max-w-[90%] sm:max-w-[400px] md:max-w-[500px] rounded-lg p-6">
        <div className="w-[140px] sm:w-[165px] h-[140px]">
          <img className="w-full h-auto" src={brandImage} alt="Brand" />
        </div>
        <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-center select-none">
          {t("forgot.title")}
        </h1>
        <span className="mt-3 mb-6 text-center text-sm sm:text-base select-none">
          {t("forgot.subtitle")}
        </span>

        <form className="flex flex-col w-full" onSubmit={handle} noValidate>
          <div className="flex gap-1 flex-col mt-4 w-full">
            <label className={invalid ? "text-[#EC0357]" : ""}>
              {t("fields.email.label")}
            </label>
            <input
              className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
              type="email"
              placeholder={t("fields.email.placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              {...(invalid
                ? { "aria-invalid": "true", "aria-describedby": "email-error" }
                : {})}
            />
            <div className="h-[18px] mt-[-3px]" aria-live="polite">
              {invalid && (
                <span
                  id="email-error"
                  className="select-none text-[#EC0357] text-[12px]"
                >
                  {t("fields.email.invalid")}
                </span>
              )}
              {!invalid && remoteError && (
                <span className="select-none text-[#EC0357] text-[12px]">
                  {remoteError}
                </span>
              )}
            </div>
          </div>

          <div className="w-full flex flex-col gap-3 mt-6">
            <button
              type="submit"
              className="bg-cyan w-full font-bold text-white px-4 py-2 rounded-sm hover:bg-blue hover:cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              disabled={!isEmailValid(email) || submitting}
            >
              {submitLabel ?? t("forgot.actions.send_link")}
              <span className="sr-only" role="status" aria-live="polite">
                {submitting ? t("forgot.actions.checking") : ""}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
