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
import { logout as mockLogout } from "../data/Dashboard/auth";
import { authActions, selectAuthUser } from "../features/auth";
import {
  clearAllStoredSites,
  siteSelectionActions,
} from "../features/siteSelection";
import {
  selectSidebarOpen,
  selectSidebarSearchQuery,
  sidebarActions,
} from "../features/sidebar";
import { useUserPath } from "../routes/useUserPath";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { buildBrandingLogoSrc } from "../utils/branding";
import Modal from "./Modal";
import SearchInput from "./SearchInput";
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

function filterSidebarItems(
  items: GlassHoverSidebarItem[],
  searchTerm: string
): GlassHoverSidebarItem[] {
  if (!searchTerm) return items;

  return items.reduce<GlassHoverSidebarItem[]>((result, item) => {
    const labelMatches = item.label.toLocaleLowerCase().includes(searchTerm);
    const matchedChildren = item.children
      ? filterSidebarItems(item.children, searchTerm)
      : undefined;

    if (labelMatches || (matchedChildren?.length ?? 0) > 0) {
      result.push({
        ...item,
        children: labelMatches ? item.children : matchedChildren,
      });
    }

    return result;
  }, []);
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
  const searchQ = useAppSelector(selectSidebarSearchQuery);
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
    try {
      mockLogout();
    } catch {
      /* ignore mock logout failures */
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
    facerec: pathScoped.startsWith("/facerec"),
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
      active: active.alertEvent("fire"),
      onSelect: () => go("/alert?event=fire"),
    },
    {
      id: "alert-motion",
      label: t("menu.alerts_motion", { defaultValue: "ตรวจพบการเคลื่อนไหว" }),
      active: active.alertEvent("motion"),
      onSelect: () => go("/alert?event=motion"),
    },
    {
      id: "alert-offline",
      label: t("menu.alerts_offline", { defaultValue: "จำนวนกล้อง" }),
      active: active.alertEvent("offline"),
      onSelect: () => go("/alert?event=offline"),
    },
    {
      id: "alert-fall",
      label: t("menu.alerts_fall", { defaultValue: "ตรวจพบการล้ม" }),
      active: active.alertEvent("fall"),
      onSelect: () => go("/alert?event=fall"),
    },
    {
      id: "alert-sleep",
      label: t("menu.alerts_sleep", { defaultValue: "ตรวจพบนอนหลับ" }),
      active: active.alertEvent("sleep"),
      onSelect: () => go("/alert?event=sleep"),
    },
  ];

  const deviceItems: GlassHoverSidebarItem[] = (
    [
      {
        key: "cctv",
        label: t("menu.devices_cctv", { defaultValue: "CCTV" }),
      },
      {
        key: "watermeter",
        label: t("menu.devices_watermeter", { defaultValue: "Water Meter" }),
      },
      {
        key: "electricmeter",
        label: t("menu.devices_electricmeter", {
          defaultValue: "Electric Meter",
        }),
      },
      {
        key: "airsensor",
        label: t("menu.devices_airsensor", { defaultValue: "Air Sensor" }),
      },
      { key: "iot", label: t("menu.devices_iot", { defaultValue: "IoT" }) },
      {
        key: "caregiver",
        label: t("menu.devices_caregiver", { defaultValue: "Caregiver" }),
      },
      {
        key: "digitaltwin",
        label: t("menu.devices_digitaltwin", { defaultValue: "Digital Twin" }),
      },
    ] satisfies Array<{ key: SidebarDeviceKey; label: string }>
  ).map(({ key, label }) => {
    const isExternal =
      key === "iot" || key === "caregiver" || key === "digitaltwin";
    const zero =
      isInventoryDeviceKey(key) &&
      getCountForType(inventoryCounts, key) <= 0;
    const disabled = (!isExternal && zero) || DISABLED_DEVICE_TYPES.has(key);

    return {
      id: `device-${key}`,
      label,
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

  const navItems: GlassHoverSidebarItem[] = [
    {
      id: "sandbox",
      label: t("menu.sandbox", { defaultValue: "Sandbox" }),
      icon: "dashboard_customize",
      active: active.sandbox,
      onSelect: () => {
        navigate("/sandbox/card-board");
        closeSidebar();
      },
    },
    {
      id: "home",
      label: t("menu.home", { defaultValue: "หน้าแรก" }),
      icon: "home",
      active: active.home,
      onSelect: () => go("/dashboard"),
    },
    {
      id: "notification",
      label: t("menu.notification", { defaultValue: "การแจ้งเตือน" }),
      icon: "notifications",
      active: active.alert,
      children: alertItems,
    },
    {
      id: "facerec",
      label: t("menu.facerec", { defaultValue: "การจดจำใบหน้า" }),
      icon: "face",
      active: active.facerec,
      onSelect: () => go("/facerec"),
    },
    {
      id: "devices",
      label: t("menu.devices", { defaultValue: "อุปกรณ์" }),
      icon: "devices",
      active: active.devices,
      children: deviceItems,
    },
  ];

  const role = String(account?.role || "").toLowerCase();
  if (role === "admin" || role === "manager") {
    navItems.push({
      id: "usermanage",
      label: t("menu.user_management", { defaultValue: "การจัดการผู้ใช้" }),
      icon: "groups",
      active: active.usermanage,
      onSelect: () => go("/usermanage"),
    });
  }

  if (String(account?.email || "").toLowerCase() === MASTER_EMAIL) {
    navItems.push({
      id: "sitemanage",
      label: t("menu.site_management", { defaultValue: "การจัดการไซต์" }),
      icon: "location_on",
      active: active.sitemanage,
      onSelect: () => go("/sitemanage"),
    });
  }

  const searchTerm = searchQ.trim().toLocaleLowerCase();
  const filteredItems = filterSidebarItems(navItems, searchTerm);
  const footerItems: GlassHoverSidebarItem[] = [
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
        headerSlot={
          <SearchInput
            value={searchQ}
            onChange={(value) =>
              dispatch(sidebarActions.setSidebarSearchQuery(value))
            }
            placeholder={t("search.placeholder", { defaultValue: "Search" })}
            className="mt-3 w-full"
            disableMenu={true}
          />
        }
        items={filteredItems}
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
        className={["min-h-160 bg-white transition-all duration-300", contentClassName].join(
          " "
        )}
      >
        {children}
      </div>
    </div>
  );
}
