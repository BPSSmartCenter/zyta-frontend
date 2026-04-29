import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { logout as apiLogout } from "../api/auth";
import { brandImage, userIcon } from "../assets/index";
import {
  getCountForType,
  useDeviceInventory,
  type DeviceTypeKey,
} from "../context/DeviceInventoryContext";
import { authActions, selectAuthUser } from "../features/auth";
import {
  clearAllStoredSites,
  siteSelectionActions,
} from "../features/siteSelection";
import { selectSidebarOpen, sidebarActions } from "../features/sidebar";
import { useUserPath } from "../routes/useUserPath";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { buildBrandingLogoSrc } from "../utils/branding";
import {
  FACE_RECOGNIZE_PATH,
  LICENSE_PLATES_PATH,
} from "../utils/faceRecRoutes";
import Modal from "./Modal";
import { GlassHoverSidebar, type GlassHoverSidebarItem } from "./ui";

const DISABLED_DEVICE_TYPES = new Set<SidebarDeviceKey>(["cctv"]);
const MASTER_EMAIL = "smartechcenter@bpstechthai.com";
const LOGO_CACHE_KEY = "bps_user_branding_logo";

type AccountRole = "admin" | "manager" | "officer" | "user";
type SidebarDeviceKey = DeviceTypeKey | "digitaltwin";

type Props = {
  children?: ReactNode;
  contentClassName?: string;
};

function useIsDesktop1024() {
  const get = () =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false;
  const [isDesktop, setIsDesktop] = useState<boolean>(get);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return isDesktop;
}

function isInventoryDeviceKey(key: SidebarDeviceKey): key is DeviceTypeKey {
  return key !== "digitaltwin";
}

export default function Sidebar({ children, contentClassName = "" }: Props) {
  const isDesktop = useIsDesktop1024();
  const { t } = useTranslation("sidebar");
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(selectAuthUser);
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const { abs, base, absSite } = useUserPath();
  const { counts: inventoryCounts } = useDeviceInventory();

  const [sidebarLogoSrc, setSidebarLogoSrc] = useState<string>(() => {
    try {
      return localStorage.getItem(LOGO_CACHE_KEY) || brandImage;
    } catch {
      return brandImage;
    }
  });
  const [logoutOpen, setLogoutOpen] = useState(false);

  const account = authUser
    ? {
        name:
          `${authUser.firstName ?? ""} ${authUser.lastName ?? ""}`.trim() ||
          authUser.email.split("@")[0],
        email: authUser.email,
        role: authUser.role as AccountRole,
      }
    : null;

  useEffect(() => {
    if (!authUser) return;

    if (authUser.brandingLogoUrl) {
      const resolved = buildBrandingLogoSrc(authUser.brandingLogoUrl);
      if (resolved) {
        setSidebarLogoSrc(resolved);
        try {
          localStorage.setItem(LOGO_CACHE_KEY, resolved);
        } catch {
          /* ignore cache failures */
        }
        return;
      }
    }

    setSidebarLogoSrc(brandImage);
    try {
      localStorage.removeItem(LOGO_CACHE_KEY);
    } catch {
      /* ignore cache failures */
    }
  }, [authUser]);

  useEffect(() => {
    dispatch(sidebarActions.closeSidebar());
  }, [dispatch, location.pathname, location.search]);

  const closeSidebar = () => {
    dispatch(sidebarActions.closeSidebar());
  };

  const go = (path: string) => {
    navigate(abs(path));
    closeSidebar();
  };

  const goSiteOrGlobal = (path: string) => {
    const scMatch = location.pathname.match(/\/site\/([^/]+)/);
    const siteCode = scMatch?.[1];
    navigate(siteCode ? absSite(path, siteCode) : abs(path));
    closeSidebar();
  };

  const handleConfirmLogout = async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore logout API failures */
    }
    dispatch(authActions.clearAuthUser());
    dispatch(siteSelectionActions.resetSiteSelection());
    try {
      clearAllStoredSites();
    } catch {
      /* ignore storage errors */
    }
    closeSidebar();
    setLogoutOpen(false);
    navigate("/", { replace: true });
  };

  const url = new URLSearchParams(location.search);
  const pathNoBase = location.pathname.startsWith(base)
    ? location.pathname.slice(base.length) || "/"
    : location.pathname;
  const pathScoped = pathNoBase.replace(/^\/site\/[^/]+/, "");

  const active = {
    sandbox:
      location.pathname.startsWith("/sandbox/") ||
      pathScoped.startsWith("/sandbox"),
    home: pathScoped === "/dashboard",
    alert: pathScoped.startsWith("/alert"),
    alertEvent: (key: string) =>
      pathScoped.startsWith("/alert") && url.get("event") === key,
    facerec: pathScoped.startsWith(FACE_RECOGNIZE_PATH),
    licensePlates: pathScoped.startsWith(LICENSE_PLATES_PATH),
    devices: pathScoped.startsWith("/devices"),
    devicesType: (key: string) =>
      pathScoped.startsWith("/devices") && url.get("type") === key,
    usermanage: pathScoped.startsWith("/usermanage"),
    sitemanage: pathScoped.startsWith("/sitemanage"),
  };

  const alertItems: GlassHoverSidebarItem[] = [
    {
      id: "alert-fire",
      label: t("menu.alerts_fire", { defaultValue: "ตรวจพบไฟไหม้" }),
      icon: "local_fire_department",
      active: active.alertEvent("fire"),
      onSelect: () => go("/alert?event=fire"),
    },
    {
      id: "alert-motion",
      label: t("menu.alerts_motion", { defaultValue: "ตรวจพบการเคลื่อนไหว" }),
      icon: "directions_run",
      active: active.alertEvent("motion"),
      onSelect: () => go("/alert?event=motion"),
    },
    {
      id: "alert-offline",
      label: t("menu.alerts_offline", { defaultValue: "จำนวนกล้อง" }),
      icon: "videocam_off",
      active: active.alertEvent("offline"),
      onSelect: () => go("/alert?event=offline"),
    },
    {
      id: "alert-fall",
      label: t("menu.alerts_fall", { defaultValue: "ตรวจพบการล้ม" }),
      icon: "personal_injury",
      active: active.alertEvent("fall"),
      onSelect: () => go("/alert?event=fall"),
    },
    {
      id: "alert-sleep",
      label: t("menu.alerts_sleep", { defaultValue: "ตรวจพบนอนหลับ" }),
      icon: "bed",
      active: active.alertEvent("sleep"),
      onSelect: () => go("/alert?event=sleep"),
    },
  ];

  const deviceItems: GlassHoverSidebarItem[] = (
    [
      {
        key: "cctv",
        label: t("menu.devices_cctv", { defaultValue: "CCTV" }),
        icon: "videocam",
      },
      {
        key: "watermeter",
        label: t("menu.devices_watermeter", { defaultValue: "Water Meter" }),
        icon: "water_drop",
      },
      {
        key: "electricmeter",
        label: t("menu.devices_electricmeter", {
          defaultValue: "Electric Meter",
        }),
        icon: "bolt",
      },
      {
        key: "airsensor",
        label: t("menu.devices_airsensor", { defaultValue: "Air Sensor" }),
        icon: "air",
      },
      {
        key: "iot",
        label: t("menu.devices_iot", { defaultValue: "IoT" }),
        icon: "sensors",
      },
      {
        key: "caregiver",
        label: t("menu.devices_caregiver", { defaultValue: "Caregiver" }),
        icon: "medical_services",
      },
      {
        key: "digitaltwin",
        label: t("menu.devices_digitaltwin", { defaultValue: "Digital Twin" }),
        icon: "view_in_ar",
      },
    ] satisfies Array<{ key: SidebarDeviceKey; label: string; icon: string }>
  ).map(({ key, label, icon }) => {
    const isExternal =
      key === "iot" || key === "caregiver" || key === "digitaltwin";
    const zero =
      isInventoryDeviceKey(key) &&
      getCountForType(inventoryCounts, key) <= 0;
    const disabled = (!isExternal && zero) || DISABLED_DEVICE_TYPES.has(key);

    return {
      id: `device-${key}`,
      label,
      icon,
      active: active.devicesType(key),
      disabled,
      onSelect: disabled
        ? undefined
        : () => {
            if (key === "caregiver") {
              window.open("http://45.136.253.176:3000/", "_blank");
              closeSidebar();
              return;
            }
            if (key === "digitaltwin") {
              window.open("https://bpstech.online/login", "_blank");
              closeSidebar();
              return;
            }
            goSiteOrGlobal(`/devices?type=${key}`);
          },
    };
  });

  const role = String(account?.role || "").toLowerCase();
  const isAdmin = role === "admin";

  const navItems: GlassHoverSidebarItem[] = [
    {
      id: "section-workspace",
      label: t("section.workspace", { defaultValue: "Workspace" }),
      section: true,
    },
    ...(isAdmin
      ? [
          {
            id: "sandbox",
            label: t("menu.sandbox", { defaultValue: "Sandbox" }),
            icon: "dashboard_customize",
            active: active.sandbox,
            onSelect: () => {
              go("/sandbox/card-board");
            },
          } satisfies GlassHoverSidebarItem,
        ]
      : []),
    {
      id: "home",
      label: t("menu.home", { defaultValue: "หน้าแรก" }),
      icon: "home",
      active: active.home,
      onSelect: () => go("/dashboard"),
    },
    {
      id: "section-detection",
      label: t("section.detection", { defaultValue: "Detection" }),
      section: true,
    },
    ...alertItems,
    {
      id: "section-access",
      label: t("section.access", { defaultValue: "Access" }),
      section: true,
    },
    {
      id: "facerec",
      label: t("menu.facerec", { defaultValue: "การจดจำใบหน้า" }),
      icon: "face",
      active: active.facerec,
      onSelect: () => go(FACE_RECOGNIZE_PATH),
    },
    {
      id: "license-plates",
      label: t("menu.license_plates", { defaultValue: "ป้ายทะเบียนรถ" }),
      icon: "directions_car",
      active: active.licensePlates,
      onSelect: () => go(LICENSE_PLATES_PATH),
    },
    {
      id: "section-devices",
      label: t("menu.devices", { defaultValue: "อุปกรณ์" }),
      section: true,
    },
    ...deviceItems,
  ];

  const canManageUsers = role === "admin" || role === "manager";
  const canManageSites =
    String(account?.email || "").toLowerCase() === MASTER_EMAIL;

  if (canManageUsers || canManageSites) {
    navItems.push({
      id: "section-admin",
      label: t("section.admin", { defaultValue: "Admin" }),
      section: true,
    });
  }

  if (canManageUsers) {
    navItems.push({
      id: "usermanage",
      label: t("menu.user_management", { defaultValue: "การจัดการผู้ใช้" }),
      icon: "groups",
      active: active.usermanage,
      onSelect: () => go("/usermanage"),
    });
  }

  if (canManageSites) {
    navItems.push({
      id: "sitemanage",
      label: t("menu.site_management", { defaultValue: "การจัดการไซต์" }),
      icon: "location_on",
      active: active.sitemanage,
      onSelect: () => go("/sitemanage"),
    });
  }

  const footerItems: GlassHoverSidebarItem[] = [
    {
      id: "section-system",
      label: t("section.system", { defaultValue: "System" }),
      section: true,
    },
    {
      id: "support",
      label: t("footer.support", { defaultValue: "Support" }),
      icon: "support_agent",
    },
    {
      id: "settings",
      label: t("footer.setting", { defaultValue: "Settings" }),
      icon: "settings",
    },
  ];

  return (
    <div className="relative">
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-[1090] bg-slate-950/35 backdrop-blur-[1px]"
          aria-hidden="true"
          onClick={closeSidebar}
        />
      )}

      <GlassHoverSidebar
        title="BPS Command"
        subtitle="Operations Center"
        logo={
          <button
            type="button"
            className="grid h-full w-full place-items-center"
            aria-label={t("aria.brandAlt", { defaultValue: "Brand" })}
            onClick={() => go("/dashboard")}
          >
            <img
              src={sidebarLogoSrc}
              alt=""
              className="h-full w-full object-contain p-1"
              onError={(event) => {
                event.currentTarget.src = brandImage;
              }}
            />
          </button>
        }
        items={navItems}
        footerItems={footerItems}
        account={
          account
            ? {
                name: account.name,
                email: account.email,
                avatarSrc: userIcon,
              }
            : undefined
        }
        ariaLabel={t("aria.sidebarLabel", { defaultValue: "Sidebar" })}
        toggleLabel={t("aria.toggleSidebar", {
          defaultValue: "Toggle sidebar",
        })}
        open={sidebarOpen}
        onOpenChange={(open) => dispatch(sidebarActions.setSidebarOpen(open))}
        onLogout={() => {
          setLogoutOpen(true);
          closeSidebar();
        }}
      />

      <Modal
        open={logoutOpen}
        id="logout-confirm"
        icon="warning"
        title={t("logout.title", { defaultValue: "Sign out" })}
        message={t("logout.message", {
          defaultValue: "Are you sure you want to sign out?",
        })}
        onClose={() => setLogoutOpen(false)}
        confirmLabel={t("actions.signOut", { defaultValue: "Sign out" })}
        cancelLabel={t("actions.cancel", { defaultValue: "Cancel" })}
        onConfirm={handleConfirmLogout}
      />

      <div
        className={["min-h-160 bg-white transition-all duration-300 lg:pl-[76px]", contentClassName].join(
          " "
        )}
      >
        {children}
      </div>
    </div>
  );
}
