import React from "react";
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
      <h2 className="text-[24px] font-bold">Reset Password</h2>
      <hr className="mt-3" />

      <div className="mt-6 space-y-5 max-w-3xl">
        {/* First name (read-only) */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label
            htmlFor="reset-name"
            className="col-span-12 md:col-span-3 font-medium"
          >
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            id="reset-name"
            value={`${first} ${last}`.trim()}
            disabled
            aria-readonly="true"
            title="User full name"
            className="col-span-12 md:col-span-9 h-10 rounded-md border border-gray-200 bg-gray-100 text-gray-600 px-3"
          />
        </div>

        {/* Password */}
        <div className="grid grid-cols-12 items-start gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="col-span-12 md:col-span-9 w-full">
            <div className="relative">
              <input
                type={"password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Please enter new password"
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
                <span>At least 10 characters long</span>
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
                <span>Contains number, uppercase and lowercase letters</span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm password */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            Confirm password <span className="text-red-500">*</span>
          </label>
          <div className="col-span-12 md:col-span-9 w-full">
            <div className="relative">
              <input
                type={"password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Please enter confirm password"
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
                  Passwords do not match.
                </span>
              )}
            </div>

            <p className="mt-3 text-[12px] text-gray-500">
              After confirm the password for this user will be changed, The
              change cannot be reverse and the user will have to login again
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
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!formValid}
          className="h-9 px-4 rounded-md bg-cyan text-white cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
