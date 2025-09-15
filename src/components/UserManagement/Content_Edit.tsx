import React from "react";
import Dropdown from "../Dropdown";
import Modal from "../Modal";
import { useToast } from "../../hook/toastProvider"; // ใช้ตาม path เดิมของโปรเจกต์คุณ
import type { AdminRow } from "./user.constant";

type Props = {
  user: AdminRow;
  onCancel: () => void;
  onSave: (next: AdminRow) => void;
  /** ส่งรายชื่อผู้ใช้ทั้งหมดเข้ามาเพื่อเช็คซ้ำ (ยกเว้นตัวที่กำลังแก้) */
  allUsers?: AdminRow[];
};

const ROLE_OPTIONS = [
  { label: "Admin", value: "Admin" },
  { label: "Staff", value: "Staff" },
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
  const [role, setRole] = React.useState<"Admin" | "Staff">(user.role);

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
  }, [user]);

  const submit = () => {
    if (!first.trim() || !last.trim() || !email.trim()) {
      show({
        message: "Please fill in all required fields.",
        variant: "error",
      });
      return;
    }

    const next: AdminRow = {
      ...user,
      fullName: `${first.trim()} ${last.trim()}`.trim(),
      email: email.trim(),
      role,
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

    onSave(next);
    show({
      message: <span className="text-white font-semibold">Edit saved</span>,
      variant: "success",
    });
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
