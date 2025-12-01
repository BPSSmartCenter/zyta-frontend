import React from "react";
import type { SiteRow } from "./site.constant";
import { getSiteDetails } from "../../api/sites";
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

const STATUS_OPTIONS: Array<"online" | "offline" | "maintenance"> = [
  "online",
  "offline",
  "maintenance",
];

function flattenItems(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function toDeviceEntries(
  list: any[],
  type: DeviceTypeKey
): DeviceEntry[] {
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

const DEVICE_SECTIONS: Array<{
  key: DeviceTypeKey;
  label: string;
}> = [
  { key: "electric", label: "Electric Devices" },
  { key: "water", label: "Water Meter Devices" },
  { key: "air", label: "Air Sensor Devices" },
  { key: "camera", label: "CCTV Devices" },
];

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

  const siteKey = siteInfo.id || site.id || site.code;

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
          provinceLabel: s.address_province ?? s.province_code ?? prev.provinceLabel,
          lat: typeof s.lat === "number" ? s.lat : prev.lat,
          lng: typeof s.lng === "number" ? s.lng : prev.lng,
          zipcode: s.zipcode ?? prev.zipcode,
          addressProvince: s.address_province ?? prev.addressProvince,
          addressDistrict: s.address_district ?? prev.addressDistrict,
          addressSubDistrict: s.address_sub ?? prev.addressSubDistrict,
          addressLine: s.address_line ?? prev.addressLine,
          devicesTotal: payload?.counters?.devices_total ?? prev.devicesTotal,
          usersCount: payload?.counters?.users_count ?? prev.usersCount,
        }));
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
      setError("ไม่สามารถดึงข้อมูลล่าสุดได้");
    } finally {
      setLoading(false);
    }
  }, [siteKey]);

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

  const handleDeleteDevice = async (device: DeviceEntry) => {
    if (!siteIdentifier) return;
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(`ยืนยันลบอุปกรณ์ ${device.name}?`);
    if (!confirmed) return;
    try {
      await deleteSiteDevice(siteIdentifier, device.id);
      show({
        variant: "success",
        message: (
          <span className="text-white font-semibold">ลบอุปกรณ์แล้ว</span>
        ),
      });
      loadDetail();
    } catch (err) {
      console.error("[SiteDetail] delete failed", err);
      show({
        variant: "error",
        message: (
          <span className="text-white font-semibold">ลบอุปกรณ์ไม่สำเร็จ</span>
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
      await submitDeviceByType(type, values, siteIdentifier, editingDevice?.id ?? null);
      show({
        variant: "success",
        message: (
          <span className="text-white font-semibold">
            บันทึกข้อมูลอุปกรณ์แล้ว
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
            บันทึกอุปกรณ์ไม่สำเร็จ
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
          Back to list
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadDetail}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            disabled={loading}
          >
            <i className="material-icons-outlined text-base">refresh</i>
            Refresh
          </button>
          <button
            type="button"
            onClick={() => onEdit(siteInfo)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50 cursor-pointer"
          >
            <i className="material-icons-outlined text-base">edit</i>
            Edit site
          </button>
          <button
            type="button"
            onClick={() => onDelete(siteInfo)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-red-200 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <i className="material-icons-outlined text-base">delete</i>
            Delete
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold">{siteInfo.name}</h2>
          <p className="text-sm text-gray-500">Code: {siteInfo.code}</p>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <div>
              <span className="font-semibold">Address:</span>{" "}
              {addressLines || "-"}
            </div>
            <div>
              <span className="font-semibold">Lat / Lng:</span>{" "}
              {formatCoord(siteInfo.lat)} , {formatCoord(siteInfo.lng)}
            </div>
            <div>
              <span className="font-semibold">Zipcode:</span>{" "}
              {siteInfo.zipcode ?? "-"}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-600">
            Summary Stats
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Total devices</div>
              <div className="text-lg font-bold">{siteInfo.devicesTotal}</div>
            </div>
            <div>
              <div className="text-gray-500">Users</div>
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

      <div className="mt-8 space-y-8">
        {DEVICE_SECTIONS.map((section) => (
          <div key={section.key}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{section.label}</h3>
              <button
                type="button"
                onClick={() =>
                  setEditor({ type: section.key, mode: "create" })
                }
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <i className="material-icons-outlined text-sm">add</i>
                Add device
              </button>
            </div>
            {loading ? (
              <div className="text-sm text-gray-500">กำลังโหลด...</div>
            ) : devices[section.key]?.length ? (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2 text-left">Device</th>
                      <th className="px-4 py-2 text-left">Model</th>
                      <th className="px-4 py-2 text-left">Serial</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {devices[section.key].map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {item.model}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {item.serial}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {item.status}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEditor({
                                  type: section.key,
                                  mode: "edit",
                                  device: item,
                                })
                              }
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer"
                            >
                              <i className="material-icons-outlined text-xs">
                                edit
                              </i>
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDevice(item)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <i className="material-icons-outlined text-xs">
                                delete
                              </i>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                ยังไม่มีอุปกรณ์ในหมวดนี้
              </div>
            )}
          </div>
        ))}
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

  if (editingDeviceId) {
    await updateSiteDevice(siteId, editingDeviceId, {
      name: normalizedName,
      status,
      ipAddress: normalizedIp,
      deviceKey: type === "electric" ? undefined : values.deviceKey?.trim(),
      sn: values.sn?.trim(),
      category: type === "electric" ? ((values.category as any) ?? "INVERTER") : undefined,
    });
    return;
  }

  if (type === "electric") {
    await registerElectricDevice({
      siteId,
      category: (values.category as any) || "INVERTER",
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
  const isElectric = type === "electric";
  const [form, setForm] = React.useState<Record<string, string>>({
    category: isElectric ? extractCategory(device?.model) ?? "INVERTER" : "",
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
        setError("กรุณากรอก Serial Number");
        return;
      }
    } else {
      if (!form.deviceKey.trim()) {
        setError("กรุณากรอก Device Key");
        return;
      }
    }
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {device ? "Edit device" : "Add device"} ({type})
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {isElectric ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold block mb-2">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            >
              <option value="INVERTER">INVERTER</option>
              <option value="METER">METER</option>
              <option value="GATEWAY">GATEWAY</option>
              <option value="SENSOR">SENSOR</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-2">SN</label>
            <input
              value={form.sn}
              onChange={(e) => handleChange("sn", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
              placeholder="Serial Number"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="text-sm font-semibold block mb-2">Device key</label>
          <input
            value={form.deviceKey}
            onChange={(e) => handleChange("deviceKey", e.target.value)}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            placeholder="Unique device key"
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold block mb-2">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold block mb-2">
            IP Address
          </label>
          <input
            value={form.ipAddress ?? ""}
            onChange={(e) => handleChange("ipAddress", e.target.value)}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            placeholder="192.168.x.x"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold block mb-2">Name</label>
        <input
          value={form.name ?? ""}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
          placeholder="Friendly name"
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-md bg-cyan text-white text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 cursor-pointer"
        >
          {submitting ? "Saving..." : "Save device"}
        </button>
      </div>
    </form>
  );
}

function extractCategory(model?: string): string | undefined {
  if (!model) return undefined;
  const parts = model.split(":");
  if (parts.length >= 2) return parts[0]?.toUpperCase();
  return undefined;
}

function formatCoord(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(4);
}
