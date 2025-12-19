import React from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../Dropdown";
import Modal from "../Modal";
import { useToast } from "../../hook/toastProvider"; // ใช้ตาม path เดิมของโปรเจกต์คุณ
import type { AdminRow } from "./user.constant";
import { listSites } from "../../api/sites";
import { getUser } from "../../api/adminUsers";

type Props = {
  user: AdminRow;
  onCancel: () => void;
  onSave: (next: AdminRow & { siteIds?: string[] }) => void;
  /** ส่งรายชื่อผู้ใช้ทั้งหมดเข้ามาเพื่อเช็คซ้ำ (ยกเว้นตัวที่กำลังแก้) */
  allUsers?: AdminRow[];
};

const normalizeEmail = (s: string) => s.trim().toLowerCase();
const normalizeName = (s: string) =>
  s.replace(/\s+/g, " ").trim().toLowerCase();

export default function Content_Edit({
  user,
  onCancel,
  onSave,
  allUsers = [],
}: Props) {
  const { t } = useTranslation("userManagement");
  const { show } = useToast();
  const texts = React.useMemo(
    () => ({
      title: t("edit.title", { defaultValue: "Edit admin information" }),
      buttons: {
        cancel: t("edit.buttons.cancel", { defaultValue: "Cancel" }),
        submit: t("edit.buttons.submit", { defaultValue: "Save" }),
      },
      labels: {
        firstName: t("form.labels.firstName", { defaultValue: "First name" }),
        lastName: t("form.labels.lastName", { defaultValue: "Last name" }),
        email: t("form.labels.email", { defaultValue: "Email" }),
        role: t("form.labels.role", { defaultValue: "Role" }),
        sites: t("form.labels.sites", { defaultValue: "Sites access" }),
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
      },
      helper: t("form.sitesHelper", {
        defaultValue: "Choose one or more sites this user can access.",
      }),
      selectSites: t("form.selectSites", { defaultValue: "Select sites" }),
      remove: t("form.remove", { defaultValue: "Remove" }),
      errors: {
        required: t("edit.errors.required", {
          defaultValue: "Please fill in all required fields.",
        }),
      },
      duplicate: {
        title: t("edit.duplicate.title", { defaultValue: "Edit failed" }),
        intro: t("edit.duplicate.intro", {
          defaultValue: "We found duplicate data:",
        }),
        email: t("edit.duplicate.email", {
          defaultValue: "Email address is already in use.",
        }),
        fullName: t("edit.duplicate.fullName", {
          defaultValue: "Full name already exists.",
        }),
        close: t("edit.duplicate.close", { defaultValue: "OK" }),
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

  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [email, setEmail] = React.useState(user.email);
  const [role, setRole] = React.useState<"Admin" | "Officer" | "User">(
    user.role as any
  );
  const [siteOptions, setSiteOptions] = React.useState<
    Array<{ label: string; value: string }>
  >([]);
  const [selectedSiteIds, setSelectedSiteIds] = React.useState<string[]>([]);

  // modal state
  const [dupModal, setDupModal] = React.useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
  }>({ open: false, title: "", message: "" });

  React.useEffect(() => {
    const [f, ...rest] = user.fullName.split(" ");
    setFirst(f ?? "");
    setLast(rest.join(" "));
    setEmail(user.email);
    setRole(user.role);
    // fetch user sites for pre-select
    (async () => {
      try {
        const u = await getUser(user.id);
        const ids = Array.isArray(u?.sites)
          ? (u.sites as any[]).map((s) => s.id).filter(Boolean)
          : [];
        setSelectedSiteIds(ids);
      } catch {
        setSelectedSiteIds([]);
      }
    })();
  }, [user]);

  // fetch available sites (admin will get all)
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
    if (!first.trim() || !last.trim() || !email.trim()) {
      show({
        message: texts.errors.required,
        variant: "error",
      });
      return;
    }

    const next: AdminRow & { siteIds?: string[] } = {
      ...user,
      fullName: `${first.trim()} ${last.trim()}`.trim(),
      email: email.trim(),
      role,
      siteIds: role === "Admin" ? undefined : selectedSiteIds,
    };

    // ===== Duplicate validation (ตามมาตรฐานทั่วไป) =====
    const conflicts: string[] = [];
    const nEmail = normalizeEmail(next.email);
    const nName = normalizeName(next.fullName);

    allUsers.forEach((u) => {
      if (u.id === user.id) return; // ข้ามตัวที่กำลังแก้
      if (normalizeEmail(u.email) === nEmail) conflicts.push(texts.duplicate.email);
      if (normalizeName(u.fullName) === nName)
        conflicts.push(texts.duplicate.fullName);
    });

    if (conflicts.length) {
      setDupModal({
        open: true,
        title: texts.duplicate.title,
        message: (
          <div className="text-sm">
            <p>{texts.duplicate.intro}</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {conflicts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        ),
      });
      return;
    }
    // ================================================

    // Delegate to parent; parent will show success toast after API completes
    onSave(next);
  };

  return (
    <div className="mt-6 p-6 bg-white rounded-lg">
      <h2 className="text-[24px] font-bold">{texts.title}</h2>
      <hr className="mt-3" />

      <div className="mt-6 space-y-5 max-w-3xl">
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
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={texts.placeholders.email}
            className="col-span-12 md:col-span-9 h-10 rounded-md border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-cyan/40"
          />
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
        {role !== "Admin" && (
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
              {/* helper text */}
              <div className="text-[12px] text-gray-500 mt-1">
                {texts.helper}
              </div>
            </div>
          </div>
        )}
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
          className="h-9 px-4 rounded-md bg-cyan text-white cursor-pointer"
        >
          {texts.buttons.submit}
        </button>
      </div>

      {/* Duplicate modal */}
      <Modal
        open={dupModal.open}
        icon="cancel"
        title={dupModal.title}
        message={dupModal.message}
        onClose={() => setDupModal((s) => ({ ...s, open: false }))}
        closeLabel={texts.duplicate.close}
      />
    </div>
  );
}
