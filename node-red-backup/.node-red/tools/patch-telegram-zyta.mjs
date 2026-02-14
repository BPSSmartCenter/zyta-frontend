#!/usr/bin/env node
/**
 * Patch Node-RED flows to use Zyta/BPS backend APIs (not SolarEdge) for Telegram alerts.
 *
 * Focus: 4 Telegram messages
 * - Daily low-power check (18:00)
 * - Offline devices alert (every 15 min, if any)
 * - Weekly summary (Sat 18:00)
 * - Monthly summary (1st day 18:00, matches existing behavior)
 *
 * Also attempts to repair common Thai mojibake ("à¸..." / "à¹...") by latin1->utf8 decode,
 * only for known human-text fields.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const INPUT = path.join(ROOT, "flows.json.pre-harden.backup");
const OUTPUT = path.join(ROOT, "flows.json");

const MOJI_RE = /(?:à¸|à¹|Ã|â€”|â€“|â€|ðŸ|âœ|âš)/;

function fixMojibake(s) {
  if (typeof s !== "string") return s;
  if (!MOJI_RE.test(s)) return s;
  try {
    // If s is actually UTF-8 bytes interpreted as latin1 and re-encoded, reverse it.
    const fixed = Buffer.from(s, "latin1").toString("utf8");
    // Only accept if it looks "less mojibake" than before.
    if (MOJI_RE.test(fixed) && !MOJI_RE.test(s)) return s;
    return fixed;
  } catch {
    return s;
  }
}

function walkAndFix(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(walkAndFix);
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === "string") {
        // Only fix human-facing text fields
        if (
          k === "name" ||
          k === "label" ||
          k === "info" ||
          k === "func" ||
          k === "topic" ||
          k === "format" ||
          k === "template" ||
          k === "crontab"
        ) {
          obj[k] = fixMojibake(v);
        }
      } else if (v && typeof v === "object") {
        obj[k] = walkAndFix(v);
      }
    }
  }
  return obj;
}

function getNodeById(nodes, id) {
  const n = nodes.find((x) => x && x.id === id);
  if (!n) throw new Error(`Missing node id=${id}`);
  return n;
}

function ensureWiredTo(node, targetId) {
  if (!Array.isArray(node.wires)) node.wires = [];
  if (!Array.isArray(node.wires[0])) node.wires[0] = [];
  if (!node.wires[0].includes(targetId)) node.wires[0].push(targetId);
}

function setHttpNodeToUseMsg(node) {
  node.method = "use";
  node.url = "";
  node.ret = node.ret || "obj";
  node.paytoqs = node.paytoqs || "ignore";
}

function main() {
  const raw = fs.readFileSync(INPUT, "utf8");
  const nodes = JSON.parse(raw);

  // 1) Repair mojibake in existing flow text fields to reduce UI corruption.
  walkAndFix(nodes);

  // Extract existing bearer token from the original flow (best-effort).
  const originalAttach = nodes.find((n) => n && n.id === "attach_auth");
  const tokenMatch =
    typeof originalAttach?.func === "string"
      ? originalAttach.func.match(/const\\s+token\\s*=\\s*\"([^\"]+)\"\\s*;/)
      : null;
  const defaultBearer = tokenMatch?.[1] || "REPLACE_ME_BEARER_TOKEN";

  // 2) Site list fetch: switch Zyta API root -> /api/sites and normalize into flow.alertSites
  // Existing nodes in pre-harden:
  // - attach_auth (function) -> http_sites (http request) -> debug + function(dcd765...)
  const attach_auth = getNodeById(nodes, "attach_auth");
  attach_auth.func = `
// Hardcoded token (same approach as existing flow). Consider moving to env/credential later.
const token = "${defaultBearer}";
flow.set("zytaBearer", token);
msg.headers = { Authorization: \`Bearer \${token}\` };
return msg;
`.trimStart();

  const http_sites = getNodeById(nodes, "http_sites");
  http_sites.url = "https://zyta.net/api/sites";
  http_sites.method = "GET";
  http_sites.ret = "obj";

  const store_sites = getNodeById(nodes, "dcd76506e18a6f7a");
  store_sites.name = "Store Alert Sites";
  store_sites.func = `
// Normalize /api/sites response (array of site objects with site_groups included)
const payload = msg.payload;
const arr = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
const sites = arr.map((s) => {
  const id = String(s?.id ?? "").trim();
  if (!id) return null;
  const name = String(s?.name ?? s?.code ?? id).trim() || id;
  const code = String(s?.code ?? id).trim() || id;
  const groupName = String(s?.site_groups?.name ?? s?.siteGroup?.name ?? s?.group?.name ?? "-").trim() || "-";
  return { id, name, code, groupName };
}).filter(Boolean);

flow.set("alertSites", sites);
msg.payload = sites;
return msg;
`.trimStart();

  // Ensure http_sites outputs into store_sites too (keep existing debug wires)
  ensureWiredTo(http_sites, "dcd76506e18a6f7a");

  // 3) Replace SolarEdge Overview polling with Zyta /api/site/:id/electric/overview for all sites
  const set_params = getNodeById(nodes, "set_params");
  set_params.name = "Build Overview Requests";
  set_params.func = `
const token = flow.get("zytaBearer") || "${defaultBearer}";
const sites = flow.get("alertSites") || [];
if (!Array.isArray(sites) || sites.length === 0) return null;

return sites.map((site) => ({
  method: "GET",
  url: \`https://zyta.net/api/site/\${encodeURIComponent(site.id)}/electric/overview\`,
  headers: { Authorization: \`Bearer \${token}\` },
  _siteId: site.id,
  _siteName: site.name,
  _siteGroupName: site.groupName,
}));
`.trimStart();

  const http_overview = getNodeById(nodes, "bf7db098d2042606");
  http_overview.name = "Zyta Overview API";
  setHttpNodeToUseMsg(http_overview);

  const store_overview = getNodeById(nodes, "3b2f1e4d9c7a5b10");
  store_overview.name = "Store Overview Metrics";
  store_overview.func = `
// Store metrics per-site for later alert/report generation.
const siteId = msg._siteId || msg.payload?.data?.site?.id || msg.payload?.site?.id || "unknown";
const siteName = msg._siteName || msg.payload?.data?.site?.name || msg.payload?.site?.name || siteId;
const groupName = msg._siteGroupName || "-";

const data = msg.payload?.data || msg.payload || {};
const todayKwh = Number(data?.today_kwh ?? 0) || 0;
const monthKwh = Number(data?.month_kwh ?? 0) || 0;
const lastYearKwhRaw = Number(data?.lastYear_kwh ?? 0) || 0;
const yearKwhEstimate = lastYearKwhRaw > 0 ? lastYearKwhRaw : (monthKwh * 12);
const avgYearDay = yearKwhEstimate > 0 ? (yearKwhEstimate / 365) : 0;
const threshold90 = avgYearDay * 0.9;
const lastUpdateTime = data?.lastUpdateTime || data?.lastUpdate || new Date().toLocaleString("th-TH");

const metricsMap = flow.get("siteMetricsMap") || {};
metricsMap[siteId] = {
  siteId,
  siteName,
  groupName,
  todayKwh,
  monthKwh,
  yearKwhEstimate,
  avgYearDay,
  threshold90,
  lastUpdateTime,
};
flow.set("siteMetricsMap", metricsMap);

// Build summary lines for weekly/monthly (status depends on offline + low power)
const offlineBySite = flow.get("offlineBySite") || {};
const siteSummary = Object.values(metricsMap).map((m) => {
  const offlineList = Array.isArray(offlineBySite[m.siteId]) ? offlineBySite[m.siteId] : [];
  const lowPower = m.threshold90 > 0 && m.todayKwh < m.threshold90;
  let icon = "🟢";
  let text = "ปกติ";
  if (offlineList.length) { icon = "🔴"; text = "อุปกรณ์ออฟไลน์"; }
  else if (lowPower) { icon = "🔴"; text = "ไฟต่ำกว่าเกณฑ์"; }
  return \`- \${m.groupName} / \${m.siteName}: \${icon} \${text} (\${Number(m.monthKwh||0).toFixed(2)} kWh)\`;
});
flow.set("siteSummaryList", siteSummary.join("\\n"));
return msg;
`.trimStart();

  // 4) Replace inverter/offline poll: Zyta /api/site/:id/electric/devices and alert on offline.
  const set_inv_params = getNodeById(nodes, "3e2a0b6f7f1a4c9d");
  set_inv_params.name = "Build Device List Requests";
  set_inv_params.func = `
const token = flow.get("zytaBearer") || "${defaultBearer}";
const sites = flow.get("alertSites") || [];
if (!Array.isArray(sites) || sites.length === 0) return null;

return sites.map((site) => ({
  method: "GET",
  url: \`https://zyta.net/api/site/\${encodeURIComponent(site.id)}/electric/devices\`,
  headers: { Authorization: \`Bearer \${token}\` },
  _siteId: site.id,
  _siteName: site.name,
  _siteGroupName: site.groupName,
}));
`.trimStart();

  const http_devices = getNodeById(nodes, "b2f4c8d1e0a9f7c3");
  http_devices.name = "Zyta Electric Devices";
  setHttpNodeToUseMsg(http_devices);

  const parse_status = getNodeById(nodes, "a4d9c1f3b2e6a8c0");
  parse_status.name = "Parse Offline Devices";
  parse_status.func = `
const siteId = msg._siteId || "unknown";
const siteName = msg._siteName || siteId;
const groupName = msg._siteGroupName || "-";

const items = msg.payload?.items ?? msg.payload?.data ?? msg.payload ?? [];
const devices = Array.isArray(items) ? items : (Array.isArray(items?.items) ? items.items : []);

// Only INVERTER devices (model starts with "INVERTER:" or meta.deviceCategory == INVERTER)
const inverters = devices.filter((d) => {
  const model = String(d?.model || "");
  const cat = String(d?.meta?.deviceCategory || "").toUpperCase();
  return cat === "INVERTER" || model.startsWith("INVERTER:");
});

const offline = [];
for (const inv of inverters) {
  const model = String(inv?.model || "");
  const sn = String(inv?.meta?.details?.serialNumber || inv?.sn || model.split(":")[1] || inv?.name || "").trim();
  if (!sn) continue;
  const st = String(inv?.status || "").toLowerCase();
  if (st === "offline") offline.push(sn);
}

const offlineBySite = flow.get("offlineBySite") || {};
offlineBySite[siteId] = offline;
flow.set("offlineBySite", offlineBySite);

// Build per-inverter status messages for dedupe (only when transition -> offline)
const lastMap = flow.get("inverterLastStatus") || {};
const out = [];
for (const sn of offline) {
  const key = \`\${siteId}:\${sn}\`;
  const last = lastMap[key];
  lastMap[key] = "offline";
  if (last === "offline") continue;
  out.push({ payload: { serialNumber: sn, status: "offline", inverterMode: "FAULT", timestamp: new Date().toLocaleString("th-TH"), siteId, siteName, groupName } });
}
flow.set("inverterLastStatus", lastMap);

// Also mark online ones to clear last state
for (const inv of inverters) {
  const model = String(inv?.model || "");
  const sn = String(inv?.meta?.details?.serialNumber || inv?.sn || model.split(":")[1] || inv?.name || "").trim();
  if (!sn) continue;
  const st = String(inv?.status || "").toLowerCase();
  if (st === "online") {
    lastMap[\`\${siteId}:\${sn}\`] = "online";
  }
}
flow.set("inverterLastStatus", lastMap);

if (!out.length) return null;
return [out];
`.trimStart();

  const alert_offline = getNodeById(nodes, "7c9a1e3b5d6f8a20");
  alert_offline.name = "Alert Inverter Offline";
  alert_offline.func = `
const chatId = "@solaredge_alert";
const serial = msg.payload?.serialNumber || "Unknown";
const time = msg.payload?.timestamp || new Date().toLocaleString("th-TH");
const siteName = msg.payload?.siteName || "-";
const groupName = msg.payload?.groupName || "-";

msg.payload = {
  chatId,
  type: "message",
  content:
\`🚨 แจ้งเตือนอุปกรณ์ออฟไลน์
กลุ่ม: \${groupName}
ไซต์: \${siteName}
อุปกรณ์: \${serial}
สถานะ: Offline
เวลาอัปเดต: \${time}\`
};
return msg;
`.trimStart();

  // 5) Daily low-power check at 18:00 (only send when any site low-power OR any offline)
  const daily_report = getNodeById(nodes, "daily_report");
  daily_report.name = "Daily Low Power (18:00)";
  daily_report.func = `
const chatId = "@solaredge_alert";
const now = new Date();
if (!(now.getHours() === 18 && now.getMinutes() === 0)) return null;

const dateKey = now.toISOString().slice(0, 10);
if (flow.get("dailyLowPowerSent") === dateKey) return null;

const metricsMap = flow.get("siteMetricsMap") || {};
const offlineBySite = flow.get("offlineBySite") || {};

const lines = [];
for (const m of Object.values(metricsMap)) {
  const lowPower = Number(m.threshold90 || 0) > 0 && Number(m.todayKwh || 0) < Number(m.threshold90 || 0);
  if (!lowPower) continue;
  lines.push(
\`⚠️ ไฟต่ำกว่าเกณฑ์
กลุ่ม: \${m.groupName || "-"}
ไซต์: \${m.siteName || "-"}
ค่าเฉลี่ยย้อนหลัง 1 ปี (ต่อวัน): \${Number(m.avgYearDay || 0).toFixed(2)} kWh
เกณฑ์ 90%: \${Number(m.threshold90 || 0).toFixed(2)} kWh
ผลิตได้วันนี้: \${Number(m.todayKwh || 0).toFixed(2)} kWh
เวลาอัปเดต: \${m.lastUpdateTime || now.toLocaleString("th-TH")}\`
  );
}

// If any offline devices exist, include a compact list (doesn't replace per-device alert)
const offlineLines = [];
for (const [siteId, list] of Object.entries(offlineBySite)) {
  const arr = Array.isArray(list) ? list : [];
  if (!arr.length) continue;
  const m = metricsMap[siteId];
  offlineLines.push(\`🔴 อุปกรณ์ออฟไลน์ | \${m?.groupName || "-"} / \${m?.siteName || siteId}: \${arr.join(", ")}\`);
}

if (lines.length === 0 && offlineLines.length === 0) {
  flow.set("dailyLowPowerSent", dateKey);
  return null;
}

msg.payload = {
  chatId,
  type: "message",
  content:
\`รายงานตรวจสอบไฟต่ำ (18:00)
\${lines.length ? lines.join("\\n\\n") : "ไม่พบไซต์ที่ไฟต่ำกว่าเกณฑ์"}
\${offlineLines.length ? "\\n\\n" + offlineLines.join("\\n") : ""}

เวลาอัปเดต: \${now.toLocaleString("th-TH")}\`
};

flow.set("dailyLowPowerSent", dateKey);
return msg;
`.trimStart();

  // 6) Weekly summary (Saturday 18:00) - expects flow.weeklyKwhBySite populated
  const weekly_report = getNodeById(nodes, "8adecba8b3efbb4d");
  weekly_report.name = "Weekly Summary (Sat 18:00)";
  weekly_report.func = `
const chatId = "@solaredge_alert";
const now = new Date();
const day = now.getDay(); // 6 = Sat
if (!(day === 6 && now.getHours() === 18 && now.getMinutes() === 0)) return null;

const key = now.toISOString().slice(0,10);
if (flow.get("weeklySent") === key) return null;

const metricsMap = flow.get("siteMetricsMap") || {};
const offlineBySite = flow.get("offlineBySite") || {};
const weeklyKwhBySite = flow.get("weeklyKwhBySite") || {};

const weekNo = Math.ceil(now.getDate() / 7);
const monthName = now.toLocaleDateString("th-TH", { month: "long" });
const yearBE = now.getFullYear() + 543;

const lines = [];
for (const [siteId, m] of Object.entries(metricsMap)) {
  const offline = Array.isArray(offlineBySite[siteId]) ? offlineBySite[siteId] : [];
  const lowPower = Number(m.threshold90 || 0) > 0 && Number(m.todayKwh || 0) < Number(m.threshold90 || 0);
  const kwh = Number(weeklyKwhBySite[siteId] || 0);
  let icon = "🟢";
  let text = "ปกติ";
  if (offline.length) { icon = "🔴"; text = "อุปกรณ์ออฟไลน์"; }
  else if (lowPower) { icon = "🔴"; text = "ไฟต่ำกว่าเกณฑ์"; }
  lines.push(\`- \${m.groupName || "-"} / \${m.siteName || siteId}: \${icon} \${text} (\${kwh.toFixed(2)} kWh)\`);
  if (offline.length) lines.push(\`  🔴 \${offline.join(", ")}\`);
}

msg.payload = {
  chatId,
  type: "message",
  content:
\`📈 รายงานประจำสัปดาห์ที่ \${weekNo} ของเดือน \${monthName} \${yearBE}
\${lines.length ? lines.join("\\n") : "- ไม่มีข้อมูล"}

เวลาอัปเดต: \${now.toLocaleString("th-TH")}\`
};

flow.set("weeklySent", key);
return msg;
`.trimStart();

  // 7) Monthly summary (1st day 18:00 - keep existing schedule)
  const monthly_report = getNodeById(nodes, "5d8b2c1a7f3e9c40");
  monthly_report.name = "Monthly Summary (1st day 18:00)";
  monthly_report.func = `
const chatId = "@solaredge_alert";
const now = new Date();
if (!(now.getDate() === 1 && now.getHours() === 18 && now.getMinutes() === 0)) return null;

const monthKey = \`\${now.getFullYear()}-\${String(now.getMonth()+1).padStart(2,"0")}\`;
if (flow.get("monthlySentKey") === monthKey) return null;

const metricsMap = flow.get("siteMetricsMap") || {};
const offlineBySite = flow.get("offlineBySite") || {};

const monthName = now.toLocaleDateString("th-TH", { month: "long" });
const yearBE = now.getFullYear() + 543;

const lines = [];
for (const [siteId, m] of Object.entries(metricsMap)) {
  const offline = Array.isArray(offlineBySite[siteId]) ? offlineBySite[siteId] : [];
  const lowPower = Number(m.threshold90 || 0) > 0 && Number(m.todayKwh || 0) < Number(m.threshold90 || 0);
  let icon = "🟢";
  let text = "ปกติ";
  if (offline.length) { icon = "🔴"; text = "อุปกรณ์ออฟไลน์"; }
  else if (lowPower) { icon = "🔴"; text = "ไฟต่ำกว่าเกณฑ์"; }
  lines.push(\`- \${m.groupName || "-"} / \${m.siteName || siteId}: \${icon} \${text} (\${Number(m.monthKwh||0).toFixed(2)} kWh)\`);
  if (offline.length) lines.push(\`  🔴 \${offline.join(", ")}\`);
}

msg.payload = {
  chatId,
  type: "message",
  content:
\`🗓️ รายงานประจำเดือน \${monthName} \${yearBE}
\${lines.length ? lines.join("\\n") : "- ไม่มีข้อมูล"}

เวลาอัปเดต: \${now.toLocaleString("th-TH")}\`
};

flow.set("monthlySentKey", monthKey);
return msg;
`.trimStart();

  // 8) Add a small flow to compute weekly kWh per site via /electric/series before weekly report.
  // We'll add new nodes (inject cron Sat 17:55 -> function build req -> http -> function store weekly kWh).
  const TAB_ID = "74fc178fb5d053be";
  const GROUP_ID = "6d4e77345b04c120"; // existing green group in pre-harden

  function newId(prefix) {
    // not cryptographic; just stable unique-ish for Node-RED
    return `${prefix}${Math.random().toString(16).slice(2, 10)}`;
  }

  const inject_weekly = {
    id: newId("inject_weekly_"),
    type: "inject",
    z: TAB_ID,
    g: GROUP_ID,
    name: "Weekly Series Fetch (Sat 17:55)",
    props: [{ p: "payload" }, { p: "topic", vt: "str" }],
    repeat: "",
    crontab: "55 17 * * 6",
    once: false,
    onceDelay: 0.1,
    topic: "",
    payload: "",
    payloadType: "date",
    x: 320,
    y: 1560,
    wires: [[]],
  };

  const fn_weekly_req = {
    id: newId("fn_weekly_req_"),
    type: "function",
    z: TAB_ID,
    g: GROUP_ID,
    name: "Build Weekly Series Requests",
    func: `
const token = flow.get("zytaBearer") || "${defaultBearer}";
const sites = flow.get("alertSites") || [];
if (!Array.isArray(sites) || sites.length === 0) return null;

const now = new Date();
const to = now.toISOString();
const from = new Date(now.getTime() - 7*24*60*60*1000).toISOString();

return sites.map((site) => ({
  method: "GET",
  url: \`https://zyta.net/api/site/\${encodeURIComponent(site.id)}/electric/series?from=\${encodeURIComponent(from)}&to=\${encodeURIComponent(to)}&timeUnit=DAY\`,
  headers: { Authorization: \`Bearer \${token}\` },
  _siteId: site.id,
}));
`.trimStart(),
    outputs: 1,
    noerr: 0,
    initialize: "",
    finalize: "",
    libs: [],
    x: 600,
    y: 1560,
    wires: [[]],
  };

  const http_weekly = {
    id: newId("http_weekly_"),
    type: "http request",
    z: TAB_ID,
    g: GROUP_ID,
    name: "Zyta Weekly Series",
    method: "use",
    ret: "obj",
    paytoqs: "ignore",
    url: "",
    tls: "",
    proxy: "",
    authType: "",
    headers: [],
    persist: false,
    senderr: false,
    insecureHTTPParser: false,
    x: 860,
    y: 1560,
    wires: [[]],
  };

  const fn_weekly_store = {
    id: newId("fn_weekly_store_"),
    type: "function",
    z: TAB_ID,
    g: GROUP_ID,
    name: "Store Weekly kWh",
    func: `
const siteId = msg._siteId || "unknown";
const data = msg.payload?.data || msg.payload || {};
const series = Array.isArray(data?.series) ? data.series : [];
const prod = series.find((s) => String(s?.name || "").toUpperCase() === "PRODUCTION");
const arr = Array.isArray(prod?.data) ? prod.data : [];
const last = arr.length ? Number(arr[arr.length - 1]) : 0;
const map = flow.get("weeklyKwhBySite") || {};
map[siteId] = Number.isFinite(last) ? last : 0;
flow.set("weeklyKwhBySite", map);
return null;
`.trimStart(),
    outputs: 1,
    noerr: 0,
    initialize: "",
    finalize: "",
    libs: [],
    x: 1080,
    y: 1560,
    wires: [[]],
  };

  // Wire the new mini-flow
  inject_weekly.wires = [[fn_weekly_req.id]];
  fn_weekly_req.wires = [[http_weekly.id]];
  http_weekly.wires = [[fn_weekly_store.id]];

  nodes.push(inject_weekly, fn_weekly_req, http_weekly, fn_weekly_store);

  // Write output
  fs.writeFileSync(OUTPUT, JSON.stringify(nodes, null, 2), "utf8");
  console.log(`Wrote ${OUTPUT}`);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
