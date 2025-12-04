// src/components/Devices/Content.tsx
import { useMemo, useCallback, useState, useEffect } from "react";
import { exportImage } from "../../assets";
import { useTranslation } from "react-i18next";
import StatCard, { StatCardGroup } from "../StatCard";
import { DEVICE_CARDS } from "./devices.constant";
import CCTVPanel from "./CCTV/cctvPanel";
import CCTVTable from "./CCTV/cctvTable";
import WaterMeterPanel from "./Water Meter/waterMeterPanel";
import ElectricMeterPanel from "./Electric Meter/electricMeterPanel";
import AirPanel from "./Air Sensor/AirPanel";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";
import { useFilters } from "../../context/FiltersContext";
import { useDeviceInventoryLoader } from "../../hooks/useDeviceInventoryLoader";
import MiniFiltersBar from "../Shared/MiniFiltersBar";
import { useDeviceInventory, getCountForType } from "../../context/DeviceInventoryContext";
import Modal from "../Modal";
import { getSiteBillingAccess } from "../../api/sites";
import type { BillingType, SiteBillingAccess } from "../../types/billing";

type Props = {};

const TYPE_TO_ID: Record<string, string> = {
  cctv: "cctv-1",
  watermeter: "water-1",
  electricmeter: "electric-1",
  airsensor: "air-1",
};

const ID_TO_TYPE: Record<string, string> = Object.entries(TYPE_TO_ID).reduce(
  (acc, [type, id]) => {
    acc[id] = type;
    return acc;
  },
  {} as Record<string, string>
);

const DISABLED_DEVICE_TYPES = new Set<keyof typeof TYPE_TO_ID>(["cctv"]);
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
  const { counts: inventoryCounts, loading: inventoryLoading } = useDeviceInventory();
  const { selectedSite } = useFilters();

  useDeviceInventoryLoader({
    selectedSiteCode: siteCode ?? selectedSite,
  });
  // ===== URL → type (derive only; no local state) =====
  const urlType = useMemo(() => {
    const q = new URLSearchParams(location.search).get("type")?.toLowerCase();
    const candidate =
      q && TYPE_TO_ID[q as keyof typeof TYPE_TO_ID] ? (q as keyof typeof TYPE_TO_ID) : DEFAULT_DEVICE_TYPE;
    return DISABLED_DEVICE_TYPES.has(candidate) ? DEFAULT_DEVICE_TYPE : candidate;
  }, [location.search]);

  // If current URL points to a zero-count type and there exists any available type, redirect to the first available
  const selectedId = useMemo(() => TYPE_TO_ID[urlType], [urlType]);
  const availableTypes = (Object.keys(TYPE_TO_ID) as Array<keyof typeof TYPE_TO_ID>).filter(
    (k) =>
      !DISABLED_DEVICE_TYPES.has(k) &&
      getCountForType(inventoryCounts as any, k as any) > 0
  );
  const selectedCount = getCountForType(inventoryCounts as any, urlType as any);

  if (typeof window !== "undefined") {
    const isDisabledType = DISABLED_DEVICE_TYPES.has(urlType);
    const isZero = selectedCount <= 0;
    if ((isDisabledType || isZero) && availableTypes.length > 0) {
      const nextType = availableTypes[0];
      const params = new URLSearchParams(location.search);
      params.set("type", nextType);
      if (siteCode) {
        navigate(
          { pathname: absSite("/devices", siteCode), search: `?${params.toString()}` },
          { replace: true }
        );
      } else {
        navigate(
          { pathname: abs("/devices"), search: `?${params.toString()}` },
          { replace: true }
        );
      }
    }
  }

  // เปลี่ยนการ์ด → อัปเดต URL (เปลี่ยนเฉพาะ search เพื่อลดการกระพริบ)
  const handleChange = (ids: string[]) => {
    const nextId = ids[0];
    const nextType = nextId ? ID_TO_TYPE[nextId] : undefined;
    if (!nextType || nextType === urlType) return;
    if (DISABLED_DEVICE_TYPES.has(nextType as keyof typeof TYPE_TO_ID)) return;

    // ใช้ search แทนการประกอบสตริงเอง เผื่ออนาคตมีพารามอื่น
    const params = new URLSearchParams(location.search);
    params.set("type", nextType);
    if (siteCode) {
      navigate(
        { pathname: absSite("/devices", siteCode), search: `?${params.toString()}` },
        { replace: false }
      );
    } else {
      navigate(
        { pathname: abs("/devices"), search: `?${params.toString()}` },
        { replace: false }
      );
    }
  };

  const effectiveSiteCode =
    siteCode ?? (selectedSite && selectedSite !== "all" ? selectedSite : undefined);
  const currentBillingType = BILLING_TYPE_BY_URL[urlType] ?? null;
  const [billingGuardOpen, setBillingGuardOpen] = useState(false);
  const [siteDeviceGuardOpen, setSiteDeviceGuardOpen] = useState(false);
  const [billingDisabledOpen, setBillingDisabledOpen] = useState(false);
  const [billingAllowed, setBillingAllowed] = useState(false);
  const [billingAccess, setBillingAccess] = useState<SiteBillingAccess | null>(null);
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
  useEffect(() => {
    if (hasSpecificSite && !inventoryLoading && totalDeviceCount <= 0) {
      setSiteDeviceGuardOpen(true);
    } else {
      setSiteDeviceGuardOpen(false);
    }
  }, [hasSpecificSite, inventoryLoading, totalDeviceCount]);
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
      <nav className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6">
        <div className="flex flex-col gap-1 select-none">
          <h1 className="text-2xl font-semibold">{tDevices("nav.title")}</h1>
        </div>

        <div className="gap-2 flex flex-wrap items-center">
          <MiniFiltersBar page="devices" />
          {showBillingButton && (
            <button
              type="button"
              onClick={handleBillingClick}
              disabled={billingButtonDisabled}
              className={[
                "inline-flex h-10 items-center justify-center rounded-md border border-gray-300 px-3 text-sm text-[#414651] font-inter font-bold",
                billingButtonDisabled
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:cursor-pointer focus:bg-gray-50",
              ].join(" ")}
            >
              <span className="truncate flex items-center gap-2">
                <img src={exportImage} alt="" />
                <span className="hidden sm:inline">
                  {tSidebar("menu.billing", { defaultValue: "Billing" })}
                </span>
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* กลุ่มการ์ด: single select */}
      <StatCardGroup
        selectionMode="single"
        activeIds={
          selectedId && !DISABLED_DEVICE_TYPES.has(urlType) && selectedCount > 0
            ? [selectedId]
            : []
        }
        onChange={handleChange}
        className="mt-5"
      >
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {DEVICE_CARDS.map((c) => {
            const type = ID_TO_TYPE[c.id] as keyof typeof TYPE_TO_ID | undefined;
            const countVal = type ? getCountForType(inventoryCounts as any, type as any) : 0;
            const typeDisabled = type ? DISABLED_DEVICE_TYPES.has(type) : false;
            const disabled = typeDisabled || !type || countVal <= 0;
            return (
              <li key={c.id}>
                <StatCard
                  id={c.id}
                  variant="boxWithSwitch"
                  img={c.img}
                  activeImg={c.activeImg}
                  label={tDevices(c.label)}
                  val={countVal}
                  disabled={disabled}
                />
              </li>
            );
          })}
        </ul>
      </StatCardGroup>

      {/* Panel/Table ตาม selectedId (คอมโพเนนต์คงตัว ไม่รี-mount จาก key/state) */}
      {selectedId === "cctv-1" ? (
        <div className="mt-6 rounded-xl bg-white p-8 text-center text-gray-500 border border-dashed border-gray-300">
          {tDevices("cctvDisabled", {
            defaultValue: "CCTV view is temporarily unavailable.",
          })}
        </div>
      ) : selectedId === "intercom-1" ? (
        <div className="flex flex-col gap-3">
          <CCTVPanel />
          <CCTVTable />
        </div>
      ) : selectedId === "water-1" ? (
        <div className="flex flex-col gap-3">
          <WaterMeterPanel siteCode={siteCode} />
          <CCTVTable />
        </div>
      ) : selectedId === "electric-1" ? (
        <div className="mt-6">
          <ElectricMeterPanel siteCode={siteCode} />
          <CCTVTable />
        </div>
      ) : selectedId === "air-1" ? (
        <div className="mt-6">
          <AirPanel siteCode={siteCode} />
          <CCTVTable />
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
    </>
  );
}
