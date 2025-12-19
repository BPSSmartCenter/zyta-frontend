import React from "react";
import { useTranslation } from "react-i18next";
import type { AdminRow } from "./user.constant";

type Props = {
  user: AdminRow;
  onCancel: () => void;
  onReset: (payload: { user: AdminRow; newPassword: string }) => void;
};

// validators (อิงแนวเดียวกับ Register/Create)
const hasComplex = (pwd: string) =>
  /[0-9]/.test(pwd) && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd);
const minLen = (pwd: string) => pwd.length >= 10;

export default function Content_Reset({ user, onCancel, onReset }: Props) {
  const { t } = useTranslation("userManagement");
  const texts = React.useMemo(
    () => ({
      title: t("reset.title", { defaultValue: "Reset password" }),
      buttons: {
        cancel: t("reset.buttons.cancel", { defaultValue: "Cancel" }),
        submit: t("reset.buttons.submit", { defaultValue: "Reset" }),
      },
      labels: {
        fullName: t("form.labels.fullName", { defaultValue: "Full name" }),
        password: t("form.labels.password", { defaultValue: "Password" }),
        confirmPassword: t("form.labels.confirmPassword", {
          defaultValue: "Confirm password",
        }),
      },
      placeholders: {
        password: t("form.placeholders.password", {
          defaultValue: "Please enter new password",
        }),
        confirmPassword: t("form.placeholders.confirmPassword", {
          defaultValue: "Please confirm password",
        }),
      },
      passwordHints: {
        min: t("form.passwordHints.min", {
          defaultValue: "At least 10 characters long",
        }),
        complex: t("form.passwordHints.complex", {
          defaultValue: "Contains number, uppercase and lowercase letters",
        }),
      },
      confirmError: t("form.confirmError", {
        defaultValue: "Passwords do not match.",
      }),
      resetNote: t("form.resetNote", {
        defaultValue:
          "After confirmation the password will be changed and the user must log in again.",
      }),
    }),
    [t]
  );
  // แยกชื่อเพื่อแสดง/ล็อกไว้ (ไม่แก้ไขชื่อในหน้า Reset)
  const [first] = React.useState(() => user.fullName.split(" ")[0] ?? "");
  const [last] = React.useState(() =>
    user.fullName.split(" ").slice(1).join(" ")
  );

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const passMin = minLen(password);
  const passComplex = hasComplex(password);
  const confirmOk = confirmPassword === password && password.length > 0;
  const formValid = passMin && passComplex && confirmOk;

  const submit = () => {
    if (!formValid) return;
    onReset({ user, newPassword: password });
  };

  return (
    <div className="mt-6 p-6 bg-white rounded-lg">
      <h2 className="text-[24px] font-bold">{texts.title}</h2>
      <hr className="mt-3" />

      <div className="mt-6 space-y-5 max-w-3xl">
        {/* First name (read-only) */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label
            htmlFor="reset-name"
            className="col-span-12 md:col-span-3 font-medium"
          >
            {texts.labels.fullName} <span className="text-red-500">*</span>
          </label>
          <input
            id="reset-name"
            value={`${first} ${last}`.trim()}
            disabled
            aria-readonly="true"
            title={texts.labels.fullName}
            className="col-span-12 md:col-span-9 h-10 rounded-md border border-gray-200 bg-gray-100 text-gray-600 px-3"
          />
        </div>

        {/* Password */}
        <div className="grid grid-cols-12 items-start gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            {texts.labels.password} <span className="text-red-500">*</span>
          </label>
          <div className="col-span-12 md:col-span-9 w-full">
            <div className="relative">
              <input
                type={"password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={texts.placeholders.password}
                className="w-full h-10 rounded-md border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-cyan/40"
              />
            </div>

            {/* Password conditions */}
            <div className="mt-2 space-y-1 text-sm text-gray-700 select-none">
              <div className="flex items-center gap-2">
                <i
                  className={[
                    "material-icons-outlined text-[18px]",
                    passMin ? "text-cyan-500" : "text-gray-400",
                  ].join(" ")}
                >
                  check_circle
                </i>
                <span>{texts.passwordHints.min}</span>
              </div>
              <div className="flex items-center gap-2">
                <i
                  className={[
                    "material-icons-outlined text-[18px]",
                    passComplex ? "text-cyan-500" : "text-gray-400",
                  ].join(" ")}
                >
                  check_circle
                </i>
                <span>{texts.passwordHints.complex}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm password */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            {texts.labels.confirmPassword} <span className="text-red-500">*</span>
          </label>
          <div className="col-span-12 md:col-span-9 w-full">
            <div className="relative">
              <input
                type={"password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={texts.placeholders.confirmPassword}
                className="w-full h-10 rounded-md border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-cyan/40"
                {...(!confirmOk && confirmPassword.length > 0
                  ? {
                      "aria-invalid": "true",
                      "aria-describedby": "confirm-error",
                    }
                  : {})}
              />
            </div>
            <div className="h-[10px] mt-1" aria-live="polite">
              {!confirmOk && confirmPassword.length > 0 && (
                <span
                  id="confirm-error"
                  className="select-none text-[#EC0357] text-[12px]"
                >
                  {texts.confirmError}
                </span>
              )}
            </div>

            <p className="mt-3 text-[12px] text-gray-500">
              {texts.resetNote}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="h-9 px-4 rounded-md border border-gray-300 bg-gray-100 text-gray-700 cursor-pointer"
        >
          {texts.buttons.cancel}
        </button>
        <button
          onClick={submit}
          disabled={!formValid}
          className="h-9 px-4 rounded-md bg-cyan text-white cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          {texts.buttons.submit}
        </button>
      </div>
    </div>
  );
}
