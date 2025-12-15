import axios from "axios";

// Relative URL to use Vite proxy
const IOT_API_URL = "http://203.159.95.162:3000/api/devices";

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
        const { data } = await axios.get(`${IOT_API_URL}?t=${Date.now()}`, { timeout: 5000 });
        // Ensure we return an array
        if (Array.isArray(data)) {
            return data;
        } else if (data && Array.isArray(data.data)) {
            return data.data;
        }
        console.warn("IoT API returned unexpected format:", data);
        return [];
    } catch (error) {
        console.warn("Failed to fetch IoT devices:", error);
        throw error; // Let the caller (component) handle the error state
    }
}
