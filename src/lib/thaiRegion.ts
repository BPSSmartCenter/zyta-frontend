// src/lib/thaiRegion.ts
//
// Region classification for Thai sites, used by the dashboard "sites by region" donut.
// Six-region scheme of the National Geographic Committee (North, Northeast, Central,
// West, East, South) plus "unknown" for sites without a usable location.
//
// A province code (TIS 1099, two digits) is authoritative. When a site carries no
// province code but has coordinates, a coarse bounding-box rule on the province
// centroids is used instead; it is right for every province except a few border
// cases (Tak lands in Central), which is acceptable for a summary donut.

export type ThaiRegion =
  | "north"
  | "northeast"
  | "central"
  | "west"
  | "east"
  | "south"
  | "unknown";

/** Display order shared with the i18n labels `userMgmt.region.labels.<index>`. */
export const THAI_REGION_ORDER: readonly ThaiRegion[] = [
  "north",
  "northeast",
  "central",
  "west",
  "east",
  "south",
  "unknown",
];

const PROVINCE_REGION: Record<string, Exclude<ThaiRegion, "unknown">> = {
  // North (9)
  "50": "north", "51": "north", "52": "north", "53": "north", "54": "north",
  "55": "north", "56": "north", "57": "north", "58": "north",
  // Northeast (20)
  "30": "northeast", "31": "northeast", "32": "northeast", "33": "northeast",
  "34": "northeast", "35": "northeast", "36": "northeast", "37": "northeast",
  "38": "northeast", "39": "northeast", "40": "northeast", "41": "northeast",
  "42": "northeast", "43": "northeast", "44": "northeast", "45": "northeast",
  "46": "northeast", "47": "northeast", "48": "northeast", "49": "northeast",
  // Central (22), Bangkok included
  "10": "central", "11": "central", "12": "central", "13": "central", "14": "central",
  "15": "central", "16": "central", "17": "central", "18": "central", "19": "central",
  "26": "central", "60": "central", "61": "central", "62": "central", "64": "central",
  "65": "central", "66": "central", "67": "central", "72": "central", "73": "central",
  "74": "central", "75": "central",
  // East (7)
  "20": "east", "21": "east", "22": "east", "23": "east", "24": "east", "25": "east", "27": "east",
  // West (5)
  "63": "west", "70": "west", "71": "west", "76": "west", "77": "west",
  // South (14)
  "80": "south", "81": "south", "82": "south", "83": "south", "84": "south",
  "85": "south", "86": "south", "90": "south", "91": "south", "92": "south",
  "93": "south", "94": "south", "95": "south", "96": "south",
};

function toFinite(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function regionFromProvinceCode(code: unknown): ThaiRegion | null {
  const text = String(code ?? "").trim();
  if (!text) return null;
  const twoDigit = /^\d+$/.test(text) ? text.padStart(2, "0").slice(0, 2) : text;
  return PROVINCE_REGION[twoDigit] ?? null;
}

/** Coarse classification by coordinates; see the file header for the caveats. */
export function regionFromCoordinates(lat: unknown, lng: unknown): ThaiRegion | null {
  const y = toFinite(lat);
  const x = toFinite(lng);
  if (y == null || x == null) return null;
  // Outside Thailand's bounding box: not classifiable.
  if (y < 5.5 || y > 20.5 || x < 97.3 || x > 105.7) return null;

  if (y < 11.5) return "south";
  if (y >= 17.3 && x <= 101.3) return "north";
  if (x >= 101.3 && y >= 14.3) return "northeast";
  if ((x >= 101.3 && y < 14.3) || (x >= 100.9 && y < 13.9)) return "east";
  if (x < 100.0 && y < 15.0) return "west";
  return "central";
}

export function classifyThaiRegion(site: {
  province_code?: unknown;
  lat?: unknown;
  lng?: unknown;
}): ThaiRegion {
  return (
    regionFromProvinceCode(site.province_code) ??
    regionFromCoordinates(site.lat, site.lng) ??
    "unknown"
  );
}

/** Counts sites per region in `THAI_REGION_ORDER` order. */
export function countSitesByRegion(
  sites: ReadonlyArray<{ province_code?: unknown; lat?: unknown; lng?: unknown } | null | undefined>
): number[] {
  const counts = THAI_REGION_ORDER.map(() => 0);
  for (const site of sites) {
    if (!site) continue;
    const index = THAI_REGION_ORDER.indexOf(classifyThaiRegion(site));
    counts[index >= 0 ? index : counts.length - 1] += 1;
  }
  return counts;
}
