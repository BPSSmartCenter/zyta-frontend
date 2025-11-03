// src/components/UserManagement/Content.tsx
import React from "react";
// import { useTranslation } from "react-i18next";
import Dropdown from "../Dropdown";
import Switch from "../Switch";
import type { AdminRow } from "./user.constant";

/* ---------- utils ---------- */
const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date, time };
};

const GRID_COLS =
  "grid-cols-[64px_minmax(240px,1.4fr)_minmax(260px,1.6fr)_120px_150px_150px_120px_140px]";

const getPageNumbers = (current: number, total: number) => {
  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);
  return [...pages].sort((a, b) => a - b);
};

/* ---------- props ---------- */
type Props = {
  rows: AdminRow[];
  setRows: React.Dispatch<React.SetStateAction<AdminRow[]>>;
  onEdit: (row: AdminRow) => void;
  onCreateClick?: () => void;
  onReset?: (row: AdminRow) => void;
  onDelete?: (row: AdminRow) => void;
  onToggleActive?: (row: AdminRow, nextActive: boolean) => Promise<void> | void;
};

export default function Content({
  rows,
  setRows,
  onEdit,
  onCreateClick,
  onReset,
  onDelete,
  onToggleActive,
}: Props) {
  // const { t } = useTranslation("dashboard");

  /* ---------- filters ---------- */
  const STATUS_OPTIONS = [
    { label: "All Status", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ];
  const ROLE_OPTIONS = [
    { label: "All Role", value: "all" },
    { label: "Admin", value: "Admin" },
    { label: "Officer", value: "Officer" },
    { label: "User", value: "User" },
  ];

  const [status, setStatus] = React.useState("all");
  const [role, setRole] = React.useState("all");

  const rowsFiltered = React.useMemo(() => {
    return rows
      .filter((r) =>
        role === "all" ? true : r.role.toLowerCase() === role.toLowerCase()
      )
      .filter((r) =>
        status === "all" ? true : status === "active" ? r.active : !r.active
      );
  }, [rows, status, role]);

  /* ---------- pagination ---------- */
  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState(1);
  const pageCount = Math.max(1, Math.ceil(rowsFiltered.length / PAGE_SIZE));

  React.useEffect(() => {
    setPage((p) => (p > pageCount ? pageCount : p < 1 ? 1 : p));
  }, [pageCount]);

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const rowsPage = rowsFiltered.slice(start, end);

  return (
    <>
      <div className="mt-6 p-6 bg-white rounded-lg">
        {/* header */}
        <div className="flex justify-between pb-4 border-b">
          <h1 className="font-bold text-[22px] md:text-[24px]">
            Admin Management
          </h1>
          <button
            onClick={onCreateClick} // ← ผูกปุ่ม
            className="flex items-center gap-2 bg-cyan text-white p-2 px-3 rounded-lg cursor-pointer hover:bg-cyan-400"
          >
            <i className="material-icons-outlined">add_circle</i>
            <span className="hidden md:block">Create admin</span>
          </button>
        </div>

        {/* … (ส่วน filters / table / pagination ทั้งหมดเหมือนเดิม) … */}
        {/* ↓↓↓ ยังคงเหมือนไฟล์เดิมของคุณแบบ 100% ↓↓↓ */}

        {/* filters */}
        <div className="mt-6">
          <div className="flex gap-10 flex-col sm:flex-row">
            {/* Status */}
            <div>
              <label className="font-bold text-sm block mb-2">Status</label>
              <Dropdown
                options={STATUS_OPTIONS}
                value={status}
                onChange={(v) => {
                  setPage(1);
                  setStatus(v);
                }}
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
                          "h-[40px] min-w-[110px] rounded-md border border-gray-300 bg-white px-3 text-[14px] text-gray-800 font-semibold flex items-center justify-between gap-2 cursor-pointer",
                      })}
                    >
                      <span className="truncate">
                        {selected?.label ?? "All Status"}
                      </span>
                      <i className="material-icons leading-none">
                        {open ? "arrow_drop_up" : "arrow_drop_down"}
                      </i>
                    </button>

                    <div
                      {...getMenuProps({
                        className: [
                          "absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg",
                          open ? "block" : "hidden",
                        ].join(" "),
                      })}
                    >
                      {options.map((opt) => (
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
                  </div>
                )}
              </Dropdown>
            </div>

            {/* Role */}
            <div>
              <label className="font-bold text-sm block mb-2">Role</label>
              <Dropdown
                options={ROLE_OPTIONS}
                value={role}
                onChange={(v) => {
                  setPage(1);
                  setRole(v);
                }}
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
                          "h-[40px] min-w-[110px] rounded-md border border-gray-300 bg-white px-3 text-[14px] text-gray-800 font-semibold flex items-center justify-between gap-2 cursor-pointer",
                      })}
                    >
                      <span className="truncate">
                        {selected?.label ?? "All Role"}
                      </span>
                      <i className="material-icons leading-none">
                        {open ? "arrow_drop_up" : "arrow_drop_down"}
                      </i>
                    </button>

                    <div
                      {...getMenuProps({
                        className: [
                          "absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg",
                          open ? "block" : "hidden",
                        ].join(" "),
                      })}
                    >
                      {options.map((opt) => (
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
                  </div>
                )}
              </Dropdown>
            </div>
          </div>
        </div>

        {/* table */}
        <div className="mt-6 overflow-x-auto rounded-lg bg-white">
          <div className="inline-block w-full min-w-[950px] align-middle">
            {/* header row */}
            <div
              className={`grid ${GRID_COLS} place-items-center px-4 py-3 text-[12px] font-medium text-gray-500 text-center bg-gray-100 select-none`}
            >
              <div>NO</div>
              <div>FULL NAME</div>
              <div>EMAIL</div>
              <div>ROLE</div>
              <div>ADDED DATE</div>
              <div>LAST ACCESS</div>
              <div>STATUS</div>
              <div>ACTION</div>
            </div>
            <hr className="border-gray-200" />

            {/* rows */}
            {rowsPage.map((r, idx) => {
              const i = start + idx;
              const { date: addedDate, time: addedTime } = formatDateTime(
                r.addedAt
              );
              const { date: lastDate, time: lastTime } = formatDateTime(
                r.lastAccessAt
              );

              return (
                <div
                  key={r.id}
                  className={`grid ${GRID_COLS} place-items-center px-4 py-3 text-[14px] text-center border-t border-gray-100`}
                >
                  <div className="text-gray-500">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex items-center justify-center w-full">
                    <span className="font-bold text-gray-800 truncate">
                      {r.fullName}
                    </span>
                  </div>
                  <div className="text-gray-800 truncate w-full">{r.email}</div>
                  <div className="font-bold text-gray-800 select-none">
                    {r.role}
                  </div>
                  <div className="text-gray-800">
                    <div>{addedDate}</div>
                    <div className="text-[12px] text-gray-500">{addedTime}</div>
                  </div>
                  <div className="text-gray-800">
                    <div>{lastDate}</div>
                    <div className="text-[12px] text-gray-500">{lastTime}</div>
                  </div>
                  <div>
                    <Switch
                      checked={r.active}
                      onChange={async (e) => {
                        const checked = (e.target as HTMLInputElement).checked;
                        try {
                          await onToggleActive?.(r, checked);
                        } catch {}
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, active: checked } : x
                          )
                        );
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-gray-700">
                    <button
                      title="Edit"
                      className="hover:text-cyan"
                      onClick={() => onEdit(r)}
                    >
                      <i className="material-icons-outlined cursor-pointer">
                        edit
                      </i>
                    </button>
                    <button
                      title="Reset Password"
                      className="hover:text-cyan cursor-pointer"
                      onClick={() => onReset?.(r)}
                    >
                      <i className="material-icons-outlined">lock</i>
                    </button>
                    <button
                      title="Delete"
                      className="hover:text-red-400 cursor-pointer"
                      onClick={() => onDelete?.(r)}
                    >
                      <i className="material-icons-outlined">delete</i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* spacer กัน pagination ทับ */}
        <div className="h-[64px]" />
      </div>

      {/* pagination sticky bottom */}
      <div className="fixed bottom-0 right-0 z-40 border-t border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50"
            >
              Prev
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers(page, pageCount).map((n, i, arr) => {
                const prev = arr[i - 1];
                const needDots = prev && n - prev > 1;
                return (
                  <React.Fragment key={n}>
                    {needDots && (
                      <span className="px-1 text-gray-400 select-none">…</span>
                    )}
                    <button
                      onClick={() => setPage(n)}
                      className={[
                        "h-9 min-w-9 px-3 rounded-md border",
                        n === page
                          ? "border-cyan text-cyan font-semibold bg-cyan/5"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
