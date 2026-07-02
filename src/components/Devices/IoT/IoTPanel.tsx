import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getIoTDevices, type IoTDevice } from "../../../features/devices";
import { useNavigate, useLocation } from "react-router-dom";
import { useFilters } from "../../../context/FiltersContext";

type Props = {
  siteCode?: string;
};

export default function IoTPanel({ siteCode }: Props) {
  const { t } = useTranslation("devices");
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedSite, selectedGroupSite, selectedUtility, siteOptions } = useFilters();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopedSiteCode = useMemo(() => {
    const routeSite = String(siteCode || "").trim();
    if (routeSite && routeSite.toLowerCase() !== "all") return routeSite;
    const selected = String(selectedSite || "").trim();
    if (selected && selected.toLowerCase() !== "all") return selected;
    return "";
  }, [siteCode, selectedSite]);

  const queryScope = useMemo(() => {
    const groupId = String(selectedGroupSite?.id || "").trim();
    if (scopedSiteCode) {
      return { siteId: scopedSiteCode, siteGroupId: null as string | null };
    }
    if (groupId) {
      return { siteId: null as string | null, siteGroupId: groupId };
    }
    return { siteId: null as string | null, siteGroupId: null as string | null };
  }, [scopedSiteCode, selectedGroupSite?.id]);

  const allowedSiteIds = useMemo(() => {
    if (scopedSiteCode) return new Set([scopedSiteCode]);
    if (!selectedGroupSite?.id && !selectedUtility?.id) return null;

    const ids = new Set<string>();
    for (const option of siteOptions || []) {
      const value = String(option?.value || "").trim();
      if (!value || value.toLowerCase() === "all") continue;
      if (selectedUtility?.id && option.utilityId !== selectedUtility.id) continue;
      if (selectedGroupSite?.id) {
        if (option.groupId !== selectedGroupSite.id && option.groupLabel !== selectedGroupSite.label) {
          continue;
        }
      }
      ids.add(value);
    }

    return ids;
  }, [scopedSiteCode, selectedGroupSite, selectedUtility, siteOptions]);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getIoTDevices(queryScope);
        if (!mounted) return;

        const filtered = data.filter((device) => {
          if (String(device.type || "").toLowerCase() !== "iot") return false;
          if (!allowedSiteIds) return true;
          const deviceSiteId = String(device.siteId ?? device.siteCode ?? "").trim();
          return deviceSiteId.length > 0 && allowedSiteIds.has(deviceSiteId);
        });

        setDevices(filtered);
      } catch (_err) {
        if (mounted) setError("Failed to load IoT data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [allowedSiteIds, queryScope]);

  const GRID_COLS = "grid-cols-[60px_1fr_100px]";

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm mt-6">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          {t("header.iotCard", { defaultValue: "IoT Devices" })}
        </h2>
      </div>

      {error ? (
        <div className="text-center p-8 text-red-500 bg-red-50 rounded-lg">
          {t("devices.iot.fetchError", { defaultValue: "Unable to load IoT devices" })}
        </div>
      ) : devices.length === 0 && !loading ? (
        <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg">
          {t("devices.iot.noData", { defaultValue: "No IoT devices found" })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <div className="min-w-[600px]">
            <div className={`grid ${GRID_COLS} bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4 text-center`}>
              <div>#</div>
              <div className="text-left">Name / ID</div>
              <div>Status</div>
            </div>

            <div className="divide-y divide-gray-200">
              {devices.map((device, idx) => (
                <div
                  key={device.deviceId || device.id || idx}
                  className={`grid ${GRID_COLS} py-3 px-4 text-sm text-gray-700 items-center text-center hover:bg-gray-50 cursor-pointer transition`}
                  onClick={() => {
                    const params = new URLSearchParams(location.search);
                    params.set("deviceId", String(device.id || device.deviceId));
                    navigate({ search: `?${params.toString()}` });
                  }}
                >
                  <div className="text-gray-500">{idx + 1}</div>
                  <div className="font-medium text-gray-900 text-left truncate" title={device.name}>
                    {device.name || device.deviceId || "-"}
                  </div>
                  <div>
                    <span
                      className={`inline-flex min-w-[112px] items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(() => {
                        const status = String(device.status || '').toLowerCase();
                        if (status === 'online' || status === 'active') return 'bg-green-100 text-green-800';
                        if (status === 'offline') return 'bg-red-100 text-red-800';
                        if (status === 'disabled') return 'bg-slate-100 text-slate-700';
                        if (status === 'provisioning') return 'bg-sky-100 text-sky-700';
                        return 'bg-slate-100 text-slate-700';
                      })()}`}
                    >
                      {device.status || "Unknown"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}