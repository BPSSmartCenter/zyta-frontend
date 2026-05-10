import React from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../../components/UserManagement/Navbar";
import Content from "../../components/UserManagement/Content";
import Content_Edit from "../../components/UserManagement/Content_Edit";
import Content_Create from "../../components/UserManagement/Content_Create";
import Content_Reset from "../../components/UserManagement/Content_Reset";
import { ToastProvider, useToast } from "../../hook/toastProvider";
import {
  listUsers,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  resetUserPassword as apiResetPassword,
  searchUsersByEmail as apiSearchUsersByEmail,
  assignUserSites as apiAssignUserSites,
  type AdminUserDto,
  type UserSearchDto,
} from "../../features/users";
import { ADMIN_ROWS, type AdminRow } from "../../components/UserManagement/user.constant";

export default function UserManagement() {
  return (
    <ToastProvider>
      <UserManagementGuarded />
    </ToastProvider>
  );
}

function UserManagementGuarded() {
  const { t } = useTranslation("userManagement");
  const [allowed, setAllowed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const me = await (await import("../../features/users")).me();
        const role = String(me.role).toLowerCase();
        setAllowed(role === "admin" || role === "manager");
      } catch {
        setAllowed(false);
      }
    })();
  }, []);

  if (allowed === null) {
    return <div className="p-6">{t("page.loading", { defaultValue: "Loading..." })}</div>;
  }
  if (!allowed) {
    if (typeof window !== "undefined") window.location.replace("/dashboard");
    return null;
  }
  return <UserManagementInner />;
}

function UserManagementInner() {
  const { t } = useTranslation("userManagement");
  const { show } = useToast();
  const [actorRole, setActorRole] = React.useState<"admin" | "manager" | "officer" | "user">(
    "admin"
  );
  const [actorSiteIds, setActorSiteIds] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<AdminRow[]>(ADMIN_ROWS);
  const [editing, setEditing] = React.useState<AdminRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [resetting, setResetting] = React.useState<AdminRow | null>(null);
  const [emailQuery, setEmailQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<UserSearchDto[]>([]);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchWrapRef = React.useRef<HTMLDivElement | null>(null);
  const searchReqRef = React.useRef(0);

  const texts = React.useMemo(
    () => ({
      title: t("page.title", { defaultValue: "User management" }),
      managerSearch: {
        title: t("managerSearch.title", {
          defaultValue: "Find User by Email to Give Permission",
        }),
        placeholder: t("managerSearch.placeholder", {
          defaultValue: "Enter user email",
        }),
        search: t("managerSearch.search", { defaultValue: "Search" }),
        noResult: t("managerSearch.noResult", { defaultValue: "No users found" }),
        resultHeader: t("managerSearch.resultHeader", { defaultValue: "Search results" }),
        addAccess: t("managerSearch.addAccess", { defaultValue: "Add to my sites" }),
        alreadyInScope: t("managerSearch.alreadyInScope", {
          defaultValue: "Already in at least one of your sites",
        }),
        addSuccess: t("managerSearch.addSuccess", {
          defaultValue: "Site access has been granted",
        }),
        addFailed: t("managerSearch.addFailed", {
          defaultValue: "Unable to grant site access",
        }),
        profilePreview: t("managerSearch.profilePreview", {
          defaultValue: "Profile preview",
        }),
        roleLabel: t("managerSearch.roleLabel", { defaultValue: "Role" }),
        sitesLabel: t("managerSearch.sitesLabel", { defaultValue: "Current sites" }),
      },
      toasts: {
        createSuccess: t("toasts.createSuccess", { defaultValue: "Create success" }),
        createFailed: t("toasts.createFailed", { defaultValue: "Create failed" }),
        resetSuccess: t("toasts.resetSuccess", { defaultValue: "Password reset" }),
        resetFailed: t("toasts.resetFailed", { defaultValue: "Reset failed" }),
        editSuccess: t("toasts.editSuccess", { defaultValue: "Edit saved" }),
        editFailed: t("toasts.editFailed", { defaultValue: "Edit failed" }),
        deleteSuccess: t("toasts.deleteSuccess", { defaultValue: "Deleted" }),
        deleteFailed: t("toasts.deleteFailed", { defaultValue: "Delete failed" }),
      },
    }),
    [t]
  );

  const toastContent = React.useCallback(
    (key: keyof typeof texts.toasts) => (
      <span className="text-white font-semibold">{texts.toasts[key]}</span>
    ),
    [texts.toasts]
  );

  const mapDto = (u: AdminUserDto): AdminRow => ({
    id: u.id,
    fullName: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
    email: u.email,
    role:
      (u.role === "admin"
        ? "Admin"
        : u.role === "manager"
        ? "Manager"
        : u.role === "officer"
        ? "Officer"
        : "User") as any,
    addedAt: u.createdAt,
    lastAccessAt: u.updatedAt,
    active: !!u.active,
    avatar: "",
  });

  const roleLabel = React.useCallback(
    (role: string) => {
      const key = String(role || "user").toLowerCase();
      return t(`roles.${key}`, { defaultValue: role });
    },
    [t]
  );

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

  React.useEffect(() => {
    (async () => {
      try {
        const me = await (await import("../../features/users")).me();
        setActorRole((String(me?.role || "user").toLowerCase() as any) || "user");
        const siteIds = Array.isArray(me?.sites)
          ? me.sites.map((s: any) => s?.id).filter(Boolean)
          : [];
        setActorSiteIds(siteIds);
      } catch {
        setActorRole("user");
        setActorSiteIds([]);
      }
    })();
  }, []);

  const runSearch = React.useCallback(async (queryInput: string) => {
    const query = queryInput.trim();
    if (!query || actorRole !== "manager") {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const reqId = ++searchReqRef.current;
    setSearching(true);
    try {
      const items = await apiSearchUsersByEmail(query);
      if (reqId !== searchReqRef.current) return;
      setSearchResults(items);
      setSearchOpen(true);
    } catch (e) {
      console.error(e);
      if (reqId !== searchReqRef.current) return;
      setSearchResults([]);
    } finally {
      if (reqId === searchReqRef.current) setSearching(false);
    }
  }, [actorRole]);

  const handleManagerSearch = React.useCallback(async () => {
    await runSearch(emailQuery);
  }, [emailQuery, runSearch]);

  React.useEffect(() => {
    if (actorRole !== "manager") return;
    const q = emailQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearching(false);
      return;
    }
    const timer = window.setTimeout(() => {
      runSearch(q);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [emailQuery, actorRole, runSearch]);

  React.useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(ev.target as Node)) {
        setSearchOpen(false);
      }
    };
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const handleAssign = React.useCallback(
    async (userId: string) => {
      try {
        await apiAssignUserSites(userId);
        show({
          variant: "success",
          message: <span className="text-white font-semibold">{texts.managerSearch.addSuccess}</span>,
        });
        await refresh();
        if (emailQuery.trim()) await runSearch(emailQuery);
      } catch (e) {
        console.error(e);
        show({
          variant: "error",
          message: <span className="text-white font-semibold">{texts.managerSearch.addFailed}</span>,
        });
      }
    },
    [show, texts.managerSearch.addSuccess, texts.managerSearch.addFailed, refresh, emailQuery, runSearch]
  );

  const managerAssignWidget =
    actorRole === "manager" ? (
      <div className="relative" ref={searchWrapRef}>
        <label className="font-bold text-sm block mb-2">{texts.managerSearch.title}</label>
        <div className="flex gap-2">
          <input
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            onFocus={() => {
              if (emailQuery.trim()) setSearchOpen(true);
            }}
            placeholder={texts.managerSearch.placeholder}
            className="h-[40px] flex-1 rounded-md border border-gray-300 px-3 text-[14px] outline-none focus:ring-2 focus:ring-cyan/40"
          />
          <button
            type="button"
            onClick={handleManagerSearch}
            className="h-[40px] px-4 rounded-md bg-cyan text-white font-semibold hover:bg-cyan-400 cursor-pointer"
          >
            {searching
              ? t("page.loading", { defaultValue: "Loading..." })
              : texts.managerSearch.search}
          </button>
        </div>
        {searchOpen && emailQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-[78px] z-50 rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">{texts.managerSearch.resultHeader}</p>
            </div>
            {searchResults.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-500">{texts.managerSearch.noResult}</p>
            ) : (
              <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-gray-200 px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan/15 text-cyan font-bold flex items-center justify-center shrink-0">
                        {(([item.firstName, item.lastName]
                          .filter(Boolean)
                          .join(" ")
                          .trim()
                          .charAt(0) || item.email.charAt(0)) as string).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{texts.managerSearch.profilePreview}</p>
                        <p className="font-medium text-gray-900">
                          {[item.firstName, item.lastName].filter(Boolean).join(" ").trim() || "-"}
                        </p>
                        <p className="text-sm text-gray-600">{item.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {texts.managerSearch.roleLabel}: {roleLabel(item.role)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {texts.managerSearch.sitesLabel}: {item.siteIds.length}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.inManagedScope ? (
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                          {texts.managerSearch.alreadyInScope}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAssign(item.id)}
                          className="h-9 px-3 rounded-md border border-cyan text-cyan font-semibold hover:bg-cyan-50 cursor-pointer"
                        >
                          {texts.managerSearch.addAccess}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className="p-4 bg-[#F8FBFE]">
      <Navbar title={texts.title} />

      {creating ? (
        <Content_Create
          actorRole={actorRole}
          actorSiteIds={actorSiteIds}
          managerAssignWidget={managerAssignWidget}
          onCancel={() => setCreating(false)}
          onCreate={async ({ password, siteIds, brandingLogoDataUrl, ...created }) => {
            try {
              const [firstName, ...rest] = (created.fullName || "").split(" ");
              const lastName = rest.join(" ");
              await apiCreateUser({
                firstName: firstName || "",
                lastName,
                email: created.email,
                password,
                role:
                  created.role === "Admin"
                    ? "admin"
                    : created.role === "Manager"
                    ? "manager"
                    : created.role === "Officer"
                    ? "officer"
                    : "user",
                ...(Array.isArray(siteIds) ? { siteIds } : {}),
                ...(brandingLogoDataUrl ? { brandingLogoDataUrl } : {}),
              });
              await refresh();
              setCreating(false);
              show({ variant: "success", message: toastContent("createSuccess") });
            } catch (e) {
              console.error(e);
              show({ variant: "error", message: toastContent("createFailed") });
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
              show({ variant: "success", message: toastContent("resetSuccess") });
            } catch (e) {
              console.error(e);
              show({ variant: "error", message: toastContent("resetFailed") });
            }
          }}
        />
      ) : editing ? (
        <Content_Edit
          actorRole={actorRole}
          actorSiteIds={actorSiteIds}
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
                role:
                  next.role === "Admin"
                    ? "admin"
                    : next.role === "Manager"
                    ? "manager"
                    : next.role === "Officer"
                    ? "officer"
                    : "user",
                ...(Array.isArray((next as any).siteIds)
                  ? { siteIds: (next as any).siteIds as string[] }
                  : {}),
                ...((next as any).brandingLogoDataUrl ? { brandingLogoDataUrl: (next as any).brandingLogoDataUrl } : {}),
                ...((next as any).removeBrandingLogo ? { removeBrandingLogo: true } : {}),
              });
              await refresh();
              setEditing(null);
              show({ variant: "success", message: toastContent("editSuccess") });
            } catch (e) {
              console.error(e);
              show({ variant: "error", message: toastContent("editFailed") });
            }
          }}
        />
      ) : (
        <Content
          actorRole={actorRole}
          rows={rows}
          setRows={setRows}
          onEdit={setEditing}
          onCreateClick={() => setCreating(true)}
          onReset={(row) => setResetting(row)}
          onDelete={async (row) => {
            try {
              await apiDeleteUser(row.id);
              await refresh();
              show({ variant: "success", message: toastContent("deleteSuccess") });
            } catch (e) {
              console.error(e);
              show({ variant: "error", message: toastContent("deleteFailed") });
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
