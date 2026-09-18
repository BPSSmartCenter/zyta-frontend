// src/features/electric/energyFlow.ts
//
// Live power flow of a solar + storage system (Sigenergy today, Huawei later) for the
// animated "energy flow" card on the Electric meter page.
//
// Source: GET /sites/{id}/devices?type=electric — every maker device carries a `snapshot`
// written by its poller. For Sigenergy the snapshot looks like (real payload, 2026-09-18):
//   { pvPower: 1.1, gridPower: 0, loadPower: 2.8, batteryPower: -1.7, batterySoc: 99.7,
//     sigenergyStatus: "Normal", capturedAt: "...", dailyPowerGeneration: 14.41,
//     monthlyPowerGeneration: 280.38, lifetimePowerGeneration: 1873.51 }   (kW / % / kWh)
//
// Sign convention (checked against the live numbers: load = pv + grid import + battery discharge):
//   gridPower    < 0 → importing from the grid (grid → home);  > 0 → exporting (home → grid)
//   batteryPower < 0 → discharging (battery → home);           > 0 → charging (home → battery)
import { request } from "../../lib/http";
import { detectCustomerName, detectElectricVendor, type ElectricVendorKey } from "./electricVendor";

export type EnergyFlowSnapshot = {
  deviceId: string;
  name: string;
  /** the customer's installation name from the maker's cloud */
  systemName: string | null;
  vendor: ElectricVendorKey;
  /** kW; null when the poller has not reported the value */
  pvKw: number | null;
  loadKw: number | null;
  gridKw: number | null;
  batteryKw: number | null;
  /** % 0–100 */
  batterySoc: number | null;
  batteryCapacityKwh: number | null;
  pvCapacityKwp: number | null;
  /** maker status ("Normal", "Standby", "Power-off", …) or the device status */
  status: string | null;
  online: boolean;
  capturedAt: string | null;
  todayKwh: number | null;
  monthKwh: number | null;
  lifetimeKwh: number | null;
  /** number of systems folded into this snapshot (1 for a device, n for an aggregate) */
  systems: number;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const str = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
};

const first = (...values: unknown[]): number | null => {
  for (const v of values) {
    const n = num(v);
    if (n !== null) return n;
  }
  return null;
};

/** One device item of GET /sites/{id}/devices → a snapshot, or null when it has no live power data. */
export function snapshotFromDeviceItem(item: unknown): EnergyFlowSnapshot | null {
  const record = asRecord(item);
  const snap = asRecord(record.snapshot);
  const meta = asRecord(record.metadata ?? record.meta);
  const sigen = asRecord(meta.sigenergy);
  const huawei = asRecord(meta.huawei ?? meta.fusionsolar);
  const pvKw = first(snap.pvPower, snap.pv_power, snap.solarPower, snap.activePower);
  const loadKw = first(snap.loadPower, snap.load_power, snap.homePower, snap.usePower);
  const gridKw = first(snap.gridPower, snap.grid_power, snap.meterPower);
  const batteryKw = first(snap.batteryPower, snap.battery_power, snap.chargePower);
  if (pvKw === null && loadKw === null && gridKw === null && batteryKw === null) return null;
  const status = str(snap.sigenergyStatus ?? sigen.status ?? snap.status ?? record.status);
  const deviceStatus = String(record.status ?? "").toLowerCase();
  return {
    deviceId: String(record.id ?? record.deviceId ?? ""),
    name: str(record.name) ?? str(record.modelName) ?? "",
    systemName: detectCustomerName({ meta }) ?? str(snap.systemName),
    vendor: detectElectricVendor({ ...record, meta }),
    pvKw,
    loadKw,
    gridKw,
    batteryKw,
    batterySoc: first(snap.batterySoc, snap.battery_soc, snap.soc),
    batteryCapacityKwh: first(sigen.batteryCapacityKwh, huawei.batteryCapacityKwh, meta.batteryCapacityKwh),
    pvCapacityKwp: first(sigen.pvCapacityKwp, huawei.pvCapacityKwp, meta.pvCapacityKwp),
    status,
    online: deviceStatus === "online",
    capturedAt: str(snap.capturedAt) ?? str(record.timestamp) ?? str(record.lastSeenAt),
    todayKwh: first(snap.dailyPowerGeneration, snap.todayKwh, snap.dayEnergy),
    monthKwh: first(snap.monthlyPowerGeneration, snap.monthKwh),
    lifetimeKwh: first(snap.lifetimePowerGeneration, snap.lifetimeKwh, snap.totalEnergy),
    systems: 1,
  };
}

/** Parse the payload of GET /sites/{id}/devices (`{ devices: [...] }`, `{ items: [...] }` or a bare array). */
export function parseEnergyFlowSnapshots(payload: unknown): EnergyFlowSnapshot[] {
  const record = asRecord(payload);
  const list: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray(record.devices)
      ? (record.devices as unknown[])
      : Array.isArray(record.items)
        ? (record.items as unknown[])
        : Array.isArray(asRecord(record.data).devices)
          ? (asRecord(record.data).devices as unknown[])
          : [];
  const out: EnergyFlowSnapshot[] = [];
  for (const item of list) {
    const snap = snapshotFromDeviceItem(item);
    if (snap && snap.deviceId) out.push(snap);
  }
  return out;
}

export async function fetchEnergyFlowSnapshots(siteIdOrCode: string): Promise<EnergyFlowSnapshot[]> {
  const payload = await request<unknown>(`/sites/${encodeURIComponent(siteIdOrCode)}/devices`, {
    params: { type: "electric" },
  });
  return parseEnergyFlowSnapshots(payload);
}

const sumOrNull = (values: Array<number | null>): number | null => {
  let total = 0;
  let seen = false;
  for (const v of values) {
    if (v === null) continue;
    total += v;
    seen = true;
  }
  return seen ? total : null;
};

/**
 * Fold several systems (one maker, one site or many) into a single flow: powers add up,
 * the state of charge is weighted by battery capacity, the status is the "worst" one.
 */
export function aggregateEnergyFlow(list: EnergyFlowSnapshot[], name: string): EnergyFlowSnapshot | null {
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  let socWeight = 0;
  let socSum = 0;
  let socPlain = 0;
  let socCount = 0;
  let latest: string | null = null;
  for (const s of list) {
    if (s.batterySoc !== null) {
      if (s.batteryCapacityKwh && s.batteryCapacityKwh > 0) {
        socWeight += s.batteryCapacityKwh;
        socSum += s.batterySoc * s.batteryCapacityKwh;
      }
      socPlain += s.batterySoc;
      socCount += 1;
    }
    if (s.capturedAt) {
      const ts = new Date(s.capturedAt).getTime();
      if (Number.isFinite(ts) && (!latest || ts > new Date(latest).getTime())) latest = s.capturedAt;
    }
  }
  const online = list.filter((s) => s.online).length;
  const normal = list.filter((s) => /normal/i.test(s.status || "")).length;
  return {
    deviceId: list.map((s) => s.deviceId).join("+"),
    name,
    systemName: null,
    vendor: list[0].vendor,
    pvKw: sumOrNull(list.map((s) => s.pvKw)),
    loadKw: sumOrNull(list.map((s) => s.loadKw)),
    gridKw: sumOrNull(list.map((s) => s.gridKw)),
    batteryKw: sumOrNull(list.map((s) => s.batteryKw)),
    batterySoc: socWeight > 0 ? socSum / socWeight : socCount ? socPlain / socCount : null,
    batteryCapacityKwh: sumOrNull(list.map((s) => s.batteryCapacityKwh)),
    pvCapacityKwp: sumOrNull(list.map((s) => s.pvCapacityKwp)),
    status: normal === list.length ? "Normal" : online === 0 ? "Offline" : "Mixed",
    online: online > 0,
    capturedAt: latest,
    todayKwh: sumOrNull(list.map((s) => s.todayKwh)),
    monthKwh: sumOrNull(list.map((s) => s.monthKwh)),
    lifetimeKwh: sumOrNull(list.map((s) => s.lifetimeKwh)),
    systems: list.length,
  };
}

export type FlowDirection = "in" | "out" | "none";

/** Which way power moves on each spoke of the diagram, relative to the home (hub). */
export function flowDirections(s: EnergyFlowSnapshot, minKw = 0.01) {
  const pv = s.pvKw ?? 0;
  const grid = s.gridKw ?? 0;
  const battery = s.batteryKw ?? 0;
  return {
    /** solar → home */
    solar: pv > minKw ? ("in" as FlowDirection) : ("none" as FlowDirection),
    /** grid → home when importing, home → grid when exporting */
    grid: grid < -minKw ? ("in" as FlowDirection) : grid > minKw ? ("out" as FlowDirection) : ("none" as FlowDirection),
    /** battery → home when discharging, home → battery when charging */
    battery:
      battery < -minKw ? ("in" as FlowDirection) : battery > minKw ? ("out" as FlowDirection) : ("none" as FlowDirection),
  };
}

/** Share of the load covered by solar right now (0–1), null when the load is unknown or zero. */
export function solarCoverage(s: EnergyFlowSnapshot): number | null {
  if (s.loadKw === null || s.loadKw <= 0 || s.pvKw === null) return null;
  return Math.max(0, Math.min(1, s.pvKw / s.loadKw));
}
