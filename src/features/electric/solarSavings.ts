// src/features/electric/solarSavings.ts
//
// "ค่าประหยัดไฟที่ใช้ได้จริง" — what a site's solar systems really saved on the utility bill.
//
//   saving (THB) = self-consumed solar (kWh) × utility rate (THB/kWh)
//   self-consumed = generated − exported to the grid
//
// Only energy the customer used in place of grid power is worth the utility rate; kWh that
// went out to the grid is not a saving on the bill. The rate comes from Site Management
// (on-peak / off-peak / Ft): weekdays are billed at the on-peak rate, weekends at off-peak.
// Solar output falls almost entirely inside the 09:00–22:00 on-peak window on weekdays, and
// the daily rollups the backend serves do not carry an intra-day split, so this is the
// closest split the data allows. Thai public holidays (off-peak all day) are not modelled.
//
// Data: `GET /sites/{id}/electric/equipment/{sn}/data` — cumulative `totalEnergy` (Wh) per
// point, half-hourly for today and one rollup per past day. A cumulative export counter is
// read from `exportEnergy` (Wh) on the same points when the backend adds it; until then the
// export is unknown and the saving is an upper bound ("ประมาณการ"), flagged by hasExportData.

import { fetchEquipmentTelemetry } from "./electricApi";
import {
  detectCustomerName,
  detectElectricVendor,
  isSolarVendor,
  type ElectricVendorKey,
} from "./electricVendor";

export type SolarTariff = {
  onPeakRate: number | null;
  offPeakRate: number | null;
  ftRate: number | null;
};

export type SolarDeviceRef = {
  /** CoreGrid device id */
  id: string;
  sn: string;
  label: string;
  vendor: ElectricVendorKey;
  customerName: string | null;
  category: "INVERTER" | "METER" | "GATEWAY" | "SENSOR";
  siteIdOrCode: string;
  status: string | null;
};

export type DailyEnergy = {
  /** local calendar day, YYYY-MM-DD */
  key: string;
  date: Date;
  productionKwh: number;
  /** null when the backend sends no export counter */
  exportKwh: number | null;
};

export type SavingsPeriod = {
  productionKwh: number;
  exportKwh: number;
  selfConsumedKwh: number;
  savingsThb: number;
  /** false → exportKwh is 0 by assumption, so the saving is an upper bound */
  hasExportData: boolean;
  days: number;
};

export type DeviceSolarSavings = {
  device: SolarDeviceRef;
  month: SavingsPeriod;
  ytd: SavingsPeriod;
  lifetimeProductionKwh: number | null;
  daily: DailyEnergy[];
};

export type MonthlySolarSavings = SavingsPeriod & {
  /** YYYY-MM */
  key: string;
  year: number;
  month: number;
};

export type SiteSolarSavings = {
  siteIdOrCode: string;
  devices: DeviceSolarSavings[];
  month: SavingsPeriod;
  ytd: SavingsPeriod;
  monthly: MonthlySolarSavings[];
  tariff: SolarTariff;
  ratesConfigured: boolean;
  fetchedAt: number;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const formatForApi = (d: Date) =>
  `${dayKey(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

export function tariffFromSiteBilling(billing: unknown): SolarTariff {
  const b = (billing ?? {}) as Record<string, unknown>;
  return {
    onPeakRate: toNumber(b.onPeakRate ?? b.billingOnPeakRate),
    offPeakRate: toNumber(b.offPeakRate ?? b.billingOffPeakRate),
    ftRate: toNumber(b.ftRate ?? b.billingFtRate),
  };
}

export const isTariffConfigured = (tariff: SolarTariff): boolean =>
  (tariff.onPeakRate ?? 0) > 0 || (tariff.offPeakRate ?? 0) > 0;

/** THB per kWh a customer avoids paying on this day (energy rate + Ft). */
export function rateForDay(date: Date, tariff: SolarTariff): number {
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const onPeak = tariff.onPeakRate ?? tariff.offPeakRate ?? 0;
  const offPeak = tariff.offPeakRate ?? tariff.onPeakRate ?? 0;
  const energyRate = weekend ? offPeak : onPeak;
  return Math.max(0, energyRate) + Math.max(0, tariff.ftRate ?? 0);
}

export function savingsForDays(days: DailyEnergy[], tariff: SolarTariff): SavingsPeriod {
  let productionKwh = 0;
  let exportKwh = 0;
  let selfConsumedKwh = 0;
  let savingsThb = 0;
  let hasExportData = days.length > 0;
  for (const day of days) {
    const production = Math.max(0, day.productionKwh);
    const exported = day.exportKwh === null ? 0 : Math.min(production, Math.max(0, day.exportKwh));
    if (day.exportKwh === null) hasExportData = false;
    const selfConsumed = Math.max(0, production - exported);
    productionKwh += production;
    exportKwh += exported;
    selfConsumedKwh += selfConsumed;
    savingsThb += selfConsumed * rateForDay(day.date, tariff);
  }
  return { productionKwh, exportKwh, selfConsumedKwh, savingsThb, hasExportData, days: days.length };
}

const sumPeriods = (periods: SavingsPeriod[]): SavingsPeriod =>
  periods.reduce<SavingsPeriod>(
    (acc, p) => ({
      productionKwh: acc.productionKwh + p.productionKwh,
      exportKwh: acc.exportKwh + p.exportKwh,
      selfConsumedKwh: acc.selfConsumedKwh + p.selfConsumedKwh,
      savingsThb: acc.savingsThb + p.savingsThb,
      hasExportData: acc.hasExportData && p.hasExportData,
      days: Math.max(acc.days, p.days),
    }),
    { productionKwh: 0, exportKwh: 0, selfConsumedKwh: 0, savingsThb: 0, hasExportData: true, days: 0 }
  );

type CounterPoint = { ts: number; totalWh: number; exportWh: number | null };

const readCounterPoints = (raw: unknown): CounterPoint[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): CounterPoint | null => {
      const r = (item ?? {}) as Record<string, unknown>;
      const ts = new Date(String(r.date ?? r.timestamp ?? "")).getTime();
      const totalWh = toNumber(r.totalEnergy);
      if (!Number.isFinite(ts) || totalWh === null) return null;
      const exportWh = toNumber(r.exportEnergy ?? r.gridExportEnergy ?? r.exportTotalEnergy);
      return { ts, totalWh, exportWh };
    })
    .filter((p): p is CounterPoint => p !== null)
    .sort((a, b) => a.ts - b.ts);
};

/**
 * Turn cumulative counters into per-day energy. A day's energy is its last reading minus the
 * last reading before the day started (past days are single rollup points, so the span inside
 * the day would be zero). Days without a reading contribute nothing.
 */
export function dailyEnergyFromCounters(points: CounterPoint[], rangeStart: Date, rangeEnd: Date): DailyEnergy[] {
  const out: DailyEnergy[] = [];
  if (!points.length) return out;
  const anyExport = points.some((p) => p.exportWh !== null);
  for (let day = startOfDay(rangeStart); day <= rangeEnd; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
    const dayStartMs = day.getTime();
    const dayEndMs = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
    let baseline: CounterPoint | undefined;
    let last: CounterPoint | undefined;
    for (const p of points) {
      if (p.ts < dayStartMs) baseline = p;
      else if (p.ts <= dayEndMs) last = p;
      else break;
    }
    if (!last) continue;
    const base = baseline ?? last;
    const productionKwh = Math.max(0, last.totalWh - base.totalWh) / 1000;
    const exportKwh =
      anyExport && last.exportWh !== null && base.exportWh !== null
        ? Math.max(0, last.exportWh - base.exportWh) / 1000
        : null;
    out.push({ key: dayKey(day), date: day, productionKwh, exportKwh });
  }
  return out;
}

/** Solar devices of a site out of the raw `GET /sites/{id}/electric/devices` items. */
export function solarDevicesFromItems(items: unknown[], siteIdOrCode: string): SolarDeviceRef[] {
  const out: SolarDeviceRef[] = [];
  for (const raw of items) {
    const item = (raw ?? {}) as Record<string, unknown>;
    if (item.hasEnergyData !== true) continue;
    const vendor = detectElectricVendor(item);
    if (!isSolarVendor(vendor)) continue;
    const meta = (item.meta ?? {}) as Record<string, unknown>;
    const details = (meta.details ?? {}) as Record<string, unknown>;
    const model = typeof item.model === "string" ? item.model : "";
    const sn =
      [details.serialNumber, details.sn, item.sn, model.includes(":") ? model.split(":")[1] : model]
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .find((v) => v.length > 0) ?? "";
    if (!sn) continue;
    const categoryRaw = String(meta.deviceCategory ?? item.category ?? model.split(":")[0] ?? "METER").toUpperCase();
    const category = (["INVERTER", "METER", "GATEWAY", "SENSOR"].includes(categoryRaw)
      ? categoryRaw
      : "METER") as SolarDeviceRef["category"];
    out.push({
      id: String(item.id ?? sn),
      sn,
      label: String(item.name ?? details.name ?? sn),
      vendor,
      customerName: detectCustomerName(item),
      category,
      siteIdOrCode,
      status: typeof item.status === "string" ? item.status : null,
    });
  }
  return out;
}

async function runWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      try {
        results[idx] = { status: "fulfilled", value: await task(items[idx]) };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * This month's and year-to-date savings for every solar device of a site, from one
 * January-to-now telemetry call per device.
 */
export async function loadSiteSolarSavings(params: {
  siteIdOrCode: string;
  devices: SolarDeviceRef[];
  tariff: SolarTariff;
  now?: Date;
}): Promise<SiteSolarSavings> {
  const now = params.now ?? new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const startTime = formatForApi(yearStart);
  const endTime = formatForApi(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));

  const settled = await runWithConcurrency(params.devices, 4, async (device) => {
    const res = await fetchEquipmentTelemetry({
      siteIdOrCode: device.siteIdOrCode,
      sn: device.sn,
      startTime,
      endTime,
      category: device.category,
    });
    const data = (res?.data ?? {}) as Record<string, unknown>;
    const points = readCounterPoints(data.telemetries);
    const daily = dailyEnergyFromCounters(points, yearStart, now);
    const monthDays = daily.filter((d) => d.date >= monthStart);
    const summary = (data.summary ?? {}) as Record<string, unknown>;
    return {
      device,
      month: savingsForDays(monthDays, params.tariff),
      ytd: savingsForDays(daily, params.tariff),
      lifetimeProductionKwh: toNumber(summary.accumulatedKwh),
      daily,
    } satisfies DeviceSolarSavings;
  });

  const devices = settled
    .filter((r): r is PromiseFulfilledResult<DeviceSolarSavings> => r.status === "fulfilled")
    .map((r) => r.value);

  // month-by-month, all devices together
  const byMonth = new Map<string, DailyEnergy[]>();
  for (const d of devices) {
    for (const day of d.daily) {
      const key = day.key.slice(0, 7);
      const bucket = byMonth.get(key) ?? [];
      bucket.push(day);
      byMonth.set(key, bucket);
    }
  }
  const monthly: MonthlySolarSavings[] = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, days]) => ({
      key,
      year: Number(key.slice(0, 4)),
      month: Number(key.slice(5, 7)),
      ...savingsForDays(days, params.tariff),
    }));

  return {
    siteIdOrCode: params.siteIdOrCode,
    devices,
    month: sumPeriods(devices.map((d) => d.month)),
    ytd: sumPeriods(devices.map((d) => d.ytd)),
    monthly,
    tariff: params.tariff,
    ratesConfigured: isTariffConfigured(params.tariff),
    fetchedAt: Date.now(),
  };
}
