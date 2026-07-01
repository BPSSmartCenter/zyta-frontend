// src/components/Devices/Content.tsx
import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { exportImage } from "../../assets";
import { useTranslation } from "react-i18next";
import CCTVPanel from "./CCTV/cctvPanel";
import CCTVTable from "./CCTV/cctvTable";
import WaterMeterPanel from "./Water Meter/waterMeterPanel";
import ElectricMeterPanel from "./Electric Meter/electricMeterPanel";
import AirPanel from "./Air Sensor/AirPanel";
import IoTPanel from "./IoT/IoTPanel";
import IoTDetail from "./IoT/IoTDetail";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";
import { useFilters } from "../../context/FiltersContext";
import { useDeviceInventoryLoader } from "../../hooks/useDeviceInventoryLoader";
import MiniFiltersBar from "../Shared/MiniFiltersBar";
import LanguagePillSwitcher from "../LanguagePillSwitcher";
import {
  useDeviceInventory,
} from "../../context/DeviceInventoryContext";
import Modal from "../Modal";
import { getSiteBillingAccess } from "../../features/sites";
import type { BillingType, SiteBillingAccess } from "../../types/billing";

type Props = {};

const TYPE_TO_ID: Record<string, string> = {
  cctv: "cctv-1",
  watermeter: "water-1",
  electricmeter: "electric-1",
  airsensor: "air-1",
  iot: "iot-1",
  caregiver: "caregiver-1",
  digitaltwin: "digitaltwin-1",
};

const DISABLED_DEVICE_TYPES = new Set<keyof typeof TYPE_TO_ID>();
const DEFAULT_DEVICE_TYPE: keyof typeof TYPE_TO_ID = "watermeter";
const BILLING_TYPE_BY_URL: Partial<Record<string, BillingType>> = {
  electricmeter: "electric",
  watermeter: "water",
};
const BILLING_FIELD_BY_TYPE: Record<BillingType, keyof SiteBillingAccess> = {
  electric: "allowElectricBilling",
  water: "allowWaterBilling",
};

export default function Content({}: Props) {
  const { t: tDevices } = useTranslation("devices");
  const { t: tSidebar } = useTranslation("sidebar");
  const location = useLocation();
  const navigate = useNavigate();

  const { abs, absSite } = useUserPath();
  const { siteCode } = useParams();
  const { counts: inventoryCounts, loading: inventoryLoading } =
    useDeviceInventory();
  const { selectedSite, siteOptions } = useFilters();
  const accessibleSitesFromFilters = useMemo(
    () =>
      (siteOptions || [])
        .map((opt) => ({
          code: String(opt?.value || "").trim(),
          name: String(opt?.label || "").trim(),
        }))
        .filter(
          (site) => site.code.length > 0 && site.code.toLowerCase() !== "all",
        ),
    [siteOptions],
  );

  useDeviceInventoryLoader({
    selectedSiteCode: siteCode ?? selectedSite,
    accessibleSites: accessibleSitesFromFilters,
  });
  // ===== URL → type (derive only; no local state) =====
  const urlType = useMemo(() => {
    const q = new URLSearchParams(location.search).get("type")?.toLowerCase();
    const candidate =
      q && TYPE_TO_ID[q as keyof typeof TYPE_TO_ID]
        ? (q as keyof typeof TYPE_TO_ID)
        : DEFAULT_DEVICE_TYPE;
    return DISABLED_DEVICE_TYPES.has(candidate)
      ? DEFAULT_DEVICE_TYPE
      : candidate;
  }, [location.search]);

  // Read deviceId for IoT Detail View
  const deviceId = useMemo(() => {
    return new URLSearchParams(location.search).get("deviceId");
  }, [location.search]);

  // If current URL points to a zero-count type and there exists any available type, redirect to the first available
  const selectedId = useMemo(() => TYPE_TO_ID[urlType], [urlType]);
  const availableTypes = (
    Object.keys(TYPE_TO_ID) as Array<keyof typeof TYPE_TO_ID>
  ).filter(
    (k) => !DISABLED_DEVICE_TYPES.has(k),
  );

  if (typeof window !== "undefined") {
    const isDisabledType = DISABLED_DEVICE_TYPES.has(urlType);
    if (isDisabledType && availableTypes.length > 0) {
      const nextType = availableTypes[0];
      const params = new URLSearchParams(location.search);
      params.set("type", nextType);
      params.delete("deviceId"); // Clear detail on type switch
      if (siteCode) {
        navigate(
          {
            pathname: absSite("/devices", siteCode),
            search: `?${params.toString()}`,
          },
          { replace: true },
        );
      } else {
        navigate(
          { pathname: abs("/devices"), search: `?${params.toString()}` },
          { replace: true },
        );
      }
    }
  }

  const effectiveSiteCode =
    siteCode ??
    (selectedSite && selectedSite !== "all" ? selectedSite : undefined);
  const currentBillingType = BILLING_TYPE_BY_URL[urlType] ?? null;
  const [billingGuardOpen, setBillingGuardOpen] = useState(false);
  const [siteDeviceGuardOpen, setSiteDeviceGuardOpen] = useState(false);
  const [billingDisabledOpen, setBillingDisabledOpen] = useState(false);
  const [billingAllowed, setBillingAllowed] = useState(false);
  const [billingAccess, setBillingAccess] = useState<SiteBillingAccess | null>(
    null,
  );
  const [billingAccessLoading, setBillingAccessLoading] = useState(false);

  useEffect(() => {
    if (!effectiveSiteCode || !currentBillingType) {
      setBillingAccess(null);
      setBillingAllowed(false);
      return;
    }
    let cancelled = false;
    setBillingAccessLoading(true);
    getSiteBillingAccess(effectiveSiteCode)
      .then((data) => {
        if (cancelled) return;
        setBillingAccess(data);
      })
      .catch(() => {
        if (cancelled) return;
        setBillingAccess(null);
        setBillingAllowed(false);
      })
      .finally(() => {
        if (cancelled) return;
        setBillingAccessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveSiteCode, currentBillingType]);

  useEffect(() => {
    if (!currentBillingType || !effectiveSiteCode) {
      setBillingAllowed(false);
      return;
    }
    const field = BILLING_FIELD_BY_TYPE[currentBillingType];
    setBillingAllowed(Boolean(billingAccess?.[field]));
  }, [billingAccess, currentBillingType, effectiveSiteCode]);

  const handleBillingClick = useCallback(() => {
    if (!effectiveSiteCode) {
      setBillingGuardOpen(true);
      return;
    }
    if (!billingAllowed) {
      setBillingDisabledOpen(true);
      return;
    }
    navigate(absSite("/electric", effectiveSiteCode));
  }, [effectiveSiteCode, billingAllowed, absSite, navigate]);
  const showBillingButton = Boolean(currentBillingType);
  const billingButtonDisabled =
    billingAccessLoading || !billingAllowed || !effectiveSiteCode;
  const hasSpecificSite = effectiveSiteCode && effectiveSiteCode !== "all";
  const totalDeviceCount = useMemo(() => {
    return Object.values(inventoryCounts ?? {}).reduce((sum, value) => {
      const num = typeof value === "number" ? value : 0;
      return sum + num;
    }, 0);
  }, [inventoryCounts]);
  const [siteSwitchLoading, setSiteSwitchLoading] = useState<boolean>(false);
  const lastSiteKeyRef = useRef<string>("");
  useEffect(() => {
    const nextKey = String(effectiveSiteCode ?? selectedSite ?? "all");
    // Show loading only when user switches site/group context, not for background polling.
    if (lastSiteKeyRef.current !== nextKey) {
      lastSiteKeyRef.current = nextKey;
      setSiteSwitchLoading(true);
    }
  }, [effectiveSiteCode, selectedSite, lastSiteKeyRef]);
  useEffect(() => {
    if (!siteSwitchLoading) return;
    if (!inventoryLoading) {
      setSiteSwitchLoading(false);
    }
  }, [siteSwitchLoading, inventoryLoading]);
  const isDeviceInventoryLoading = siteSwitchLoading;
  useEffect(() => {
    // If we are viewing IoT or Caregiver, do NOT block even if internal inventory is empty
    const isExternal =
      urlType === "iot" || urlType === "caregiver" || urlType === "digitaltwin";
    if (
      hasSpecificSite &&
      !inventoryLoading &&
      totalDeviceCount <= 0 &&
      !isExternal
    ) {
      setSiteDeviceGuardOpen(true);
    } else {
      setSiteDeviceGuardOpen(false);
    }
  }, [hasSpecificSite, inventoryLoading, totalDeviceCount, urlType]);
  const handleDeviceGuardClose = useCallback(() => {
    setSiteDeviceGuardOpen(false);
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(abs("/dashboard"), { replace: true });
  }, [navigate, abs]);

  return (
    <>
      <nav className="">
        <div className="flex flex-row items-center w-full justify-between">
          <div className="w-full flex max-w-xl gap-3">
            <MiniFiltersBar
              page="devices"
              variant="hero"
              className="min-w-0 flex-1"
            />
            <LanguagePillSwitcher name="devices-lng" />
          </div>
          {showBillingButton && (
            <button
              type="button"
              onClick={handleBillingClick}
              disabled={billingButtonDisabled}
              className={[
                "inline-flex h-11 shrink-0 items-center justify-center rounded-[18px] border border-[#CDEFFF] bg-white px-4 text-sm font-semibold text-[#2F3E56] shadow-[0_12px_30px_rgba(57,184,238,0.12)] xl:min-w-[176px]",
                billingButtonDisabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:cursor-pointer hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="flex items-center gap-2 truncate">
                <img src={exportImage} alt="" />
                <span>
                  {tSidebar("menu.billing", { defaultValue: "Billing" })}
                </span>
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Panel/Table ตาม selectedId (คอมโพเนนต์คงตัว ไม่รี-mount จาก key/state) */}
      {selectedId === "cctv-1" ? (
        <div className="mt-6">
          <CCTVPanel siteCode={siteCode} />
        </div>
      ) : selectedId === "intercom-1" ? (
        <div className="flex flex-col gap-3">
          <CCTVPanel />
          <CCTVTable />
        </div>
      ) : selectedId === "water-1" ? (
        <div className="mt-6">
          <WaterMeterPanel siteCode={siteCode} />
        </div>
      ) : selectedId === "electric-1" ? (
        <div className="mt-6">
          <ElectricMeterPanel siteCode={siteCode} />
          <CCTVTable />
        </div>
      ) : selectedId === "air-1" ? (
        <div className="mt-6">
          <AirPanel siteCode={siteCode} />
        </div>
      ) : selectedId === "iot-1" ? (
        <div className="mt-6">
          {deviceId ? (
            <IoTDetail
              deviceId={deviceId}
              siteCode={effectiveSiteCode}
              onBack={() => {
                const params = new URLSearchParams(location.search);
                params.delete("deviceId");
                navigate(
                  { search: `?${params.toString()}` },
                  { replace: false },
                );
              }}
            />
          ) : (
            <IoTPanel siteCode={effectiveSiteCode} />
          )}
        </div>
      ) : (
        <div className="mt-6" />
      )}

      <Modal
        open={siteDeviceGuardOpen}
        id="devices-site-blocked"
        icon="warning"
        title="ไม่สามารถเข้าถึงหน้า Devices ได้"
        message="Site นี้ยังไม่มีอุปกรณ์ในระบบ กรุณาเลือก Site อื่น"
        closeLabel="ย้อนกลับ"
        onClose={handleDeviceGuardClose}
      />
      <Modal
        open={billingGuardOpen}
        id="devices-billing-site-required"
        icon="cancel"
        title="กรุณาเลือก Site ก่อนใช้งาน"
        message="โปรดเลือก Site จากเมนูด้านบน (Navbar) เพื่อเปิดหน้า Billing"
        closeLabel="โอเค"
        onClose={() => setBillingGuardOpen(false)}
      />
      <Modal
        open={billingDisabledOpen}
        id="devices-billing-disabled"
        icon="warning"
        title="ยังไม่เปิดใช้ Billing"
        message={
          currentBillingType === "water"
            ? "ไปที่ Site Management เพื่อเปิดการใช้งาน Billing ของมิเตอร์น้ำก่อน"
            : currentBillingType === "electric"
              ? "ไปที่ Site Management เพื่อเปิดการใช้งาน Billing ของมิเตอร์ไฟก่อน"
              : "ไปที่ Site Management เพื่อเปิดการใช้งาน Billing ของไซต์นี้ก่อน"
        }
        closeLabel="รับทราบ"
        onClose={() => setBillingDisabledOpen(false)}
      />
      {isDeviceInventoryLoading && (
        <div className="fixed inset-0 z-[1000] bg-white/55 backdrop-blur-[2px] flex items-center justify-center">
          <div className="rounded-2xl border border-cyan-200 bg-white px-6 py-5 shadow-xl flex items-center gap-3 text-cyan-700">
            <i className="material-icons text-2xl animate-spin">autorenew</i>
            <span className="text-sm font-semibold">
              {tDevices("loadingDevices", {
                defaultValue: "Loading devices...",
              })}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
