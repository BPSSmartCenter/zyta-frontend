import React from "react";

export type DeviceTypeKey =
  | "cctv"
  | "watermeter"
  | "electricmeter"
  | "airsensor"
  | "intercom"
  | "zyta"
  | "iot"
  | "caregiver";

/**
 * Device counts shown on the dashboard. Every `<type>` has a matching
 * `<type>Online` / `<type>Offline` pair; "offline" means any counted status
 * other than Online (Active, Provisioning, Offline, Maintenance). Deleted and
 * Disabled devices are never counted.
 */
export type DeviceCounts = Partial<{
  cameras: number;
  camerasOnline: number;
  camerasOffline: number;
  intercom: number;
  intercomOnline: number;
  intercomOffline: number;
  waterMeter: number;
  waterMeterOnline: number;
  waterMeterOffline: number;
  electricMeter: number;
  electricOnline: number;
  electricOffline: number;
  airSensor: number;
  airSensorOnline: number;
  airSensorOffline: number;
  zyta: number;
  iot: number;
  iotOnline: number;
  iotOffline: number;
  medical: number;
  medicalOnline: number;
  medicalOffline: number;
  caregiver: number;
  caregiverOffline: number;
}>;

type Ctx = {
  counts: DeviceCounts;
  setCounts: React.Dispatch<React.SetStateAction<DeviceCounts>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const DeviceInventoryContext = React.createContext<Ctx | null>(null);

export function DeviceInventoryProvider({ children }: { children?: React.ReactNode }) {
  const [counts, setCounts] = React.useState<DeviceCounts>({});
  const [loading, setLoading] = React.useState<boolean>(false);

  const value = React.useMemo(() => ({ counts, setCounts, loading, setLoading }), [counts, loading]);
  return (
    <DeviceInventoryContext.Provider value={value}>{children}</DeviceInventoryContext.Provider>
  );
}

export function useDeviceInventory() {
  const ctx = React.useContext(DeviceInventoryContext);
  if (!ctx) {
    return {
      counts: {},
      setCounts: () => { },
      loading: false,
      setLoading: () => { },
    } as unknown as Ctx;
  }
  return ctx;
}

export function getCountForType(map: DeviceCounts, type: DeviceTypeKey): number {
  // Normalize keys between UI routes and counts object
  switch (type) {
    case "cctv":
      return Number(map.cameras ?? 0);
    case "watermeter":
      return Number(map.waterMeter ?? 0);
    case "electricmeter":
      return Number(map.electricMeter ?? 0);
    case "airsensor":
      return Number(map.airSensor ?? 0);
    case "intercom":
      return Number(map.intercom ?? 0);
    case "zyta":
      return Number(map.zyta ?? 0);
    case "iot":
      return Number(map.iot ?? 0);
    case "caregiver":
      return Number(map.caregiver ?? 0);
    default:
      return 0;
  }
}
