// src/pages/UserManagement.tsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/UserManagement/Navbar";
import Content from "../components/UserManagement/Content";
import Content_Edit from "../components/UserManagement/Content_Edit";
import Content_Create from "../components/UserManagement/Content_Create";
import Content_Reset from "../components/UserManagement/Content_Reset";
import { ToastProvider, useToast } from "../hook/toastProvider";
import {
  listUsers,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  resetUserPassword as apiResetPassword,
  type AdminUserDto,
} from "../api/adminUsers";
import {
  ADMIN_ROWS,
  type AdminRow,
} from "../components/UserManagement/user.constant";

export default function UserManagement() {
  return (
    <Sidebar>
      <ToastProvider>
        <UserManagementGuarded />
      </ToastProvider>
    </Sidebar>
  );
}

function UserManagementGuarded() {
  const [allowed, setAllowed] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const me = await (await import("../api/user")).me();
        setAllowed(String(me.role).toLowerCase() === "admin");
      } catch {
        setAllowed(false);
      }
    })();
  }, []);

  if (allowed === null) {
    return <div className="p-6">Loading…</div>;
  }
  if (!allowed) {
    // redirect away silently
    if (typeof window !== "undefined") {
      window.location.replace("/dashboard");
    }
    return null;
  }
  return <UserManagementInner />;
}

function UserManagementInner() {
  const { show } = useToast();

  const [rows, setRows] = React.useState<AdminRow[]>(ADMIN_ROWS);
  const [editing, setEditing] = React.useState<AdminRow | null>(null);
  const [creating, setCreating] = React.useState<boolean>(false);
  const [resetting, setResetting] = React.useState<AdminRow | null>(null); // ← เพิ่ม

  const mapDto = (u: AdminUserDto): AdminRow => ({
    id: u.id,
    fullName: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
    email: u.email,
    role: (u.role === "admin" ? "Admin" : u.role === "officer" ? "Officer" : "User") as any,
    addedAt: u.createdAt,
    lastAccessAt: u.updatedAt,
    active: !!u.active,
    avatar: "",
  });

  const refresh = React.useCallback(async () => {
    try {
      const items = await listUsers();
      setRows(items.map(mapDto));
    } catch (e) {
      console.error("listUsers failed", e);
      setRows([]);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="p-4 bg-[#F8FBFE]">
      <Navbar title="User management" />

      {/* ลำดับ: Create > Reset > Edit > List */}
      {creating ? (
        <Content_Create
          onCancel={() => setCreating(false)}
          onCreate={async ({ password, avatarFile, siteIds, ...created }) => {
            try {
              const [firstName, ...rest] = (created.fullName || "").split(" ");
              const lastName = rest.join(" ");
              await apiCreateUser({
                firstName: firstName || "",
                lastName,
                email: created.email,
                password,
                role: created.role === "Admin" ? "admin" : created.role === "Officer" ? "officer" : "user",
                ...(Array.isArray(siteIds) ? { siteIds } : {}),
              });
              await refresh();
              setCreating(false);
              show({ variant: "success", message: (<span className="text-white font-semibold">Create Success</span>) });
            } catch (e) {
              console.error(e);
              show({ variant: "error", message: (<span className="text-white font-semibold">Create failed</span>) });
            }
          }}
        />
      ) : resetting ? (
        <Content_Reset
          user={resetting}
          onCancel={() => setResetting(null)}
          onReset={async ({ user, newPassword }) => {
            try {
              await apiResetPassword(user.id, newPassword);
              setResetting(null);
              show({ variant: "success", message: (<span className="text-white font-semibold">Password Reset</span>) });
            } catch (e) {
              console.error(e);
              show({ variant: "error", message: (<span className="text-white font-semibold">Reset failed</span>) });
            }
          }}
        />
      ) : editing ? (
        <Content_Edit
          user={editing}
          allUsers={rows}
          onCancel={() => setEditing(null)}
          onSave={async (next) => {
            try {
              const [firstName, ...rest] = (next.fullName || "").split(" ");
              const lastName = rest.join(" ");
              await apiUpdateUser(next.id, {
                firstName,
                lastName,
                email: next.email,
                role: next.role === "Admin" ? "admin" : next.role === "Officer" ? "officer" : "user",
                // include siteIds for non-admins
                ...(Array.isArray((next as any).siteIds)
                  ? { siteIds: (next as any).siteIds as string[] }
                  : {}),
              });
              await refresh();
              setEditing(null);
              show({ variant: "success", message: (<span className="text-white font-semibold">Edit saved</span>) });
            } catch (e) {
              console.error(e);
              show({ variant: "error", message: (<span className="text-white font-semibold">Edit failed</span>) });
            }
          }}
        />
      ) : (
        <Content
          rows={rows}
          setRows={setRows}
          onEdit={setEditing}
          onCreateClick={() => setCreating(true)}
          onReset={(row) => setResetting(row)} // ← hook เข้าปุ่มกุญแจ
          onDelete={async (row) => {
            try {
              await apiDeleteUser(row.id);
              await refresh();
              show({ variant: "success", message: (<span className="text-white font-semibold">Deleted</span>) });
            } catch (e) {
              console.error(e);
              show({ variant: "error", message: (<span className="text-white font-semibold">Delete failed</span>) });
            }
          }}
          onToggleActive={async (row, nextActive) => {
            try {
              await apiUpdateUser(row.id, { active: nextActive });
            } catch (e) {
              console.error(e);
            }
          }}
        />
      )}
    </div>
  );
}
