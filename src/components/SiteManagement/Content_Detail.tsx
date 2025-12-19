import React from "react";
import { useTranslation } from "react-i18next";
import type { SiteRow } from "./site.constant";
import { getSiteDetails, updateSiteBillingAccess } from "../../api/sites";
import { registerElectricDevice } from "../../api/electric";
import {
  registerAirSensorDevice,
  registerCctvDevice,
  registerWaterMeterDevice,
  listSiteDevices,
  deleteSiteDevice,
  updateSiteDevice,
  type DeviceTypeKey,
} from "../../api/devices";
import { useToast } from "../../hook/toastProvider";
import type { BillingType, SiteBillingAccess } from "../../types/billing";
import { buildBrandingLogoSrc } from "../../utils/branding";

type Props = {
  site: SiteRow;
  onBack: () => void;
  onEdit: (site: SiteRow) => void;
  onDelete: (site: SiteRow) => void;
};

type DeviceEntry = {
  id: string;
  name: string;
  model: string;
  serial: string;
  status: string;
  type: DeviceTypeKey;
  deviceKey: string;
  ipAddress?: string | null;
};

type DeviceMap = Record<DeviceTypeKey, DeviceEntry[]>;

const DEVICE_TYPES: DeviceTypeKey[] = ["electric", "water", "air", "camera"];

const SECTION_BILLING_TYPE: Partial<Record<DeviceTypeKey, BillingType>> = {
  electric: "electric",
  water: "water",
};

const STATUS_OPTIONS: Array<"online" | "offline" | "maintenance"> = [
  "online",
  "offline",
  "maintenance",
];
const ELECTRIC_CATEGORIES = ["INVERTER", "METER"] as const;
type ElectricCategory = (typeof ELECTRIC_CATEGORIES)[number];

function flattenItems(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function toDeviceEntries(list: any[], type: DeviceTypeKey): DeviceEntry[] {
  return list.map((item, idx) => {
    const meta = (item?.meta ?? {}) as Record<string, any>;
    const details = (meta?.details ?? {}) as Record<string, any>;
    const serial =
      meta?.sn ??
      details?.serialNumber ??
      details?.raw?.serialNumber ??
      details?.raw?.SN ??
      (typeof item?.model === "string"
        ? String(item.model).split(":").pop()
        : "-");
    return {
      id: item?.id ?? `${item?.model ?? "device"}-${idx}`,
      name: details?.name ?? item?.model ?? "-",
      model: item?.model ?? "-",
      serial: serial ? String(serial) : "-",
      status: item?.status ?? "-",
      type,
      deviceKey: item?.model ?? "",
      ipAddress: item?.ip_address ?? null,
    };
  });
}

const DEVICE_SECTIONS: Array<{ key: DeviceTypeKey; label: string }> = [
  { key: "electric", label: "Electric Devices" },
  { key: "water", label: "Water Meter Devices" },
  { key: "air", label: "Air Sensor Devices" },
  { key: "camera", label: "CCTV Devices" },
];

const PAGE_SIZE = 10;

type BillingRateState = {
  baseOnPeak: string;
  baseOffPeak: string;
  discountRate: string;
};

function formatRateInput(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function formatDiscountPercent(value?: number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Number((value * 100).toFixed(4)));
  }
  return "";
}

type DeviceEditorState =
  | {
      type: DeviceTypeKey;
      mode: "create" | "edit";
      device?: DeviceEntry;
    }
  | null;

export default function ContentDetail({
  site,
  onBack,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation("siteManagement");
  const texts = React.useMemo(
    () => ({
      buttons: {
        back: t("detail.buttons.back", { defaultValue: "Back to list" }),
        refresh: t("detail.buttons.refresh", { defaultValue: "Refresh" }),
        edit: t("detail.buttons.edit", { defaultValue: "Edit site" }),
        delete: t("detail.buttons.delete", { defaultValue: "Delete" }),
        addDevice: t("detail.devices.addButton", { defaultValue: "Add device" }),
        enableBilling: t("detail.billing.enable", { defaultValue: "Enable Billing" }),
        saveRates: t("detail.billing.save", { defaultValue: "Save rates" }),
        savingRates: t("detail.billing.saving", { defaultValue: "Saving..." }),
      },
      summary: {
        code: t("detail.summary.code", { defaultValue: "Code:" }),
        address: t("detail.summary.address", { defaultValue: "Address:" }),
        latLng: t("detail.summary.latLng", { defaultValue: "Lat / Lng:" }),
        zipcode: t("detail.summary.zipcode", { defaultValue: "Zipcode:" }),
        title: t("detail.summary.statsTitle", { defaultValue: "Summary Stats" }),
        devices: t("detail.summary.devices", { defaultValue: "Total devices" }),
        users: t("detail.summary.users", { defaultValue: "Users" }),
      },
      statusMessages: {
        loadError: t("detail.errors.load", {
          defaultValue: "Unable to fetch latest data",
        }),
        loadingDevices: t("detail.devices.loading", {
          defaultValue: "Loading...",
        }),
        emptyDevices: t("detail.devices.empty", {
          defaultValue: "No devices in this category",
        }),
      },
      searchPlaceholder: t("detail.devices.searchPlaceholder", {
        defaultValue: "Search name, serial or IP",
      }),
      deviceTabs: {
        electric: t("detail.devices.tabs.electric", {
          defaultValue: "Electric Devices",
        }),
        water: t("detail.devices.tabs.water", {
          defaultValue: "Water Meter Devices",
        }),
        air: t("detail.devices.tabs.air", { defaultValue: "Air Sensor Devices" }),
        camera: t("detail.devices.tabs.camera", { defaultValue: "CCTV Devices" }),
      },
      billing: {
        electricTitle: t("detail.billing.electric.title", {
          defaultValue: "Electric Billing",
        }),
        electricHint: t("detail.billing.electric.hint", {
          defaultValue: "Enter base and discount values before enabling.",
        }),
        waterTitle: t("detail.billing.water.title", {
          defaultValue: "Water Billing",
        }),
        waterHint: t("detail.billing.water.hint", {
          defaultValue: "Enable or disable water billing.",
        }),
        baseOn: t("detail.billing.fields.baseOn", {
          defaultValue: "Base (On Peak) THB/unit",
        }),
        baseOff: t("detail.billing.fields.baseOff", {
          defaultValue: "Base (Off Peak) THB/unit",
        }),
        discount: t("detail.billing.fields.discount", {
          defaultValue: "Discount rate (%) 0-100",
        }),
        discountNote: t("detail.billing.discountNote", {
          defaultValue: "Example: discount 30 = 30% off",
        }),
      },
      table: {
        headers: {
          device: t("detail.devices.table.device", { defaultValue: "Device" }),
          model: t("detail.devices.table.model", { defaultValue: "Model" }),
          serial: t("detail.devices.table.serial", { defaultValue: "Serial" }),
          status: t("detail.devices.table.status", { defaultValue: "Status" }),
          actions: t("detail.devices.table.actions", { defaultValue: "Actions" }),
        },
        actions: {
          edit: t("detail.devices.table.edit", { defaultValue: "Edit" }),
          delete: t("detail.devices.table.delete", { defaultValue: "Delete" }),
          copyId: t("detail.devices.table.copyId", { defaultValue: "Copy ID" }),
        },
      },
      pagination: {
        prev: t("detail.devices.pagination.prev", { defaultValue: "Prev" }),
        next: t("detail.devices.pagination.next", { defaultValue: "Next" }),
        label: (start: number, end: number, total: number) =>
          total === 0
            ? t("detail.devices.pagination.empty", { defaultValue: "0 items" })
            : t("detail.devices.pagination.label", {
                start,
                end,
                total,
                defaultValue: "{{start}}-{{end}} of {{total}} items",
              }),
      },
      toasts: {
        copySuccess: (id: string) =>
          t("detail.devices.copyId.success", {
            id,
            defaultValue: "Copied ID: {{id}}",
          }),
        copyFailed: t("detail.devices.copyId.failed", {
          defaultValue: "Unable to copy Device ID",
        }),
        billingToggleFailed: t("detail.billing.toggleFailed", {
          defaultValue: "Unable to update billing status",
        }),
        billingSaveSuccess: t("detail.billing.saveSuccess", {
          defaultValue: "Billing rates saved",
        }),
        billingSaveFailed: t("detail.billing.saveFailed", {
          defaultValue: "Unable to save billing rates",
        }),
        deviceDeleteSuccess: t("detail.devices.deleteSuccess", {
          defaultValue: "Device deleted",
        }),
        deviceDeleteFailed: t("detail.devices.deleteFailed", {
          defaultValue: "Unable to delete device",
        }),
        deviceSaveSuccess: t("detail.devices.saveSuccess", {
          defaultValue: "Device saved",
        }),
        deviceSaveFailed: t("detail.devices.saveFailed", {
          defaultValue: "Unable to save device",
        }),
      },
      confirm: {
        deleteDevice: (name: string) =>
          t("confirm.deleteDevice", {
            name,
            defaultValue: "Delete device {{name}}?",
          }),
      },
      billingValidation: {
        baseOn: t("detail.billing.validation.baseOn", {
          defaultValue: "Please enter Base (On Peak) greater than 0",
        }),
        baseOff: t("detail.billing.validation.baseOff", {
          defaultValue: "Please enter Base (Off Peak) greater than 0",
        }),
        discount: t("detail.billing.validation.discount", {
          defaultValue: "Discount rate must be between 0 and 100",
        }),
        generic: t("detail.billing.validation.generic", {
          defaultValue: "Please complete billing rates",
        }),
      },
      deviceForm: {
        titleAdd: t("detail.devices.form.titleAdd", { defaultValue: "Add device" }),
        titleEdit: t("detail.devices.form.titleEdit", { defaultValue: "Edit device" }),
        labels: {
          category: t("detail.devices.form.labels.category", { defaultValue: "Category" }),
          sn: t("detail.devices.form.labels.sn", { defaultValue: "SN" }),
          deviceKey: t("detail.devices.form.labels.deviceKey", {
            defaultValue: "Device key",
          }),
          status: t("detail.devices.form.labels.status", { defaultValue: "Status" }),
          ipAddress: t("detail.devices.form.labels.ipAddress", {
            defaultValue: "IP Address",
          }),
          name: t("detail.devices.form.labels.name", { defaultValue: "Name" }),
        },
        placeholders: {
          sn: t("detail.devices.form.placeholders.sn", {
            defaultValue: "Serial Number",
          }),
          deviceKey: t("detail.devices.form.placeholders.deviceKey", {
            defaultValue: "Unique device key",
          }),
          ipAddress: t("detail.devices.form.placeholders.ipAddress", {
            defaultValue: "192.168.x.x",
          }),
          name: t("detail.devices.form.placeholders.name", {
            defaultValue: "Friendly name",
          }),
        },
        errors: {
          snRequired: t("detail.devices.form.errors.snRequired", {
            defaultValue: "Please enter Serial Number",
          }),
          deviceKeyRequired: t("detail.devices.form.errors.deviceKeyRequired", {
            defaultValue: "Please enter Device Key",
          }),
        },
        buttons: {
          cancel: t("form.buttons.cancel", { defaultValue: "Cancel" }),
          submit: t("detail.devices.form.buttons.submit", {
            defaultValue: "Save device",
          }),
          submitting: t("detail.devices.form.buttons.submitting", {
            defaultValue: "Saving...",
          }),
        },
      },
      statuses: {
        online: t("detail.devices.status.online", { defaultValue: "online" }),
        offline: t("detail.devices.status.offline", { defaultValue: "offline" }),
        maintenance: t("detail.devices.status.maintenance", {
          defaultValue: "maintenance",
        }),
      },
    }),
    [t]
  );
  const { show } = useToast();
  const [siteInfo, setSiteInfo] = React.useState<SiteRow>(site);
  const [devices, setDevices] = React.useState<DeviceMap>(() => ({
    electric: [],
    water: [],
    air: [],
    camera: [],
    intercom: [],
  }));
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>("");
  const [editor, setEditor] = React.useState<DeviceEditorState>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [billingPrefs, setBillingPrefs] = React.useState<
    Record<BillingType, boolean>
  >(() => ({
    electric: Boolean(site.allowElectricBilling),
    water: Boolean(site.allowWaterBilling),
  }));
  const [billingSaving, setBillingSaving] = React.useState<
    Record<BillingType, boolean>
  >({
    electric: false,
    water: false,
  });
  const [billingRates, setBillingRates] = React.useState<BillingRateState>(() => ({
    baseOnPeak: formatRateInput(site.billingOnPeakRate ?? null),
    baseOffPeak: formatRateInput(site.billingOffPeakRate ?? null),
    discountRate: formatDiscountPercent(site.billingDiscountRate ?? null),
  }));
  const [billingConfigSaving, setBillingConfigSaving] = React.useState(false);
  const [activeDeviceType, setActiveDeviceType] = React.useState<DeviceTypeKey>(
    DEVICE_SECTIONS[0]?.key ?? "electric"
  );
  const [deviceSearch, setDeviceSearch] = React.useState("");
  const [devicePage, setDevicePage] = React.useState(1);
  const deviceSections = React.useMemo(
    () => [
      { key: "electric" as DeviceTypeKey, label: texts.deviceTabs.electric },
      { key: "water" as DeviceTypeKey, label: texts.deviceTabs.water },
      { key: "air" as DeviceTypeKey, label: texts.deviceTabs.air },
      { key: "camera" as DeviceTypeKey, label: texts.deviceTabs.camera },
    ],
    [texts.deviceTabs]
  );

  const siteKey = siteInfo.id || site.id || site.code;
  const activeDevices = React.useMemo(
    () => devices[activeDeviceType] ?? [],
    [devices, activeDeviceType]
  );
  const filteredDevices = React.useMemo(() => {
    if (!deviceSearch.trim()) return activeDevices;
    const term = deviceSearch.toLowerCase();
    return activeDevices.filter((device) => {
      return (
        device.name.toLowerCase().includes(term) ||
        device.model.toLowerCase().includes(term) ||
        device.serial.toLowerCase().includes(term) ||
        (device.ipAddress ?? "").toLowerCase().includes(term)
      );
    });
  }, [activeDevices, deviceSearch]);
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(filteredDevices.length, 1) / PAGE_SIZE)
  );
  React.useEffect(() => {
    const nextMax = Math.max(
      1,
      Math.ceil(Math.max(filteredDevices.length, 1) / PAGE_SIZE)
    );
    if (devicePage > nextMax) {
      setDevicePage(nextMax);
    }
  }, [filteredDevices.length, devicePage]);
  const paginatedDevices = React.useMemo(() => {
    const start = (devicePage - 1) * PAGE_SIZE;
    return filteredDevices.slice(start, start + PAGE_SIZE);
  }, [filteredDevices, devicePage]);
  const paginationLabel = React.useMemo(() => {
    if (filteredDevices.length === 0) return texts.pagination.label(0, 0, 0);
    const start = (devicePage - 1) * PAGE_SIZE + 1;
    const end = Math.min(filteredDevices.length, devicePage * PAGE_SIZE);
    return texts.pagination.label(start, end, filteredDevices.length);
  }, [filteredDevices.length, devicePage, texts.pagination]);
  const activeBillingType = SECTION_BILLING_TYPE[activeDeviceType];
  const brandingLogoSrc = React.useMemo(
    () => buildBrandingLogoSrc(siteInfo.brandingLogoUrl ?? null),
    [siteInfo.brandingLogoUrl]
  );

  const loadDetail = React.useCallback(async () => {
    if (!siteKey) return;
    setLoading(true);
    setError("");
    try {
      const detailPromise = getSiteDetails(siteKey);
      const devicePromises = DEVICE_TYPES.map(async (type) => {
        const res = await listSiteDevices(siteKey, type);
        return [type, toDeviceEntries(flattenItems(res), type)] as const;
      });

      const [detailRes, deviceResults] = await Promise.all([
        detailPromise,
        Promise.all(devicePromises),
      ]);

      const payload = (detailRes as any)?.data ?? detailRes;
      const s = payload?.site ?? payload;
      if (s) {
        setSiteInfo((prev) => ({
          ...prev,
          name: s.name ?? prev.name,
          code: s.code ?? prev.code,
          provinceLabel:
            s.address_province ?? s.province_code ?? prev.provinceLabel,
          lat: typeof s.lat === "number" ? s.lat : prev.lat,
          lng: typeof s.lng === "number" ? s.lng : prev.lng,
          zipcode: s.zipcode ?? prev.zipcode,
          addressProvince: s.address_province ?? prev.addressProvince,
          addressDistrict: s.address_district ?? prev.addressDistrict,
          addressSubDistrict: s.address_sub ?? prev.addressSubDistrict,
          addressLine: s.address_line ?? prev.addressLine,
          devicesTotal: payload?.counters?.devices_total ?? prev.devicesTotal,
          usersCount: payload?.counters?.users_count ?? prev.usersCount,
          allowElectricBilling:
            typeof s.allowElectricBilling === "boolean"
              ? s.allowElectricBilling
              : prev.allowElectricBilling,
          allowWaterBilling:
            typeof s.allowWaterBilling === "boolean"
              ? s.allowWaterBilling
              : prev.allowWaterBilling,
          billingOnPeakRate:
            typeof s.billingOnPeakRate === "number"
              ? s.billingOnPeakRate
              : prev.billingOnPeakRate,
          billingOffPeakRate:
            typeof s.billingOffPeakRate === "number"
              ? s.billingOffPeakRate
              : prev.billingOffPeakRate,
          billingDiscountRate:
            typeof s.billingDiscountRate === "number"
              ? s.billingDiscountRate
              : prev.billingDiscountRate,
        }));
        setBillingPrefs({
          electric: Boolean(
            s.allowElectricBilling ?? site.allowElectricBilling ?? false
          ),
          water: Boolean(
            s.allowWaterBilling ?? site.allowWaterBilling ?? false
          ),
        });
        setBillingRates({
          baseOnPeak: formatRateInput(
            (s as any).billingOnPeakRate ?? site.billingOnPeakRate ?? null
          ),
          baseOffPeak: formatRateInput(
            (s as any).billingOffPeakRate ?? site.billingOffPeakRate ?? null
          ),
          discountRate: formatDiscountPercent(
            (s as any).billingDiscountRate ?? site.billingDiscountRate ?? null
          ),
        });
      }

      const nextDevices: DeviceMap = {
        electric: [],
        water: [],
        air: [],
        camera: [],
        intercom: [],
      };
      deviceResults.forEach(([type, list]) => {
        nextDevices[type] = list;
      });
      setDevices(nextDevices);
    } catch (err) {
      console.error("[SiteDetail] load failed", err);
      setError(texts.statusMessages.loadError);
    } finally {
      setLoading(false);
    }
  }, [siteKey, texts.statusMessages.loadError]);

  React.useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const addressLines = [
    siteInfo.addressLine,
    siteInfo.addressSubDistrict,
    siteInfo.addressDistrict,
    siteInfo.addressProvince,
    siteInfo.zipcode,
  ]
    .filter((v) => typeof v === "string" && v.trim().length > 0)
    .join(", ");

  const siteIdentifier = siteInfo.id || site.id || site.code || "";

  const handleShowDeviceId = React.useCallback(
    async (device: DeviceEntry) => {
      if (!device?.id) return;
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(device.id);
        }
        show({
          variant: "normal",
          message: (
            <span className="font-semibold text-gray-900">
              {texts.toasts.copySuccess(device.id)}
            </span>
          ),
        });
      } catch (err) {
        console.error("[SiteDetail] copy device id failed", err);
        show({
          variant: "error",
          message: (
            <span className="text-white font-semibold">
              {texts.toasts.copyFailed}
            </span>
          ),
        });
      }
    },
    [show, texts.toasts]
  );

  const handleRateInputChange =
    (key: keyof BillingRateState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setBillingRates((prev) => ({ ...prev, [key]: value }));
    };

  const handleDeviceTabChange = (type: DeviceTypeKey) => {
    setActiveDeviceType(type);
    setDeviceSearch("");
    setDevicePage(1);
  };

  const handleDeviceSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDeviceSearch(event.target.value);
    setDevicePage(1);
  };

  const applyBillingResponse = React.useCallback(
    (data: SiteBillingAccess) => {
      setBillingPrefs({
        electric: Boolean(data.allowElectricBilling),
        water: Boolean(data.allowWaterBilling),
      });
      setBillingRates({
        baseOnPeak: formatRateInput(data.billingOnPeakRate),
        baseOffPeak: formatRateInput(data.billingOffPeakRate),
        discountRate: formatDiscountPercent(data.billingDiscountRate),
      });
      setSiteInfo((prev) => ({
        ...prev,
        allowElectricBilling: Boolean(data.allowElectricBilling),
        allowWaterBilling: Boolean(data.allowWaterBilling),
        billingOnPeakRate: data.billingOnPeakRate,
        billingOffPeakRate: data.billingOffPeakRate,
        billingDiscountRate: data.billingDiscountRate,
      }));
    },
    []
  );

  const validateBillingRates = React.useCallback(() => {
    const onPeak = Number(billingRates.baseOnPeak);
    if (!Number.isFinite(onPeak) || onPeak <= 0) {
      return { ok: false, message: texts.billingValidation.baseOn };
    }
    const offPeak = Number(billingRates.baseOffPeak);
    if (!Number.isFinite(offPeak) || offPeak <= 0) {
      return { ok: false, message: texts.billingValidation.baseOff };
    }
    const discountPercent = Number(billingRates.discountRate);
    if (
      !Number.isFinite(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      return {
        ok: false,
        message: texts.billingValidation.discount,
      };
    }
    return {
      ok: true,
      values: {
        billingOnPeakRate: Number(onPeak.toFixed(4)),
        billingOffPeakRate: Number(offPeak.toFixed(4)),
        billingDiscountRate: Number((discountPercent / 100).toFixed(4)),
      },
    };
  }, [billingRates, texts.billingValidation]);

  const handleBillingToggle = async (type: BillingType, next: boolean) => {
    if (!siteIdentifier) return;
    let pendingElectricRates: {
      billingOnPeakRate: number;
      billingOffPeakRate: number;
      billingDiscountRate: number;
    } | null = null;
    if (type === "electric" && next) {
      const validation = validateBillingRates();
      if (!validation.ok || !validation.values) {
        setBillingPrefs((prev) => ({ ...prev, [type]: false }));
        show({
          variant: "error",
          message: (
            <span className="text-white font-semibold">
              {validation.message ?? texts.billingValidation.generic}
            </span>
          ),
        });
        return;
      }
      pendingElectricRates = validation.values;
    }
    setBillingPrefs((prev) => ({ ...prev, [type]: next }));
    setBillingSaving((prev) => ({ ...prev, [type]: true }));
    try {
      let payload: Record<string, any> = {};
      if (type === "electric") {
        payload.allowElectricBilling = next;
        if (next && pendingElectricRates) {
          payload = { ...payload, ...pendingElectricRates };
        }
      } else if (type === "water") {
        payload.allowWaterBilling = next;
      }
      if (Object.keys(payload).length === 0) return;
      const data = await updateSiteBillingAccess(siteIdentifier, payload);
      applyBillingResponse(data);
    } catch (err) {
      console.error("[SiteDetail] billing toggle failed", err);
      setBillingPrefs((prev) => ({ ...prev, [type]: !next }));
      show({
        variant: "error",
        message: (
          <span className="text-white font-semibold">
            {texts.toasts.billingToggleFailed}
          </span>
        ),
      });
    } finally {
      setBillingSaving((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSaveBillingConfig = async () => {
    if (!siteIdentifier) return;
    const validation = validateBillingRates();
    if (!validation.ok || !validation.values) {
      show({
        variant: "error",
        message: (
          <span className="text-white font-semibold">
            {validation.message ?? texts.billingValidation.generic}
          </span>
        ),
      });
      return;
    }
    setBillingConfigSaving(true);
    try {
      const data = await updateSiteBillingAccess(siteIdentifier, validation.values);
      applyBillingResponse(data);
      show({
        variant: "success",
        message: (
          <span className="text-white font-semibold">
            {texts.toasts.billingSaveSuccess}
          </span>
        ),
      });
    } catch (err) {
      console.error("[SiteDetail] save billing config failed", err);
      show({
        variant: "error",
        message: (
          <span className="text-white font-semibold">
            {texts.toasts.billingSaveFailed}
          </span>
        ),
      });
    } finally {
      setBillingConfigSaving(false);
    }
  };

  const handleDeleteDevice = async (device: DeviceEntry) => {
    if (!siteIdentifier) return;
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(texts.confirm.deleteDevice(device.name));
    if (!confirmed) return;
    try {
      await deleteSiteDevice(siteIdentifier, device.id);
      show({
        variant: "success",
        message: (
          <span className="text-white font-semibold">
            {texts.toasts.deviceDeleteSuccess}
          </span>
        ),
      });
      loadDetail();
    } catch (err) {
      console.error("[SiteDetail] delete failed", err);
      show({
        variant: "error",
        message: (
          <span className="text-white font-semibold">
            {texts.toasts.deviceDeleteFailed}
          </span>
        ),
      });
    }
  };

  const handleSubmitDevice = async (
    type: DeviceTypeKey,
    values: Record<string, any>,
    editingDevice: DeviceEntry | null
  ) => {
    if (!siteIdentifier) return;
    setSubmitting(true);
    try {
      await submitDeviceByType(
        type,
        values,
        siteIdentifier,
        editingDevice?.id ?? null
      );
      show({
        variant: "success",
        message: (
          <span className="text-white font-semibold">
            {texts.toasts.deviceSaveSuccess}
          </span>
        ),
      });
      setEditor(null);
      loadDetail();
    } catch (err) {
      console.error("[SiteDetail] register device failed", err);
      show({
        variant: "error",
        message: (
          <span className="text-white font-semibold">
            {texts.toasts.deviceSaveFailed}
          </span>
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 p-6 bg-white rounded-lg">
      <div className="flex items-center justify-between pb-4 border-b">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          <i className="material-icons-outlined text-base">arrow_back</i>
          {texts.buttons.back}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadDetail}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            disabled={loading}
          >
            <i className="material-icons-outlined text-base">refresh</i>
            {texts.buttons.refresh}
          </button>
          <button
            type="button"
            onClick={() => onEdit(siteInfo)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50 cursor-pointer"
          >
            <i className="material-icons-outlined text-base">edit</i>
            {texts.buttons.edit}
          </button>
          <button
            type="button"
            onClick={() => onDelete(siteInfo)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-red-200 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <i className="material-icons-outlined text-base">delete</i>
            {texts.buttons.delete}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold">{siteInfo.name}</h2>
          <p className="text-sm text-gray-500">
            {texts.summary.code} {siteInfo.code}
          </p>
          {brandingLogoSrc && (
            <div className="mt-4 flex justify-start">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <img
                  src={brandingLogoSrc}
                  alt="Site branding"
                  className="h-20 w-32 object-contain"
                />
              </div>
            </div>
          )}
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <div>
              <span className="font-semibold">{texts.summary.address}</span>{" "}
              {addressLines || "-"}
            </div>
            <div>
              <span className="font-semibold">{texts.summary.latLng}</span>{" "}
              {formatCoord(siteInfo.lat)} , {formatCoord(siteInfo.lng)}
            </div>
            <div>
              <span className="font-semibold">{texts.summary.zipcode}</span>{" "}
              {siteInfo.zipcode ?? "-"}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-600">
            {texts.summary.title}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">{texts.summary.devices}</div>
              <div className="text-lg font-bold">{siteInfo.devicesTotal}</div>
            </div>
            <div>
              <div className="text-gray-500">{texts.summary.users}</div>
              <div className="text-lg font-bold">{siteInfo.usersCount}</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {editor && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <DeviceForm
            type={editor.type}
            device={editor.device}
            submitting={submitting}
            onCancel={() => setEditor(null)}
            onSubmit={(values) =>
              handleSubmitDevice(editor.type, values, editor.device ?? null)
            }
          />
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {deviceSections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => handleDeviceTabChange(section.key)}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-semibold transition",
                activeDeviceType === section.key
                  ? "bg-[#e0f6ff] text-[#006494]"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200",
              ].join(" ")}
            >
              {section.label}
              <span className="ml-2 text-xs font-normal text-gray-400">
                {devices[section.key]?.length ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
            <i className="material-icons-outlined text-base text-gray-400">
              search
            </i>
            <input
              type="text"
              placeholder={texts.searchPlaceholder}
              className="flex-1 border-none bg-transparent text-sm text-gray-700 outline-none"
              value={deviceSearch}
              onChange={handleDeviceSearchChange}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              setEditor({ type: activeDeviceType, mode: "create" })
            }
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <i className="material-icons-outlined text-base">add</i>
            {texts.buttons.addDevice}
          </button>
        </div>

        {activeBillingType === "electric" && (
          <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-cyan-900">
                  {texts.billing.electricTitle}
                </h4>
                <p className="text-xs text-cyan-900/70">
                  {texts.billing.electricHint}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-cyan-900 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={billingPrefs.electric}
                  disabled={billingSaving.electric}
                  onChange={(e) =>
                    handleBillingToggle("electric", e.target.checked)
                  }
                />
                <span>{texts.buttons.enableBilling}</span>
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="text-xs font-semibold text-cyan-900">
                {texts.billing.baseOn}
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className="mt-1 w-full rounded-xl border border-cyan-100 bg-white p-2 text-sm text-gray-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  value={billingRates.baseOnPeak}
                  onChange={handleRateInputChange("baseOnPeak")}
                />
              </label>
              <label className="text-xs font-semibold text-cyan-900">
                {texts.billing.baseOff}
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className="mt-1 w-full rounded-xl border border-cyan-100 bg-white p-2 text-sm text-gray-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  value={billingRates.baseOffPeak}
                  onChange={handleRateInputChange("baseOffPeak")}
                />
              </label>
              <label className="text-xs font-semibold text-cyan-900">
                {texts.billing.discount}
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="mt-1 w-full rounded-xl border border-cyan-100 bg-white p-2 text-sm text-gray-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  value={billingRates.discountRate}
                  onChange={handleRateInputChange("discountRate")}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-cyan-900/70">
              <button
                type="button"
                onClick={handleSaveBillingConfig}
                disabled={billingConfigSaving}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white transition",
                  billingConfigSaving
                    ? "bg-cyan-200 cursor-not-allowed"
                    : "bg-cyan-500 hover:bg-cyan-600",
                ].join(" ")}
              >
                {billingConfigSaving
                  ? texts.buttons.savingRates
                  : texts.buttons.saveRates}
              </button>
              <span>{texts.billing.discountNote}</span>
            </div>
          </div>
        )}

        {activeBillingType === "water" && (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-blue-900">
                  {texts.billing.waterTitle}
                </h4>
                <p className="text-xs text-blue-900/70">
                  {texts.billing.waterHint}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-blue-900 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={billingPrefs.water}
                  disabled={billingSaving.water}
                  onChange={(e) =>
                    handleBillingToggle("water", e.target.checked)
                  }
                />
                <span>{texts.buttons.enableBilling}</span>
              </label>
            </div>
          </div>
        )}

        <div className="mt-5 overflow-x-auto rounded-lg border border-gray-100">
          {loading ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              {texts.statusMessages.loadingDevices}
            </div>
          ) : paginatedDevices.length ? (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">{texts.table.headers.device}</th>
                  <th className="px-4 py-2 text-left">{texts.table.headers.model}</th>
                  <th className="px-4 py-2 text-left">{texts.table.headers.serial}</th>
                  <th className="px-4 py-2 text-left">{texts.table.headers.status}</th>
                  <th className="px-4 py-2 text-left">{texts.table.headers.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDevices.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{item.model}</td>
                    <td className="px-4 py-2 text-gray-700">{item.serial}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {texts.statuses[item.status as keyof typeof texts.statuses] ??
                        item.status}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditor({
                              type: activeDeviceType,
                              mode: "edit",
                              device: item,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-xs transition hover:bg-gray-50"
                        >
                          <i className="material-icons-outlined text-xs">
                            edit
                          </i>
                          {texts.table.actions.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDevice(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 transition hover:bg-red-50"
                        >
                          <i className="material-icons-outlined text-xs">
                            delete
                          </i>
                          {texts.table.actions.delete}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShowDeviceId(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-3 py-1 text-xs text-blue-600 transition hover:bg-blue-50"
                        >
                          <i className="material-icons-outlined text-xs">
                            content_copy
                          </i>
                          {texts.table.actions.copyId}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-6 text-sm text-gray-500">
              {texts.statusMessages.emptyDevices}
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-gray-600">
          <span>{paginationLabel}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setDevicePage((prev) => Math.max(1, prev - 1))
              }
              disabled={devicePage <= 1}
              className={[
                "rounded-md px-3 py-1 font-semibold transition",
                devicePage <= 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300",
              ].join(" ")}
            >
              {texts.pagination.prev}
            </button>
            <button
              type="button"
              onClick={() =>
                setDevicePage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={devicePage >= totalPages}
              className={[
                "rounded-md px-3 py-1 font-semibold transition",
                devicePage >= totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300",
              ].join(" ")}
            >
              {texts.pagination.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function submitDeviceByType(
  type: DeviceTypeKey,
  values: Record<string, any>,
  siteId: string,
  editingDeviceId: string | null
) {
  const normalizedIp =
    typeof values.ipAddress === "string" && values.ipAddress.trim().length > 0
      ? values.ipAddress.trim()
      : null;
  const status =
    (values.status as "online" | "offline" | "maintenance") ?? "online";
  const normalizedName =
    typeof values.name === "string" && values.name.trim().length > 0
      ? values.name.trim()
      : undefined;
  const electricCategory = normalizeElectricCategory(values.category);

  if (editingDeviceId) {
    await updateSiteDevice(siteId, editingDeviceId, {
      name: normalizedName,
      status,
      ipAddress: normalizedIp,
      deviceKey: type === "electric" ? undefined : values.deviceKey?.trim(),
      sn: values.sn?.trim(),
      category: type === "electric" ? electricCategory : undefined,
    });
    return;
  }

  if (type === "electric") {
    await registerElectricDevice({
      siteId,
      category: electricCategory,
      sn: values.sn,
      ipAddress: normalizedIp ?? undefined,
      status,
      name: normalizedName,
    });
    return;
  }

  const payload = {
    siteId,
    deviceKey: values.deviceKey,
    sn: values.sn || undefined,
    ipAddress: normalizedIp ?? undefined,
    status,
    name: normalizedName,
  };

  if (type === "camera") {
    await registerCctvDevice(payload);
  } else if (type === "water") {
    await registerWaterMeterDevice(payload);
  } else if (type === "air") {
    await registerAirSensorDevice(payload);
  }
}

type DeviceFormProps = {
  type: DeviceTypeKey;
  device?: DeviceEntry;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

function DeviceForm({
  type,
  device,
  submitting,
  onCancel,
  onSubmit,
}: DeviceFormProps) {
  const { t } = useTranslation("siteManagement");
  const texts = React.useMemo(
    () => ({
      title: device
        ? t("detail.devices.form.titleEdit", { defaultValue: "Edit device" })
        : t("detail.devices.form.titleAdd", { defaultValue: "Add device" }),
      typeLabel: t(`detail.devices.tabs.${type}`, {
        defaultValue: type,
      }),
      labels: {
        category: t("detail.devices.form.labels.category", { defaultValue: "Category" }),
        sn: t("detail.devices.form.labels.sn", { defaultValue: "SN" }),
        deviceKey: t("detail.devices.form.labels.deviceKey", {
          defaultValue: "Device key",
        }),
        status: t("detail.devices.form.labels.status", { defaultValue: "Status" }),
        ipAddress: t("detail.devices.form.labels.ipAddress", {
          defaultValue: "IP Address",
        }),
        name: t("detail.devices.form.labels.name", { defaultValue: "Name" }),
      },
      placeholders: {
        sn: t("detail.devices.form.placeholders.sn", {
          defaultValue: "Serial Number",
        }),
        deviceKey: t("detail.devices.form.placeholders.deviceKey", {
          defaultValue: "Unique device key",
        }),
        ipAddress: t("detail.devices.form.placeholders.ipAddress", {
          defaultValue: "192.168.x.x",
        }),
        name: t("detail.devices.form.placeholders.name", {
          defaultValue: "Friendly name",
        }),
      },
      errors: {
        snRequired: t("detail.devices.form.errors.snRequired", {
          defaultValue: "Please enter Serial Number",
        }),
        deviceKeyRequired: t("detail.devices.form.errors.deviceKeyRequired", {
          defaultValue: "Please enter Device Key",
        }),
      },
      buttons: {
        cancel: t("form.buttons.cancel", { defaultValue: "Cancel" }),
        submit: t("detail.devices.form.buttons.submit", {
          defaultValue: "Save device",
        }),
        submitting: t("detail.devices.form.buttons.submitting", {
          defaultValue: "Saving...",
        }),
      },
      statusOptions: STATUS_OPTIONS.map((opt) => ({
        value: opt,
        label: t(`detail.devices.status.${opt}`, { defaultValue: opt }),
      })),
    }),
    [device, t, type]
  );
  const isElectric = type === "electric";
  const defaultCategory = normalizeElectricCategory(
    extractCategory(device?.model)
  );
  const [form, setForm] = React.useState<Record<string, string>>({
    category: isElectric ? defaultCategory : "",
    sn: device?.serial ?? "",
    status: (device?.status as any) ?? "online",
    name: device?.name ?? "",
    deviceKey: device?.deviceKey ?? "",
    ipAddress: device?.ipAddress ?? "",
  });
  const [error, setError] = React.useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isElectric) {
      if (!form.sn.trim()) {
        setError(texts.errors.snRequired);
        return;
      }
    } else {
      if (!form.deviceKey.trim()) {
        setError(texts.errors.deviceKeyRequired);
        return;
      }
    }
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {texts.title} ({texts.typeLabel})
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer"
        >
          {texts.buttons.cancel}
        </button>
      </div>

      {isElectric ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold block mb-2">
              {texts.labels.category}
            </label>
            <select
              value={form.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            >
              {ELECTRIC_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-2">
              {texts.labels.sn}
            </label>
            <input
              value={form.sn}
              onChange={(e) => handleChange("sn", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
              placeholder={texts.placeholders.sn}
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="text-sm font-semibold block mb-2">
            {texts.labels.deviceKey}
          </label>
          <input
            value={form.deviceKey}
            onChange={(e) => handleChange("deviceKey", e.target.value)}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            placeholder={texts.placeholders.deviceKey}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold block mb-2">
            {texts.labels.status}
          </label>
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
          >
            {texts.statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold block mb-2">
            {texts.labels.ipAddress}
          </label>
          <input
            value={form.ipAddress ?? ""}
            onChange={(e) => handleChange("ipAddress", e.target.value)}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            placeholder={texts.placeholders.ipAddress}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold block mb-2">
          {texts.labels.name}
        </label>
        <input
          value={form.name ?? ""}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
          placeholder={texts.placeholders.name}
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 cursor-pointer"
        >
          {texts.buttons.cancel}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-md bg-cyan text-white text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 cursor-pointer"
        >
          {submitting ? texts.buttons.submitting : texts.buttons.submit}
        </button>
      </div>
    </form>
  );
}

function normalizeElectricCategory(value: unknown): ElectricCategory {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (
      normalized === "INVERTER" ||
      normalized === "METER"
    ) {
      return normalized as ElectricCategory;
    }
  }
  return "INVERTER";
}

function extractCategory(model?: string): ElectricCategory | undefined {
  if (!model) return undefined;
  const candidate = model.split(":")[0];
  const normalized = candidate?.trim().toUpperCase();
  if (
    normalized === "INVERTER" ||
    normalized === "METER"
  ) {
    return normalized as ElectricCategory;
  }
  return undefined;
}

function formatCoord(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(4);
}
