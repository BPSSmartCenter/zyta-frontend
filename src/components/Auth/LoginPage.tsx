// src/components/Auth/LoginPage.tsx
import { useState } from "react";
import brandImage from "../../assets/brand.png";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface LoginPageProps {
  onSubmit?: (email: string, password: string) => void;
}

export default function LoginPage({ onSubmit }: LoginPageProps) {
  const { t } = useTranslation(["signin"]); // ใช้ namespace signin
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");

  const isEmailValid = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const emailValid = isEmailValid(email);
  const emailInvalid = emailTouched && !emailValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return;
    onSubmit?.(email, password);
  };

  return (
    <div className="flex justify-center items-center w-screen h-screen px-4">
      <div
        className="
          flex-col flex justify-center items-center
          bg-white
          min-w-[300px] sm:min-w-[360px] md:min-w-[400px] lg:min-w-[450px]
          max-w-[90%] sm:max-w-[400px] md:max-w-[500px]
          rounded-lg p-6
        "
      >
        {/* Logo */}
        <div className="w-[140px] sm:w-[165px] h-[140px]">
          <img className="w-full h-auto" src={brandImage} alt="Brand" />
        </div>

        {/* Title */}
        <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-center select-none">
          {t("title")}
        </h1>
        <span className="mt-3 mb-6 text-center text-sm sm:text-base select-none">
          {t("subtitle")}
        </span>

        {/* Form */}
        <form
          className="flex flex-col w-full"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Email */}
          <div className="flex gap-1 flex-col mt-4 w-full">
            <label className={emailInvalid ? "text-[#EC0357]" : ""}>
              {t("fields.email.label")}
            </label>
            <input
              className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
              type="email"
              placeholder={t("fields.email.placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              {...(emailInvalid
                ? {
                    "aria-invalid": "true",
                    "aria-describedby": "email-error",
                  }
                : {})}
            />
            <div className="h-[18px] mt-[-3px]" aria-live="polite">
              {emailInvalid && (
                <span
                  id="email-error"
                  className="select-none text-[#EC0357] text-[12px]"
                >
                  {t("fields.email.invalid")}
                </span>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="flex gap-1 flex-col mt-2 w-full">
            <label>{t("fields.password.label")}</label>
            <input
              className="border border-gray-500 pl-3 h-[40px] rounded-lg text-sm sm:text-base"
              type="password"
              placeholder={t("fields.password.placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Remember + Forgot */}
          <div className="flex justify-between items-center w-full mt-4 text-sm sm:text-base">
            <div className="flex items-center">
              <label
                htmlFor="remember"
                className="flex items-center gap-2 cursor-pointer select-none relative"
              >
                <input
                  id="remember"
                  type="checkbox"
                  name="remember"
                  className="peer appearance-none w-[16px] h-4 border rounded-sm bg-white checked:bg-cyan-500 checked:border-cyan-500 focus:outline-none focus:ring-0"
                />
                <svg
                  className="absolute left-[0px] top-[3px] w-[16px] h-4 opacity-0 peer-checked:opacity-100"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                >
                  <polyline points="5 11 9 15 15 6" />
                </svg>
                <span>{t("remember")}</span>
              </label>
            </div>
            <a
              href="#"
              className="text-cyan font-bold hover:text-blue select-none"
            >
              {t("forgot")}
            </a>
          </div>

          {/* Buttons */}
          <div className="w-full flex flex-col gap-3 mt-6">
            <button
              className="bg-cyan w-full font-bold text-white px-4 py-2 rounded-sm hover:bg-blue hover:cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              disabled={!emailValid}
            >
              {t("actions.signin")}
            </button>
            <button className="w-full font-bold border-2 border-gray-200 px-4 py-2 rounded-sm hover:bg-gray-300 hover:cursor-pointer">
              {t("actions.signin_google")}
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-6 text-sm sm:text-base">
            <span>{t("actions.signup_question")}</span>
            <Link
              to={"/register"}
              className="text-cyan font-bold hover:cursor-pointer hover:text-blue"
            >
              {t("actions.signup")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
