// src/pages/LoginPage/LoginForm.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthPageShell from "../AuthPageShell";

interface LoginFormProps {
  onSubmit?: (
    email: string,
    password: string,
    opts?: { remember: boolean }
  ) => void | Promise<void>;
  submitting?: boolean;
}

export default function LoginForm({ onSubmit, submitting = false }: LoginFormProps) {
  const { t } = useTranslation(["signin"]); // ใช้ namespace signin
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const isEmailValid = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const emailValid = isEmailValid(email);
  const emailInvalid = emailTouched && !emailValid;
  const passwordValid = password.trim().length > 0;
  const canSubmit = emailValid && passwordValid && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit?.(email, password, { remember });
  };

  return (
    <AuthPageShell title={t("title")} subtitle={t("subtitle")}>
      <form
        className="flex w-full flex-col gap-5"
        onSubmit={handleSubmit}
        noValidate
      >
            <div className="flex w-full flex-col gap-1.5">
              <label
                htmlFor="login-email"
                className={`text-sm font-semibold ${
                  emailInvalid ? "text-[#D90452]" : "text-slate-700"
                }`}
              >
                {t("fields.email.label")}
              </label>
              <div className="relative">
                <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                  mail
                </span>
                <input
                  id="login-email"
                  className={`h-11 w-full rounded-[8px] border bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15 sm:h-12 sm:text-base ${
                    emailInvalid ? "border-[#D90452]" : "border-slate-300"
                  }`}
                  type="email"
                  placeholder={t("fields.email.placeholder")}
                  autoComplete="email"
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
              </div>
              <div className="min-h-4" aria-live="polite">
                {emailInvalid && (
                  <span
                    id="email-error"
                    className="select-none text-[12px] font-medium leading-none text-[#D90452]"
                  >
                    {t("fields.email.invalid")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-1.5">
              <label
                htmlFor="login-password"
                className="text-sm font-semibold text-slate-700"
              >
                {t("fields.password.label")}
              </label>
              <div className="relative">
                <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                  lock
                </span>
                <input
                  id="login-password"
                  className="h-11 w-full rounded-[8px] border border-slate-300 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15 sm:h-12 sm:text-base"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("fields.password.placeholder")}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[6px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#3AB8EE]/15"
                  aria-label={
                    showPassword
                      ? t("actions.hide_password", {
                          defaultValue: "Hide password",
                        })
                      : t("actions.show_password", {
                          defaultValue: "Show password",
                        })
                  }
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <span className="material-icons-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-0.5 text-sm text-slate-600 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
              <label
                htmlFor="remember"
                className="relative flex cursor-pointer select-none items-center gap-2"
              >
                <input
                  id="remember"
                  type="checkbox"
                  name="remember"
                  className="peer h-5 w-5 appearance-none rounded-[5px] border border-slate-300 bg-white transition checked:border-[#3AB8EE] checked:bg-[#3AB8EE] focus:outline-none focus:ring-4 focus:ring-[#3AB8EE]/15"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <svg
                  className="pointer-events-none absolute left-[3px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-0 peer-checked:opacity-100"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="white"
                  strokeWidth={3}
                >
                  <polyline points="4 11 8 15 16 6" />
                </svg>
                <span>{t("remember")}</span>
              </label>
              <Link
                to="/forgot"
                className="font-semibold text-[#0877A8] underline-offset-4 transition hover:text-[#0063BF] hover:underline"
              >
                {t("forgot")}
              </Link>
            </div>

            <div className="flex w-full flex-col gap-3 pt-1">
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#0877A8] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(8,119,168,0.24)] transition hover:bg-[#0063BF] focus:outline-none focus:ring-4 focus:ring-[#3AB8EE]/25 disabled:pointer-events-none disabled:opacity-50 sm:h-12 sm:text-base"
                disabled={!canSubmit}
              >
                {submitting && (
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />
                )}
                {submitting
                  ? t("actions.signing_in", {
                      defaultValue: "กำลังเข้าสู่ระบบ",
                    })
                  : t("actions.signin")}
              </button>
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-3 rounded-[8px] border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 sm:h-12 sm:text-base"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 text-sm font-bold text-[#4285F4]">
                  G
                </span>
                {t("actions.signin_google")}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-1 text-center text-sm text-slate-600 sm:text-base">
              <span className="shrink-0">{t("actions.signup_question")}</span>
              <Link
                to={"/register"}
                className="font-bold text-[#0877A8] underline-offset-4 transition hover:text-[#0063BF] hover:underline"
              >
                {t("actions.signup")}
              </Link>
            </div>
      </form>
    </AuthPageShell>
  );
}
