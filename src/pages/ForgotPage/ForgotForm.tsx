// src/pages/ForgotPage/ForgotForm.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthPageShell from "../AuthPageShell";

interface ForgotFormProps {
  onSubmit?: (email: string) => void;
  onChangeEmail?: () => void;
  submitting?: boolean;
  submitLabel?: string;
  remoteError?: string;
}

export default function ForgotForm({
  onSubmit,
  onChangeEmail,
  submitting,
  submitLabel,
  remoteError,
}: ForgotFormProps) {
  const { t } = useTranslation(["reset"]);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const isEmailValid = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const emailValid = isEmailValid(email);
  const invalid = touched && !emailValid;
  const errorText = invalid ? t("fields.email.invalid") : remoteError;

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || submitting) return;
    onSubmit?.(email.trim());
  };

  return (
    <AuthPageShell title={t("forgot.title")} subtitle={t("forgot.subtitle")}>
      <form className="flex w-full flex-col gap-5" onSubmit={handle} noValidate>
        <div className="flex w-full flex-col gap-1.5">
          <label
            htmlFor="forgot-email"
            className={`text-sm font-semibold ${
              errorText ? "text-[#D90452]" : "text-slate-700"
            }`}
          >
            {t("fields.email.label")}
          </label>
          <div className="relative">
            <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
              mail
            </span>
            <input
              id="forgot-email"
              className={`h-11 w-full rounded-[8px] border bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15 sm:h-12 sm:text-base ${
                errorText ? "border-[#D90452]" : "border-slate-300"
              }`}
              type="email"
              placeholder={t("fields.email.placeholder")}
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                onChangeEmail?.();
              }}
              onBlur={() => setTouched(true)}
              {...(errorText
                ? { "aria-invalid": "true", "aria-describedby": "email-error" }
                : {})}
            />
          </div>
          <div className="min-h-4" aria-live="polite">
            {errorText && (
              <span
                id="email-error"
                className="select-none text-[12px] font-medium leading-none text-[#D90452]"
              >
                {errorText}
              </span>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 pt-1">
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#0877A8] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(8,119,168,0.24)] transition hover:bg-[#0063BF] focus:outline-none focus:ring-4 focus:ring-[#3AB8EE]/25 disabled:pointer-events-none disabled:opacity-50 sm:h-12 sm:text-base"
            disabled={!emailValid || submitting}
          >
            {submitting && (
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />
            )}
            {submitLabel ?? t("forgot.actions.send_link")}
            <span className="sr-only" role="status" aria-live="polite">
              {submitting ? t("forgot.actions.checking") : ""}
            </span>
          </button>
          <Link
            to="/login"
            className="text-center text-sm font-semibold text-[#0877A8] underline-offset-4 transition hover:text-[#0063BF] hover:underline sm:text-base"
          >
            {t("reset.login_link")}
          </Link>
        </div>
      </form>
    </AuthPageShell>
  );
}
