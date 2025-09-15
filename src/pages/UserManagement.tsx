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
  ADMIN_ROWS,
  type AdminRow,
} from "../components/UserManagement/user.constant";

export default function UserManagement() {
  return (
    <Sidebar>
      <ToastProvider>
        <UserManagementInner />
      </ToastProvider>
    </Sidebar>
  );
}

function UserManagementInner() {
  const { show } = useToast();

  const [rows, setRows] = React.useState<AdminRow[]>(ADMIN_ROWS);
  const [editing, setEditing] = React.useState<AdminRow | null>(null);
  const [creating, setCreating] = React.useState<boolean>(false);
  const [resetting, setResetting] = React.useState<AdminRow | null>(null); // ← เพิ่ม

  return (
    <div className="p-4 bg-[#F8FBFE]">
      <Navbar title="User management" />

      {/* ลำดับ: Create > Reset > Edit > List */}
      {creating ? (
        <Content_Create
          onCancel={() => setCreating(false)}
          onCreate={({ password, avatarFile, ...created }) => {
            setRows((prev) => [created, ...prev]);
            setCreating(false);
            show({
              variant: "success",
              message: (
                <span className="text-white font-semibold">Create Success</span>
              ),
            });
          }}
        />
      ) : resetting ? (
        <Content_Reset
          user={resetting}
          onCancel={() => setResetting(null)}
          onReset={() => {
            setResetting(null);
            show({
              variant: "success",
              message: (
                <span className="text-white font-semibold">Password Reset</span>
              ),
            });
          }}
        />
      ) : editing ? (
        <Content_Edit
          user={editing}
          allUsers={rows}
          onCancel={() => setEditing(null)}
          onSave={(next) => {
            setRows((prev) => prev.map((x) => (x.id === next.id ? next : x)));
            setEditing(null);
            show({
              variant: "success",
              message: (
                <span className="text-white font-semibold">Edit saved</span>
              ),
            });
          }}
        />
      ) : (
        <Content
          rows={rows}
          setRows={setRows}
          onEdit={setEditing}
          onCreateClick={() => setCreating(true)}
          onReset={(row) => setResetting(row)} // ← hook เข้าปุ่มกุญแจ
        />
      )}
    </div>
  );
}
