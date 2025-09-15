import React from "react";
import Dropdown from "../Dropdown";
import type { AdminRow } from "./user.constant";

type Props = {
  onCancel: () => void;
  onCreate: (
    next: AdminRow & { password: string; avatarFile?: File | null }
  ) => void;
};

const ROLE_OPTIONS = [
  { label: "Admin", value: "Admin" },
  { label: "Staff", value: "Staff" },
] as const;

/** validators (ยก logic จาก RegisterPage.tsx) */
const isEmailValid = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const hasComplex = (pwd: string) =>
  /[0-9]/.test(pwd) && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd);
const minLen = (pwd: string) => pwd.length >= 10;

export default function Content_Create({ onCancel, onCreate }: Props) {
  // avatar
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // fields
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [emailTouched, setEmailTouched] = React.useState(false);
  const [role, setRole] = React.useState<"Admin" | "Staff" | "">("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // validations (เหมือน RegisterPage)
  const emailInvalid = emailTouched && !isEmailValid(email);
  const passMin = minLen(password);
  const passComplex = hasComplex(password);
  const confirmOk = confirmPassword === password && password.length > 0;

  const formValid =
    !!first.trim() &&
    !!last.trim() &&
    !!role &&
    isEmailValid(email) &&
    passMin &&
    passComplex &&
    confirmOk;

  React.useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const submit = () => {
    if (!formValid) return;
    const next: AdminRow = {
      id: String(Date.now()),
      fullName: `${first.trim()} ${last.trim()}`.trim(),
      email: email.trim(),
      role: role as "Admin" | "Staff",
      addedAt: new Date().toISOString(),
      lastAccessAt: new Date().toISOString(),
      active: true,
      avatar: avatarPreview || "",
    };
    onCreate({ ...next, password, avatarFile });
  };

  return (
    <div className="mt-6 p-6 bg-white rounded-lg">
      <h2 className="text-[24px] font-bold">Create admin</h2>
      <hr className="mt-3" />

      <div className="mt-6 space-y-5 max-w-3xl">
        <div className="grid grid-cols-12 items-center gap-4">
          <div className="col-span-12 md:col-span-3" />
          <div className="col-span-12 md:col-span-9 flex items-center gap-4">
            <div className="w-[82px] h-[82px] rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <i
                  className="material-icons-outlined text-gray-400 select-none"
                  aria-hidden
                >
                  person
                </i>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {/* ซ่อนไว้แต่ยังเข้าถึงได้ด้วย label */}
              <input
                id="avatarUpload"
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only" // ใช้ sr-only แทน hidden
                aria-label="Upload profile photo" // ให้ชื่อที่ชัดเจน
                title="Upload profile photo"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setAvatarFile(f);
                }}
              />

              <span className="text-gray-600">Select file to upload</span>

              <div className="flex items-center gap-2">
                {/* ใช้ label เป็นปุ่ม โดยผูกกับ input ผ่าน htmlFor */}
                <label
                  htmlFor="avatarUpload"
                  className="px-3 py-1.5 rounded-md bg-cyan text-white text-sm cursor-pointer"
                >
                  Upload photo
                </label>

                {avatarFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* First name */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            First name <span className="text-red-500">*</span>
          </label>
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="Please enter first name"
            className="col-span-12 md:col-span-9 h-10 rounded-md border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-cyan/40"
          />
        </div>

        {/* Last name */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            Last name <span className="text-red-500">*</span>
          </label>
          <input
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder="Please enter last name"
            className="col-span-12 md:col-span-9 h-10 rounded-md border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-cyan/40"
          />
        </div>

        {/* Email */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="col-span-12 md:col-span-9">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="Please enter email"
              className="w-full h-10 rounded-md border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-cyan/40"
              {...(emailInvalid
                ? { "aria-invalid": "true", "aria-describedby": "email-error" }
                : {})}
            />
            <div className="h-[10px] mt-1" aria-live="polite">
              {emailInvalid && (
                <span
                  id="email-error"
                  className="select-none text-[#EC0357] text-[12px]"
                >
                  Invalid email format.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            Role <span className="text-red-500">*</span>
          </label>
          <div className="col-span-12 md:col-span-9">
            <Dropdown
              options={ROLE_OPTIONS as any}
              value={role}
              onChange={(v) => setRole(v as "Admin" | "Staff")}
            >
              {({
                open,
                selected,
                getButtonProps,
                getMenuProps,
                getItemProps,
                options,
              }) => (
                <div className="relative">
                  <button
                    {...getButtonProps({
                      className:
                        "h-[40px] w-full rounded-md border border-gray-300 bg-white px-3 text-[14px] text-gray-800 font-semibold flex items-center justify-between gap-2 hover:cursor-pointer",
                    })}
                  >
                    <span className="truncate">
                      {selected?.label ?? "Please enter role"}
                    </span>
                    <i className="material-icons leading-none">
                      {open ? "arrow_drop_up" : "arrow_drop_down"}
                    </i>
                  </button>

                  {open && (
                    <div
                      {...getMenuProps({
                        className:
                          "absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg",
                      })}
                    >
                      {options.map((opt: any) => (
                        <button
                          key={opt.value}
                          {...getItemProps(opt, {
                            className:
                              "w-full text-left rounded-md px-3 py-2 text-[14px] hover:bg-gray-100 cursor-pointer",
                          })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Dropdown>
          </div>
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

            {/* Password conditions (ตาม RegisterPage.tsx) */}
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
          Create
        </button>
      </div>
    </div>
  );
}
