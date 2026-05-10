import { API_BASE_URL, api } from "./axios";

// IoT realtime list (`GET /devices?t=`) is NOT listed in the v1 reference —
// only `/devices/{id}/dashboard` and `/devices/{id}/billing-readings` are.
// Pin this to legacy /api regardless of VITE_API_BASE_URL until backend confirms
// a v1 equivalent (or until this consumer is replaced).
const LEGACY_API_BASE = API_BASE_URL.replace(/\/v1\/?$/, "");
const IOT_API_URL = `${LEGACY_API_BASE}/devices`;
export interface IoTDevice {
    id?: string | number;
    deviceId?: string;
    name: string;
    type?: string;
    status?: string;
    value?: string | number;
    ipAddress?: string;
    snapshot?: Record<string, any>;
    timestamp?: string;
    // Add other fields as expected from the API
    [key: string]: any;
}

export async function getIoTDevices(): Promise<IoTDevice[]> {
    try {
        // Add timestamp to prevent caching
        // Override baseURL to empty string so axios doesn't prepend "/api"
        const { data } = await api.get(`${IOT_API_URL}?t=${Date.now()}`, {
            timeout: 5000,
            baseURL: ""
        });
        // console.log("[IoT API] Raw response:", data);
        // Ensure we return an array
        if (Array.isArray(data)) {
            // console.log("[IoT API] Returning array (length):", data.length);
            return data;
        } else if (data && Array.isArray(data.data)) {
            // console.log("[IoT API] Returning data.data (length):", data.data.length);
            return data.data;
        }
        // console.warn("IoT API returned unexpected format:", data);
        return [];
    } catch (error) {
        console.warn("Failed to fetch IoT devices:", error);
        throw error; // Let the caller (component) handle the error state
    }
}
