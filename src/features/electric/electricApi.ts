// src/features/electric/electricApi.ts
import { request, ApiError } from "../../lib/http";
import type { MeterDashboard, RegisterElectricInput } from "./electricThunks";

type Category = "INVERTER" | "METER" | "GATEWAY" | "SENSOR";

export async function getElectricDevices(
  siteCode: string,
  opts?: { from?: string; to?: string }
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (opts?.from) params.from = opts.from;
  if (opts?.to) params.to = opts.to;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/devices`,
    { params }
  );
}

export async function syncElectricInventory(
  siteCode: string,
  opts?: { category?: Category }
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (opts?.category) params.category = opts.category;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/inventory:sync`,
    { method: "POST", params }
  );
}

export async function getElectricOverview(siteCode: string): Promise<unknown> {
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/overview`
  );
}

export type ElectricOverviewSummary = {
  siteIdOrCode: string;
  hasData: boolean;
  todayKwh: number | null;
  monthKwh: number | null;
  lastUpdateTime: string | null;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Per-site electric overview wrapper.
 * - Picks only the fields FE consumes (today / month / lastUpdate).
 * - 404 / 401 → returns hasData=false (caller renders "no data" gracefully).
 * - Other errors bubble up.
 */
export async function getElectricOverviewSummary(
  siteIdOrCode: string
): Promise<ElectricOverviewSummary> {
  try {
    const data = await request<Record<string, unknown>>(
      `/sites/${encodeURIComponent(siteIdOrCode)}/electric/overview`,
      { silent401: true }
    );
    return {
      siteIdOrCode,
      hasData: true,
      todayKwh: toFiniteNumber(data?.today_kwh),
      monthKwh: toFiniteNumber(data?.month_kwh),
      lastUpdateTime:
        typeof data?.lastUpdateTime === "string"
          ? (data.lastUpdateTime as string)
          : null,
    };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 401)) {
      return {
        siteIdOrCode,
        hasData: false,
        todayKwh: null,
        monthKwh: null,
        lastUpdateTime: null,
      };
    }
    throw err;
  }
}

type BulkElectricOverviewElement = {
  ok: boolean;
  site?: { id?: string; code?: string; name?: string };
  data?: {
    today_kwh?: number;
    month_kwh?: number;
    lastUpdateTime?: string | null;
  } | null;
  error?: { status?: number; message?: string } | null;
};

/**
 * Fetch electric overview for many sites at once via the bulk endpoint.
 * - One request returns every site the user can access (BE filters by user_sites).
 * - Per-element ok:false → the site is returned with hasData:false (per spec).
 * - The caller-supplied siteIdsOrCodes list determines which sites are returned
 *   (in case it scopes narrower than user access, e.g. utility/group filters).
 *   Sites with no matching element get hasData:false.
 * - If the bulk request itself fails, falls back to per-site parallel fetches
 *   so the UI degrades gracefully instead of going blank.
 */
export async function getElectricOverviewForSites(
  siteIdsOrCodes: string[]
): Promise<ElectricOverviewSummary[]> {
  try {
    const data = await request<BulkElectricOverviewElement[]>(
      `/sites/electric/overview`,
      { silent401: true }
    );
    const list = Array.isArray(data) ? data : [];
    const byKey = new Map<string, BulkElectricOverviewElement>();
    for (const el of list) {
      const id = el?.site?.id ? String(el.site.id).toLowerCase() : "";
      const code = el?.site?.code ? String(el.site.code).toLowerCase() : "";
      if (id) byKey.set(id, el);
      if (code) byKey.set(code, el);
    }
    return siteIdsOrCodes.map((key) => {
      const el = byKey.get(String(key).toLowerCase());
      if (!el || !el.ok || !el.data) {
        return {
          siteIdOrCode: key,
          hasData: false,
          todayKwh: null,
          monthKwh: null,
          lastUpdateTime: null,
        };
      }
      return {
        siteIdOrCode: key,
        hasData: true,
        todayKwh: toFiniteNumber(el.data.today_kwh),
        monthKwh: toFiniteNumber(el.data.month_kwh),
        lastUpdateTime:
          typeof el.data.lastUpdateTime === "string"
            ? el.data.lastUpdateTime
            : null,
      };
    });
  } catch (err) {
    // Bulk endpoint unreachable — degrade to per-site so the dashboard still loads.
    if (err instanceof ApiError && err.status === 401) {
      return siteIdsOrCodes.map((key) => ({
        siteIdOrCode: key,
        hasData: false,
        todayKwh: null,
        monthKwh: null,
        lastUpdateTime: null,
      }));
    }
    const settled = await Promise.allSettled(
      siteIdsOrCodes.map((s) => getElectricOverviewSummary(s))
    );
    return settled.map((res, i) =>
      res.status === "fulfilled"
        ? res.value
        : {
            siteIdOrCode: siteIdsOrCodes[i],
            hasData: false,
            todayKwh: null,
            monthKwh: null,
            lastUpdateTime: null,
          }
    );
  }
}

export async function updateElectricOverview(
  siteCode: string,
  sn: string,
  opts?: { category?: Category }
): Promise<unknown> {
  const body: Record<string, string> = { sn };
  if (opts?.category) body.category = opts.category;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/overview:refresh`,
    { method: "POST", json: body }
  );
}

export async function getElectricSeries(
  siteCode: string,
  opts: { from: string; to: string; timeUnit?: string; meters?: string }
): Promise<unknown> {
  const params: Record<string, string> = { from: opts.from, to: opts.to };
  if (opts.timeUnit) params.timeUnit = opts.timeUnit;
  if (opts.meters) params.meters = opts.meters;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/series`,
    { params }
  );
}

export async function registerElectricDevice(
  input: RegisterElectricInput
): Promise<unknown> {
  const { siteId, ...rest } = input;
  return request<unknown>(`/sites/${encodeURIComponent(siteId)}/devices`, {
    method: "POST",
    json: { type: "electric", ...rest },
  });
}

export type EquipmentFetchResp = { ok: boolean; data?: unknown };

export async function fetchEquipmentTelemetry(params: {
  siteIdOrCode: string;
  sn: string;
  startTime: string;
  endTime: string;
  category?: Category;
}): Promise<EquipmentFetchResp> {
  const q: Record<string, string> = {
    startTime: params.startTime,
    endTime: params.endTime,
  };
  if (params.category) q.category = params.category;
  const body = await request<unknown>(
    `/sites/${encodeURIComponent(params.siteIdOrCode)}/electric/equipment/${encodeURIComponent(params.sn)}/data`,
    { params: q }
  );
  return { ok: true, data: body };
}

export async function getMeterDashboard(
  deviceId: string,
  params?: { startDate?: string; endDate?: string }
): Promise<MeterDashboard> {
  const q: Record<string, string> = {};
  if (params?.startDate) q.startDate = params.startDate;
  if (params?.endDate) q.endDate = params.endDate;
  return request<MeterDashboard>(
    `/devices/${encodeURIComponent(deviceId)}/dashboard`,
    { params: q }
  );
}

export async function getSiteMetersDashboard(
  siteId: string,
  params?: { startDate?: string; endDate?: string; tag?: string }
): Promise<MeterDashboard> {
  const q: Record<string, string> = {};
  if (params?.startDate) q.startDate = params.startDate;
  if (params?.endDate) q.endDate = params.endDate;
  if (params?.tag) q.tag = params.tag;
  return request<MeterDashboard>(
    `/sites/${encodeURIComponent(siteId)}/meters/dashboard`,
    { params: q }
  );
}
