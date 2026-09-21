// src/components/Devices/Electric Meter/electricVendor.ts
//
// Maker (brand) classification for the electric page. `GET /sites/{id}/electric/devices`
// mixes every device that carries an energy counter — Sigenergy systems, Tuya meters,
// billing meters and, once their poller lands, Huawei FusionSolar inverters — so the
// device strip needs a way to tell them apart and to scope the overview to one maker.

export type ElectricVendorKey =
  | "huawei"
  | "sigenergy"
  | "solaredge"
  | "solis"
  | "tuya"
  | "other";

/** Selected value that means "every maker". */
export const ALL_VENDORS = "all";
export type ElectricVendorFilter = ElectricVendorKey | typeof ALL_VENDORS;

/** Display order of the maker tabs: solar makers first, generic meters last. */
export const ELECTRIC_VENDOR_ORDER: readonly ElectricVendorKey[] = [
  "huawei",
  "sigenergy",
  "solaredge",
  "solis",
  "tuya",
  "other",
];

/** Brand names are shown as-is in both languages; "other" goes through i18n. */
export const ELECTRIC_VENDOR_LABELS: Record<Exclude<ElectricVendorKey, "other">, string> = {
  huawei: "Huawei Solar",
  sigenergy: "Sigenergy",
  solaredge: "SolarEdge",
  solis: "Solis",
  tuya: "Tuya",
};

// First pattern that matches wins, so the more specific makers come first.
const VENDOR_PATTERNS: ReadonlyArray<readonly [ElectricVendorKey, RegExp]> = [
  ["huawei", /huawei|fusion\s*solar|sun2000|smartlogger/],
  ["sigenergy", /sigen/],
  ["solaredge", /solar\s*edge/],
  ["solis", /solis|ginlong/],
  ["tuya", /tuya/],
];

const asText = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

function matchVendor(text: string): ElectricVendorKey | null {
  if (!text) return null;
  for (const [key, pattern] of VENDOR_PATTERNS) {
    if (pattern.test(text)) return key;
  }
  return null;
}

/**
 * Work out the maker of one item from `GET /sites/{id}/electric/devices`.
 *
 * Fields the backend sets on purpose (manufacturer / source / platform — e.g.
 * `meta.source: "sigenergy"`, `meta.uiModel.manufacturer: "Tuya"`) win over model and
 * display names, so a Tuya meter someone renamed "Huawei" stays under Tuya. Names are
 * only a fallback for devices whose metadata says nothing about the maker.
 */
export function detectElectricVendor(item: unknown): ElectricVendorKey {
  const record = asRecord(item);
  const meta = asRecord(record.meta);
  const uiModel = asRecord(meta.uiModel);
  const details = asRecord(meta.details);

  const declared = [
    uiModel.manufacturer,
    meta.manufacturer,
    meta.vendor,
    meta.brand,
    meta.source,
    uiModel.platform,
    meta.platform,
    record.manufacturer,
    record.vendor,
    record.brand,
    record.platform,
  ]
    .map(asText)
    .join(" ");
  const fromDeclared = matchVendor(declared);
  if (fromDeclared) return fromDeclared;

  const named = [
    uiModel.modelName,
    uiModel.factoryName,
    details.model,
    details.name,
    meta.productName,
    record.model,
    record.name,
  ]
    .map(asText)
    .join(" ");
  return matchVendor(named) ?? "other";
}

export function isElectricVendorKey(value: unknown): value is ElectricVendorKey {
  return (
    typeof value === "string" &&
    (ELECTRIC_VENDOR_ORDER as readonly string[]).includes(value)
  );
}

/** Makers whose devices generate energy (their counters are production, not consumption). */
export const SOLAR_VENDORS: ReadonlySet<ElectricVendorKey> = new Set<ElectricVendorKey>([
  "huawei",
  "sigenergy",
  "solaredge",
  "solis",
]);

export const isSolarVendor = (vendor: ElectricVendorKey): boolean => SOLAR_VENDORS.has(vendor);

/**
 * The customer's own name for the installation as the maker's cloud knows it — Sigenergy's
 * `systemName` ("05_2026_khunthomporn"), Huawei FusionSolar's plant / station name, and so on.
 * Sigenergy systems are registered under one BPS site, so this is the only field that says
 * which customer a device belongs to. Null when the backend carries nothing of the kind.
 */
export function detectCustomerName(item: unknown): string | null {
  const record = asRecord(item);
  const meta = asRecord(record.meta);
  const details = asRecord(meta.details);
  const candidates: unknown[] = [
    asRecord(meta.sigenergy).systemName,
    asRecord(meta.huawei).stationName,
    asRecord(meta.huawei).plantName,
    asRecord(meta.fusionsolar).stationName,
    asRecord(meta.fusionsolar).plantName,
    asRecord(meta.solaredge).siteName,
    asRecord(meta.solis).stationName,
    meta.customerName,
    meta.customer,
    meta.plantName,
    meta.stationName,
    meta.systemName,
    details.customerName,
    details.plantName,
    details.stationName,
    record.customerName,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}
