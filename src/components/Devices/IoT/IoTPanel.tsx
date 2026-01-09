import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getIoTDevices, type IoTDevice } from "../../../api/iot";
import { useNavigate, useLocation } from "react-router-dom";

export default function IoTPanel() {
    const { t } = useTranslation("devices");
    const navigate = useNavigate();
    const location = useLocation();
    const [devices, setDevices] = useState<IoTDevice[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getIoTDevices();
                if (mounted) {
                    // Filter for only type "IoT" (inclusive)
                    const filtered = data.filter(d => String(d.type || "").toLowerCase().includes("iot"));
                    setDevices(filtered);
                }
            } catch (err) {
                if (mounted) {
                    setError("Failed to load IoT data");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();
        // Refresh every 3 seconds for real-time updates
        const interval = setInterval(fetchData, 3000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

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
                        {/* Header */}
                        <div className={`grid ${GRID_COLS} bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-4 text-center`}>
                            <div>#</div>
                            <div className="text-left">Name / ID</div>
                            <div>Status</div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-gray-200">
                            {devices.map((device, idx) => {
                                return (
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
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${String(device.status).toLowerCase() === "online" || String(device.status).toLowerCase() === "active"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {device.status || "Unknown"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
