// src/api/solaredge.ts
import axios from "axios";

export type SolarEdgeTelemetry = {
  date: string; // "YYYY-MM-DD HH:mm:ss"
  totalActivePower?: number;
  dcVoltage?: number;
  groundFaultResistance?: number;
  powerLimit?: number;
  totalEnergy?: number; // Wh
  temperature?: number;
  inverterMode?: string;
  operationMode?: number;
  vL1To2?: number;
  vL2To3?: number;
  vL3To1?: number;
  L1Data?: {
    acCurrent?: number;
    acVoltage?: number;
    acFrequency?: number;
    apparentPower?: number;
    activePower?: number;
    reactivePower?: number;
    cosPhi?: number;
  };
  L2Data?: SolarEdgeTelemetry["L1Data"];
  L3Data?: SolarEdgeTelemetry["L1Data"];
};

export type SolarEdgeResponse = {
  data?: {
    count?: number;
    telemetries?: SolarEdgeTelemetry[];
  };
};

export type GetInverterTelemetryParams = {
  siteId: string; // e.g. "3078000"
  inverterSN: string; // e.g. "7B0C44D5-A0"
  startTime: string; // "YYYY-MM-DD HH:mm:ss"
  endTime: string; // "YYYY-MM-DD HH:mm:ss"
  apiKey: string;
};

/**
 * Calls SolarEdge Monitoring API for inverter telemetry.
 * NOTE: This is a cross-origin request; ensure your environment allows it (CORS/proxy).
 */
export async function getInverterTelemetry({
  siteId,
  inverterSN,
  startTime,
  endTime,
  apiKey,
}: GetInverterTelemetryParams): Promise<SolarEdgeTelemetry[]> {
  const base = "https://monitoringapi.solaredge.com";
  const path = `/equipment/${encodeURIComponent(siteId)}/${encodeURIComponent(inverterSN)}/data`;
  const params = new URLSearchParams();
  params.set("startTime", startTime);
  params.set("endTime", endTime);
  params.set("api_key", apiKey);
  const url = `${base}${path}?${params.toString()}`;
  const { data } = await axios.get<SolarEdgeResponse>(url, {
    // Allow large payloads; add headers if needed
  });
  const list = (data?.data?.telemetries ?? []) as SolarEdgeTelemetry[];
  return Array.isArray(list) ? list : [];
}
