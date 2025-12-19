import React from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../Dropdown";
import type { AdminRow } from "./user.constant";
import { listSites } from "../../api/sites";

type Props = {
  onCancel: () => void;
  onCreate: (
    next: AdminRow & {
      password: string;
      avatarFile?: File | null;
      siteIds?: string[];
    }
  ) => void;
};

/** validators (ยก logic จาก RegisterPage.tsx) */
const isEmailValid = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const hasComplex = (pwd: string) =>
  /[0-9]/.test(pwd) && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd);
const minLen = (pwd: string) => pwd.length >= 10;

export default function Content_Create({ onCancel, onCreate }: Props) {
  const { t } = useTranslation("userManagement");
  const texts = React.useMemo(
    () => ({
      title: t("create.title", { defaultValue: "Create admin" }),
      buttons: {
        cancel: t("create.buttons.cancel", { defaultValue: "Cancel" }),
        submit: t("create.buttons.submit", { defaultValue: "Create" }),
      },
      labels: {
        firstName: t("form.labels.firstName", { defaultValue: "First name" }),
        lastName: t("form.labels.lastName", { defaultValue: "Last name" }),
        email: t("form.labels.email", { defaultValue: "Email" }),
        role: t("form.labels.role", { defaultValue: "Role" }),
        sites: t("form.labels.sites", { defaultValue: "Sites access" }),
        password: t("form.labels.password", { defaultValue: "Password" }),
        confirmPassword: t("form.labels.confirmPassword", {
          defaultValue: "Confirm password",
        }),
      },
      placeholders: {
        firstName: t("form.placeholders.firstName", {
          defaultValue: "Please enter first name",
        }),
        lastName: t("form.placeholders.lastName", {
          defaultValue: "Please enter last name",
        }),
        email: t("form.placeholders.email", {
          defaultValue: "Please enter email",
        }),
        role: t("form.placeholders.role", {
          defaultValue: "Please select role",
        }),
        password: t("form.placeholders.password", {
          defaultValue: "Please enter new password",
        }),
        confirmPassword: t("form.placeholders.confirmPassword", {
          defaultValue: "Please confirm password",
        }),
      },
      helper: t("form.sitesHelper", {
        defaultValue: "Choose one or more sites this user can access.",
      }),
      selectSites: t("form.selectSites", { defaultValue: "Select sites" }),
      emailError: t("form.emailError", { defaultValue: "Invalid email format." }),
      confirmError: t("form.confirmError", {
        defaultValue: "Passwords do not match.",
      }),
      remove: t("form.remove", { defaultValue: "Remove" }),
      passwordHints: {
        min: t("form.passwordHints.min", {
          defaultValue: "At least 10 characters long",
        }),
        complex: t("form.passwordHints.complex", {
          defaultValue: "Contains number, uppercase and lowercase letters",
        }),
      },
    }),
    [t]
  );
  const formatSitesSelected = React.useCallback(
    (count: number) =>
      t("form.sitesSelected", {
        count,
        defaultValue:
          count === 1 ? `${count} site selected` : `${count} sites selected`,
      }),
    [t]
  );
  const roleOptions = React.useMemo(
    () => [
      { label: t("roles.admin", { defaultValue: "Admin" }), value: "Admin" },
      { label: t("roles.officer", { defaultValue: "Officer" }), value: "Officer" },
      { label: t("roles.user", { defaultValue: "User" }), value: "User" },
    ],
    [t]
  );
  // avatar
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // fields
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [emailTouched, setEmailTouched] = React.useState(false);
  const [role, setRole] = React.useState<"Admin" | "Officer" | "User" | "">("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [siteOptions, setSiteOptions] = React.useState<
    Array<{ label: string; value: string }>
  >([]);
  const [selectedSiteIds, setSelectedSiteIds] = React.useState<string[]>([]);

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

  // fetch available sites for admin to assign
  React.useEffect(() => {
    (async () => {
      try {
        const data = await listSites();
        const arr = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.items)
          ? (data as any).items
          : [];
        setSiteOptions(
          arr.map((s: any) => ({
            label: s.name || s.code || s.id,
            value: s.id,
          }))
        );
      } catch (e) {
        setSiteOptions([]);
      }
    })();
  }, []);

  const submit = () => {
    if (!formValid) return;
    const next: AdminRow = {
      id: String(Date.now()),
      fullName: `${first.trim()} ${last.trim()}`.trim(),
      email: email.trim(),
      role: role as "Admin" | "Officer" | "User",
      addedAt: new Date().toISOString(),
      lastAccessAt: new Date().toISOString(),
      active: true,
      avatar: avatarPreview || "",
    };
    onCreate({
      ...next,
      password,
      avatarFile,
      siteIds: role === "Admin" ? undefined : selectedSiteIds,
    });
  };

  return (
    <div className="mt-6 p-6 bg-white rounded-lg">
      <h2 className="text-[24px] font-bold">{texts.title}</h2>
      <hr className="mt-3" />

      <div className="mt-6 space-y-5 max-w-3xl">
        <div className="grid grid-cols-12 items-center gap-4">
          <div className="col-span-12 md:col-span-3" />
          <div className="col-span-12 md:col-span-9 flex items-center gap-4">
            {/* <div className="w-[82px] h-[82px] rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
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
            </div> */}

            <div className="flex flex-col gap-2">
              {/* ซ่อนไว้แต่ยังเข้าถึงได้ด้วย label
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
              /> */}

              {/* <span className="text-gray-600">Select file to upload</span> */}

              <div className="flex items-center gap-2">
                {/* ใช้ label เป็นปุ่ม โดยผูกกับ input ผ่าน htmlFor */}
                {/* <label
                  htmlFor="avatarUpload"
                  className="px-3 py-1.5 rounded-md bg-cyan text-white text-sm cursor-pointer"
                >
                  Upload photo
                </label> */}

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
                    {texts.remove}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* First name */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            {texts.labels.firstName} <span className="text-red-500">*</span>
          </label>
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder={texts.placeholders.firstName}
            className="col-span-12 md:col-span-9 h-10 rounded-md border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-cyan/40"
          />
        </div>

        {/* Last name */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            {texts.labels.lastName} <span className="text-red-500">*</span>
          </label>
          <input
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder={texts.placeholders.lastName}
            className="col-span-12 md:col-span-9 h-10 rounded-md border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-cyan/40"
          />
        </div>

        {/* Email */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            {texts.labels.email} <span className="text-red-500">*</span>
          </label>
          <div className="col-span-12 md:col-span-9">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder={texts.placeholders.email}
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
                  {texts.emailError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="grid grid-cols-12 items-center gap-4">
          <label className="col-span-12 md:col-span-3 font-medium">
            {texts.labels.role} <span className="text-red-500">*</span>
          </label>
          <div className="col-span-12 md:col-span-9">
            <Dropdown
              options={roleOptions as any}
              value={role}
              onChange={(v) => setRole(v as "Admin" | "Officer" | "User")}
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
                      {selected?.label ?? texts.placeholders.role}
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

        {/* Sites (hidden for Admin) */}
        {role !== "" && role !== "Admin" && (
          <div className="grid grid-cols-12 items-start gap-4">
            <label className="col-span-12 md:col-span-3 font-medium pt-2">
              {texts.labels.sites}
            </label>
            <div className="col-span-12 md:col-span-9">
              <Dropdown
                options={siteOptions as any}
                value="__multi__"
                onChange={() => {}}
              >
                {({ open, getButtonProps, getMenuProps }) => (
                  <div className="relative">
                    <button
                      {...getButtonProps({
                        className:
                          "h-[40px] w-full rounded-md border border-gray-300 bg-white px-3 text-[14px] text-gray-800 font-semibold flex items-center justify-between gap-2 hover:cursor-pointer",
                      })}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <span className="truncate">
                        {selectedSiteIds.length > 0
                          ? formatSitesSelected(selectedSiteIds.length)
                          : texts.selectSites}
                      </span>
                      <i className="material-icons leading-none">
                        {open ? "arrow_drop_up" : "arrow_drop_down"}
                      </i>
                    </button>

                    {open && (
                      <div
                        {...getMenuProps({
                          className:
                            "absolute z-50 mt-1 min-w-[220px] whitespace-nowrap rounded-lg border border-gray-200 bg-white p-2 shadow-lg max-h-96 overflow-y-auto",
                        })}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <div className="mt-1">
                          {siteOptions.map((opt: any) => {
                            const checked = selectedSiteIds.includes(opt.value);
                            return (
                              <label
                                key={opt.value}
                                className={[
                                  "flex items-center gap-2 rounded-md px-3 py-2 text-[14px] hover:bg-gray-50 hover:cursor-pointer",
                                  checked ? "bg-gray-50" : "",
                                ].join(" ")}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 !ring-0 !ring-offset-0 hover:cursor-pointer"
                                  checked={checked}
                                  onChange={() =>
                                    setSelectedSiteIds((prev) =>
                                      prev.includes(opt.value)
                                        ? prev.filter((v) => v !== opt.value)
                                        : [...prev, opt.value]
                                    )
                                  }
                                  onMouseDown={(e) => e.preventDefault()}
                                />
                                <span>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Dropdown>
              {/* selected chips */}
              {selectedSiteIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSiteIds.map((id) => {
                    const label =
                      siteOptions.find((s) => s.value === id)?.label || id;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-800 text-[12px] px-2 py-1 border border-gray-200"
                      >
                        {label}
                        <button
                          type="button"
                          aria-label={texts.remove}
                          className="ml-1 text-gray-500 hover:text-gray-800"
                          onClick={() =>
                            setSelectedSiteIds((prev) =>
                              prev.filter((v) => v !== id)
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="text-[12px] text-gray-500 mt-1">
                {texts.helper}
              </div>
            </div>
          </div>
        )}

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
