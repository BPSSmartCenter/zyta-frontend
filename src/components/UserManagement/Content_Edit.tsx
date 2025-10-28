import React from "react";
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

const ROLE_OPTIONS = [
  { label: "Admin", value: "Admin" },
  { label: "Officer", value: "Officer" },
  { label: "User", value: "User" },
] as const;

const normalizeEmail = (s: string) => s.trim().toLowerCase();
const normalizeName = (s: string) =>
  s.replace(/\s+/g, " ").trim().toLowerCase();

export default function Content_Edit({
  user,
  onCancel,
  onSave,
  allUsers = [],
}: Props) {
  const { show } = useToast();

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
        message: "Please fill in all required fields.",
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
      if (normalizeEmail(u.email) === nEmail)
        conflicts.push("Email address is already in use.");
      if (normalizeName(u.fullName) === nName)
        conflicts.push("Full name already exists.");
    });

    if (conflicts.length) {
      setDupModal({
        open: true,
        title: "Edit failed",
        message: (
          <div className="text-sm">
            <p>We found duplicate data:</p>
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
      <h2 className="text-[24px] font-bold">Edit Admin Information</h2>
      <hr className="mt-3" />

      <div className="mt-6 space-y-5 max-w-3xl">
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
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Please enter email"
            className="col-span-12 md:col-span-9 h-10 rounded-md border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-cyan/40"
          />
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

        {/* Sites (hidden for Admin) */}
        {role !== "Admin" && (
          <div className="grid grid-cols-12 items-start gap-4">
            <label className="col-span-12 md:col-span-3 font-medium pt-2">
              Sites access
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
                          ? `${selectedSiteIds.length} site(s) selected`
                          : "Select sites"}
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
                          aria-label="Remove"
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
                Choose one or more sites this user can access.
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
          Cancel
        </button>
        <button
          onClick={submit}
          className="h-9 px-4 rounded-md bg-cyan text-white cursor-pointer"
        >
          Save
        </button>
      </div>

      {/* Duplicate modal */}
      <Modal
        open={dupModal.open}
        icon="cancel"
        title={dupModal.title}
        message={dupModal.message}
        onClose={() => setDupModal((s) => ({ ...s, open: false }))}
        closeLabel="OK"
      />
    </div>
  );
}
