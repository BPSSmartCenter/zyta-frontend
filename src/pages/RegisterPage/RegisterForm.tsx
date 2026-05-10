// src/pages/RegisterPage/RegisterForm.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthPageShell from "../AuthPageShell";

interface RegisterFormProps {
  onSubmit?: (
    email: string,
    password: string,
    confirmPassword: string,
    extras?: { firstName: string; lastName: string }
  ) => void;
  serverEmailError?: string;
  onChangeEmail?: () => void;
  submitLabel?: string;
  submitting?: boolean;
}

export default function RegisterForm({
  onSubmit,
  serverEmailError,
  onChangeEmail,
  submitLabel,
  submitting,
}: RegisterFormProps) {
  const { t } = useTranslation(["signup"]);

  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [firstTouched, setFirstTouched] = useState(false);
  const [lastName, setLastName] = useState("");
  const [lastTouched, setLastTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const isEmailValid = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const emailInvalid = emailTouched && !isEmailValid(email);
  const emailError = emailInvalid
    ? t("fields.email.invalid")
    : serverEmailError;

  const firstOk = firstName.trim().length > 0;
  const lastOk = lastName.trim().length > 0;
  const firstInvalid = firstTouched && !firstOk;
  const lastInvalid = lastTouched && !lastOk;

  const passMin = password.length >= 10;
  const passComplex =
    /[0-9]/.test(password) && /[A-Z]/.test(password) && /[a-z]/.test(password);
  const confirmOk = confirmPassword === password && password.length > 0;
  const confirmInvalid = confirmPassword.length > 0 && !confirmOk;

  const formValid =
    isEmailValid(email) &&
    firstOk &&
    lastOk &&
    passMin &&
    passComplex &&
    confirmOk &&
    termsAccepted;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid || submitting) return;
    onSubmit?.(email, password, confirmPassword, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
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
            htmlFor="register-email"
            className={`text-sm font-semibold ${
              emailError ? "text-[#D90452]" : "text-slate-700"
            }`}
          >
            {t("fields.email.label")}
          </label>
          <div className="relative">
            <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
              mail
            </span>
            <input
              id="register-email"
              className={`h-11 w-full rounded-[8px] border bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15 sm:h-12 sm:text-base ${
                emailError ? "border-[#D90452]" : "border-slate-300"
              }`}
              type="email"
              placeholder={t("fields.email.placeholder")}
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                onChangeEmail?.();
              }}
              onBlur={() => setEmailTouched(true)}
              {...(emailError
                ? { "aria-invalid": "true", "aria-describedby": "email-error" }
                : {})}
            />
          </div>
          <div className="min-h-4" aria-live="polite">
            {emailError && (
              <span
                id="email-error"
                className="select-none text-[12px] font-medium leading-none text-[#D90452]"
              >
                {emailError}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 min-[520px]:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="register-first-name"
              className={`text-sm font-semibold ${
                firstInvalid ? "text-[#D90452]" : "text-slate-700"
              }`}
            >
              {t("fields.firstName.label")}
            </label>
            <div className="relative">
              <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                person
              </span>
              <input
                id="register-first-name"
                className={`h-11 w-full rounded-[8px] border bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15 sm:h-12 sm:text-base ${
                  firstInvalid ? "border-[#D90452]" : "border-slate-300"
                }`}
                type="text"
                placeholder={t("fields.firstName.placeholder")}
                autoComplete="given-name"
                value={firstName}
                onBlur={() => setFirstTouched(true)}
                onChange={(e) => setFirstName(e.target.value)}
                {...(firstInvalid
                  ? {
                      "aria-invalid": "true",
                      "aria-describedby": "first-error",
                    }
                  : {})}
              />
            </div>
            <div className="min-h-4 text-[12px]" aria-live="polite">
              {firstInvalid && (
                <span
                  id="first-error"
                  className="font-medium leading-none text-[#D90452]"
                >
                  {t("fields.firstName.required")}
                </span>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="register-last-name"
              className={`text-sm font-semibold ${
                lastInvalid ? "text-[#D90452]" : "text-slate-700"
              }`}
            >
              {t("fields.lastName.label")}
            </label>
            <div className="relative">
              <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                person
              </span>
              <input
                id="register-last-name"
                className={`h-11 w-full rounded-[8px] border bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15 sm:h-12 sm:text-base ${
                  lastInvalid ? "border-[#D90452]" : "border-slate-300"
                }`}
                type="text"
                placeholder={t("fields.lastName.placeholder")}
                autoComplete="family-name"
                value={lastName}
                onBlur={() => setLastTouched(true)}
                onChange={(e) => setLastName(e.target.value)}
                {...(lastInvalid
                  ? {
                      "aria-invalid": "true",
                      "aria-describedby": "last-error",
                    }
                  : {})}
              />
            </div>
            <div className="min-h-4 text-[12px]" aria-live="polite">
              {lastInvalid && (
                <span
                  id="last-error"
                  className="font-medium leading-none text-[#D90452]"
                >
                  {t("fields.lastName.required")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 min-[520px]:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="register-password"
              className="text-sm font-semibold text-slate-700"
            >
              {t("fields.password.label")}
            </label>
            <div className="relative">
              <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                lock
              </span>
              <input
                id="register-password"
                className="h-11 w-full rounded-[8px] border border-slate-300 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15 sm:h-12 sm:text-base"
                type={showPassword ? "text" : "password"}
                placeholder={t("fields.password.placeholder")}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[6px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#3AB8EE]/15"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                <span className="material-icons-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="register-confirm"
              className={`text-sm font-semibold ${
                confirmInvalid ? "text-[#D90452]" : "text-slate-700"
              }`}
            >
              {t("fields.confirm.label")}
            </label>
            <div className="relative">
              <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                lock
              </span>
              <input
                id="register-confirm"
                className={`h-11 w-full rounded-[8px] border bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15 sm:h-12 sm:text-base ${
                  confirmInvalid ? "border-[#D90452]" : "border-slate-300"
                }`}
                type={showConfirm ? "text" : "password"}
                placeholder={t("fields.confirm.placeholder")}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                {...(confirmInvalid
                  ? {
                      "aria-invalid": "true",
                      "aria-describedby": "confirm-error",
                    }
                  : {})}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[6px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#3AB8EE]/15"
                aria-label={showConfirm ? "Hide password" : "Show password"}
                onClick={() => setShowConfirm((value) => !value)}
              >
                <span className="material-icons-outlined text-[20px]">
                  {showConfirm ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            <div className="min-h-4 text-[12px]" aria-live="polite">
              {confirmInvalid && (
                <span
                  id="confirm-error"
                  className="font-medium leading-none text-[#D90452]"
                >
                  {t("fields.confirm.mismatch")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[8px] bg-slate-50 p-3 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <span
              className={`material-icons-outlined text-[18px] ${
                passMin ? "text-[#0877A8]" : "text-slate-400"
              }`}
            >
              check_circle
            </span>
            <span>{t("requirements.minLen")}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`material-icons-outlined text-[18px] ${
                passComplex ? "text-[#0877A8]" : "text-slate-400"
              }`}
            >
              check_circle
            </span>
            <span>{t("requirements.complex")}</span>
          </div>
        </div>

        <label
          htmlFor="terms"
          className="relative flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600"
        >
          <input
            id="terms"
            type="checkbox"
            name="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="peer h-5 w-5 appearance-none rounded-[5px] border border-slate-300 bg-white transition checked:border-[#3AB8EE] checked:bg-[#3AB8EE] focus:outline-none focus:ring-4 focus:ring-[#3AB8EE]/15"
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
          <span>{t("terms")}</span>
        </label>

        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#0877A8] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(8,119,168,0.24)] transition hover:bg-[#0063BF] focus:outline-none focus:ring-4 focus:ring-[#3AB8EE]/25 disabled:pointer-events-none disabled:opacity-50 sm:h-12 sm:text-base"
          disabled={!formValid || submitting}
        >
          {submitting && (
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />
          )}
          {submitLabel ?? t("actions.signup")}
        </button>

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-slate-600 sm:text-base">
          <span className="shrink-0">{t("footer.have_account")}</span>
          <Link
            to="/login"
            className="font-bold text-[#0877A8] underline-offset-4 transition hover:text-[#0063BF] hover:underline"
          >
            {t("actions.signin")}
          </Link>
        </div>
      </form>
    </AuthPageShell>
  );
}
