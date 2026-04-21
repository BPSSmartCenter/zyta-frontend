// src/pages/ResetPage/ResetPasswordForm.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import AuthPageShell from "../AuthPageShell";

type ResetPasswordFormProps = {
  onSubmit?: (password: string) => void;
  onChange?: () => void;
  submitting?: boolean;
  remoteError?: string;
};

export default function ResetPasswordForm({
  onSubmit,
  onChange,
  submitting,
  remoteError,
}: ResetPasswordFormProps) {
  const { t } = useTranslation(["reset"]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passMin = password.length >= 10;
  const passComplex =
    /[0-9]/.test(password) && /[A-Z]/.test(password) && /[a-z]/.test(password);
  const confirmOk = confirm === password && password.length > 0;
  const confirmInvalid = confirm.length > 0 && !confirmOk;
  const formValid = passMin && passComplex && confirmOk;

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid || submitting) return;
    onSubmit?.(password);
  };

  return (
    <AuthPageShell title={t("reset.title")} subtitle={t("reset.subtitle")}>
      <form className="flex w-full flex-col gap-5" onSubmit={handle} noValidate>
        <div className="flex w-full flex-col gap-1.5">
          <label
            htmlFor="reset-password"
            className="text-sm font-semibold text-slate-700"
          >
            {t("fields.password.label")}
          </label>
          <div className="relative">
            <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
              lock
            </span>
            <input
              id="reset-password"
              className="h-11 w-full rounded-[8px] border border-slate-300 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15 sm:h-12 sm:text-base"
              type={showPassword ? "text" : "password"}
              placeholder={t("fields.password.placeholder")}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                onChange?.();
              }}
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

        <div className="flex w-full flex-col gap-1.5">
          <label
            htmlFor="reset-confirm"
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
              id="reset-confirm"
              className={`h-11 w-full rounded-[8px] border bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3AB8EE] focus:ring-4 focus:ring-[#3AB8EE]/15 sm:h-12 sm:text-base ${
                confirmInvalid ? "border-[#D90452]" : "border-slate-300"
              }`}
              type={showConfirm ? "text" : "password"}
              placeholder={t("fields.confirm.placeholder")}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                onChange?.();
              }}
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
          <div className="min-h-4" aria-live="polite">
            {confirmInvalid && (
              <span
                id="confirm-error"
                className="select-none text-[12px] font-medium leading-none text-[#D90452]"
              >
                {t("fields.confirm.mismatch")}
              </span>
            )}
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

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#0877A8] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(8,119,168,0.24)] transition hover:bg-[#0063BF] focus:outline-none focus:ring-4 focus:ring-[#3AB8EE]/25 disabled:pointer-events-none disabled:opacity-50 sm:h-12 sm:text-base"
            disabled={!formValid || submitting}
          >
            {submitting && (
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />
            )}
            {submitting ? t("reset.actions.loading") : t("reset.actions.submit")}
          </button>
          <div className="min-h-4 text-center" aria-live="polite">
            {remoteError && (
              <span className="select-none text-[12px] font-medium leading-none text-[#D90452]">
                {remoteError}
              </span>
            )}
          </div>
        </div>
      </form>
    </AuthPageShell>
  );
}
