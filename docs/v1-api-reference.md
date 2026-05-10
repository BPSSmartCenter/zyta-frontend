# BPS Backend — V1 API Reference (for FE)

> **Audience:** FE developers migrating from legacy `/api/*` to `/api/v1/*`
> **Status:** ✅ All Sprint 1.5 V1 Parity work shipped 2026-05-10
> **Last updated:** 2026-05-10
> **Companion docs:** [`docs/v1-migration-status.md`](v1-migration-status.md) · [`docs/v1-parity-pattern.md`](v1-parity-pattern.md) · [`docs/v1-parity-sprint-1.5-plan.md`](v1-parity-sprint-1.5-plan.md)

---

## Table of contents

- [0. Configuration](#0-configuration)
  - [0.1 Base URL](#01-base-url)
  - [0.2 Authentication](#02-authentication)
  - [0.3 Response envelope](#03-response-envelope)
  - [0.4 Error codes](#04-error-codes)
  - [0.5 Trace ID](#05-trace-id)
  - [0.6 Pagination](#06-pagination)
- [1. Auth](#1-auth)
- [2. User (self)](#2-user-self)
- [3. Admin Users](#3-admin-users)
- [4. Sites](#4-sites)
- [5. Site Groups](#5-site-groups)
- [6. Utilities](#6-utilities)
- [7. Devices](#7-devices)
- [8. Electric + Meter](#8-electric--meter)
- [9. Water](#9-water)
- [10. Air](#10-air)
- [11. Billing](#11-billing)
- [12. Readings](#12-readings)
- [13. Notifications](#13-notifications)
- [14. FaceRec events](#14-facerec-events)
- [15. Image Proxy](#15-image-proxy)
- [16. External wrappers](#16-external-wrappers)
- [17. Thai Address](#17-thai-address)
- [18. Health probes](#18-health-probes)
- [19. FE migration checklist](#19-fe-migration-checklist)

---

## 0. Configuration

### 0.1 Base URL

| Environment | Base URL |
|---|---|
| Local dev (Docker) | `http://localhost:3001/api/v1` |
| Staging (direct public IP, no TLS yet) | `http://45.136.253.176:3002/api/v1` |
| Production | `https://zyta.net/api/v1` |

In axios:
```ts
import.meta.env.VITE_API_BASE_URL // = "/api/v1" with vite proxy
```

### 0.2 Authentication

Cookie-based session OR Bearer token. The backend's `jwtGuard` middleware accepts **either**:

```http
Cookie: token=<jwt>
```

```http
Authorization: Bearer <jwt>
```

The login endpoint (`POST /api/v1/auth/login`) sets both — body returns `data.user`, `Set-Cookie` header carries the JWT cookie. For browser FE, `withCredentials: true` on axios is enough; the cookie auto-attaches.

**JWT lifetime:** 30 days (default `JWT_EXPIRES=30d`).

**Cookie attributes (production):**
- `Secure` (HTTPS only)
- `HttpOnly` (no JS access — XSS-safe)
- `SameSite=Lax`
- `Domain=.zyta.net`

### 0.3 Response envelope

Every v1 endpoint returns one of two shapes.

**Success (single resource):**
```json
{
  "ok": true,
  "data": { "...": "..." },
  "meta": {
    "traceId": "<uuid>",
    "timestamp": "2026-05-10T12:34:56.789Z"
  }
}
```

**Success (list):**
```json
{
  "ok": true,
  "items": [/* ... */],
  "total": 42,
  "meta": {
    "traceId": "<uuid>",
    "timestamp": "2026-05-10T...",
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 42,
      "hasNext": true
    }
  }
}
```

**Error:**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "name is required",
    "details": [{ "field": "name", "code": "REQUIRED", "message": "name is required" }]
  },
  "meta": {
    "traceId": "<uuid>",
    "timestamp": "2026-05-10T..."
  }
}
```

> ⚠️ **Discriminator**: always check `body.ok` (boolean). Never check status codes alone — some endpoints are designed to return `200 + ok:false` for soft errors (e.g., `alreadyDeleted: true`).

### 0.4 Error codes

| HTTP | code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | One or more required fields missing/invalid. `details` carries `ValidationIssue[]` |
| 400 | `BAD_REQUEST` | Generic validation failure (when single-field check, no `details`) |
| 400 | `<DOMAIN>_<REASON>` | Domain-specific code — see per-section tables below |
| 401 | `UNAUTHORIZED` | No JWT, expired, or malformed |
| 401 | `INVALID_CREDENTIALS` | `POST /auth/login` with wrong email/password |
| 401 | `TOKEN_EXPIRED` | JWT past `exp` |
| 401 | `TOKEN_INVALID` | JWT signature or shape failed |
| 403 | `FORBIDDEN` | Authenticated but lacks role/scope |
| 403 | `<RESOURCE>_FORBIDDEN_*` | Domain-specific (e.g., `FORBIDDEN_SITE_ASSIGNMENT`) |
| 404 | `NOT_FOUND` | Generic |
| 404 | `SITE_NOT_FOUND` / `DEVICE_NOT_FOUND` / `BILL_NOT_FOUND` / `USER_NOT_FOUND` | Specific |
| 409 | `CONFLICT` / `UNIQUE_CONSTRAINT` | Duplicate resource |
| 409 | `SITE_GROUP_DUPLICATE` / `DEVICE_ALREADY_DELETED` / etc. | Domain-specific |
| 422 | `UNPROCESSABLE_ENTITY` | Logically invalid (e.g., billing rates required when enabling electric billing) |
| 429 | `RATE_LIMITED` | Hit rate limit (not yet enforced) |
| 500 | `INTERNAL_ERROR` | Unexpected (masked in prod) |

Domain codes are stable identifiers — switch on `body.error.code`, not on `body.error.message` (message is for logs/UX, may be Thai).

### 0.5 Trace ID

Every request gets a UUID:
- Set or echoed in request header `X-Request-ID`
- Echoed in response header `X-Request-ID`
- Echoed in `body.meta.traceId`

Useful for log correlation when reporting bugs. FE should pass this in error toasts ("Trace ID: abc-123") so support can grep server logs.

To send your own trace ID (rare — usually let server generate):
```http
X-Request-ID: my-debug-id-123
```

### 0.6 Pagination

When provided by the endpoint, list responses include:

```json
"meta": {
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasNext": true
  }
}
```

Query params: `?page=<int, 1-based>&pageSize=<int>`.

Endpoints without explicit pagination return all matching rows under `items` — no pagination meta. Most current v1 endpoints are unpaginated; those that paginate (e.g., billing dashboard list, admin users) document it per-section.

---

## 1. Auth

> Mount: `/api/v1/auth/*` · Native v1 (Sprint 1)

### `POST /api/v1/auth/register`
**Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "user@example.com",
  "password": "string"
}
```
**Response:** `{ ok, data: { user: {...} } }`

### `POST /api/v1/auth/login`
**Body:** `{ "email", "password", "remember"?: boolean }`
**Response:** `{ ok, data: { user: { id, email, role } } }` + `Set-Cookie: token=<jwt>`

**Errors:**
- 401 `INVALID_CREDENTIALS` — same code for wrong password AND non-existent email (anti-enumeration)
- 400 `VALIDATION_ERROR` — missing email/password fields

### `POST /api/v1/auth/logout`
Clears session cookie (`Set-Cookie: token=; Expires=...1970`).
**Response:** `{ ok, data: null }`

### `POST /api/v1/auth/resend-verification`
**Body:** `{ "email" }` · **Response:** `{ ok, data: null }`

### `GET /api/v1/auth/verify-email?token=<token>`
**Response:** `{ ok, data: null }`

### `POST /api/v1/auth/check-email`
**Body:** `{ "email" }`
**Response:** `{ ok, data: { exists: boolean } }`

### `POST /api/v1/auth/forgot-password`
**Body:** `{ "email" }` · **Response:** `{ ok, data: null }`

### `POST /api/v1/auth/reset-password`
**Body:** `{ "token", "password" }` · **Response:** `{ ok, data: null }`

---

## 2. User (self)

> Mount: `/api/v1/users/*` · auth: required

### `GET /api/v1/users/me`
**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "<uuid>",
    "email": "...",
    "role": "admin" | "manager" | "officer" | "user",
    "firstName": "...",
    "lastName": "...",
    "sites": [{ "id", "code", "name", "province_code", "lat", "lng" }],
    "brandingLogoUrl": "string | null"
  }
}
```

### `GET /api/v1/users/stats?site=<siteCode>`
**Query:** `site` (optional, site code)
**Response:** `{ ok, data: { total, byRole: { admin, manager, officer, user } } }`

---

## 3. Admin Users

> Mount: `/api/v1/users/*` · auth: required (admin or manager scope per endpoint)

### `GET /api/v1/users`
**Response:** `{ ok, items: AdminUserDto[] }`

### `POST /api/v1/users`
**Body:**
```json
{
  "firstName", "lastName", "email", "password",
  "role": "admin" | "manager" | "officer" | "user",
  "siteIds"?: ["<uuid>", ...],
  "brandingLogoDataUrl"?: "data:image/png;base64,..."
}
```
**Response:** `{ ok, data: AdminUserDto }`

### `GET /api/v1/users/{id}`
Includes assigned sites + branding logo URL.

### `PATCH /api/v1/users/{id}`
**Body (partial):** any of `firstName, lastName, email, role, active, siteIds, brandingLogoDataUrl, removeBrandingLogo`

### `DELETE /api/v1/users/{id}`
**Response:** `{ ok, data: { id } }`

### `POST /api/v1/users/{id}/reset-password`
**Body:** `{ "password" }` · **Response:** `{ ok, data: { id } }`

### `GET /api/v1/users/search?email=<query>`
For assigning users to sites. Manager scope filters to manageable sites only.
**Response:** `{ ok, items: [{ id, firstName, lastName, email, role, active, siteIds, inManagedScope, manageableSiteIds, manageableSites }] }`

### `POST /api/v1/users/{id}/assign-sites`
**Body:** `{ "siteIds"?: ["<uuid>", ...] }`
**Response:** `{ ok, data: { id, siteIds } }`

---

## 4. Sites

> Mount: `/api/v1/sites/*` · auth: required (RBAC by user role)

### `GET /api/v1/sites`
List sites visible to the current user. Admin sees all; manager/officer/user sees assigned sites.
**Response:** `{ ok, items: Site[] }`

### `POST /api/v1/sites:register`
> 🆕 **Verb syntax** (Google API style — `:register` suffix)

Register a manual site.

**Body:**
```json
{
  "name": "string",          // required
  "code"?: "string",         // optional — auto-generated if empty (MAN-{ts}-{rand})
  "utilityId"?: "<uuid>",
  "siteGroupId"?: "<uuid>",
  "siteGroupName"?: "string", // creates new group if id not provided
  "lat"?: 13.59,
  "lng"?: 100.68,
  "zipcode"?: "10800",
  "addressProvince"?, "addressDistrict"?, "addressSubDistrict"?, "addressLine"?: "string",
  "brandingLogoDataUrl"?: "data:image/png;base64,...",  // PNG/JPG/WEBP/SVG, ≤ 2.5MB
  "inverterApiType"?: "solaredge" | "soliscloud",
  "solaredgeSiteId"?: "string",
  "solaredgeApiKey"?: "string",   // stored per-site, never returned to FE
  "solisKeyId"?: "string",
  "solisKeySecret"?: "string",
  "solisStationId"?: "string"
}
```

**Errors:**
- 400 `VALIDATION_ERROR` — missing name
- 409 `CODE_DUPLICATE` (or similar) — when explicit `code` collides

### `GET /api/v1/sites/{siteId}/details`
**Response:**
```json
{
  "ok": true,
  "data": {
    "site": { "id", "name", "code", "site_group", "province_code", "lat", "lng", "zipcode",
              "address_*", "brandingLogoUrl",
              "allowElectricBilling", "allowWaterBilling", "billingOnPeakRate", ... },
    "counters": {
      "devices_total", "devices_camera", "devices_intercom", "devices_water", "devices_electric",
      "devices_air", "devices_electric_online", "devices_electric_offline",
      "notis_total", "notis_alert", "notis_warning", "notis_info", "notis_normal",
      "users_count"
    },
    "solaredge": null | { "id", "name", "status", "peakPower", "lastUpdateTime", "location" }
  }
}
```

### `PUT /api/v1/sites/{siteId}`
Partial update.

**Body (all optional):**
```json
{
  "name", "code", "lat", "lng", "zipcode", "addressProvince", "addressDistrict",
  "addressSubDistrict", "addressLine", "brandingLogoDataUrl",
  "inverterApiType", "solaredgeSiteId", "solaredgeApiKey",
  "solisKeyId", "solisKeySecret", "solisStationId",
  "utilityId", "removeUtility"?: boolean,
  "siteGroupId", "siteGroupName", "removeSiteGroup"?: boolean,
  "removeBrandingLogo"?: boolean
}
```

### `DELETE /api/v1/sites/{siteId}`
> ⚠️ **Soft delete** (DATA-03 wired). Site row stays in DB with `deleted_at` set; reaper hard-deletes after 7y per PDPA.

**Response:** `{ ok, data: { ok: true } }`

### `GET /api/v1/sites/{siteId}/billing-access`
**Response:**
```json
{
  "ok": true,
  "data": {
    "allowElectricBilling": false,
    "allowWaterBilling": false,
    "billingOnPeakRate": null | 4.1839,
    "billingOffPeakRate": null | 2.6037,
    "billingDiscountRate": null | 0.3,
    "billingFtRate": null | 0.1,
    "billingCo2Factor": null | 0.5,
    "billingTreeFactor": null | 1.0
  }
}
```

### `PATCH /api/v1/sites/{siteId}/billing-access`
Enable/disable billing flags + set rates. Validation: enabling `allowElectricBilling=true` requires all 6 rate fields to be set (existing or in this request).

**Body (all optional):**
```json
{
  "allowElectricBilling"?: boolean,
  "allowWaterBilling"?: boolean,
  "billingOnPeakRate"?: number,
  "billingOffPeakRate"?: number,
  "billingDiscountRate"?: number,
  "billingFtRate"?: number,
  "billingCo2Factor"?: number,
  "billingTreeFactor"?: number
}
```

**Errors:**
- 400 `BILLING_RATES_REQUIRED` — enabling electric billing without all rates set

---

## 5. Site Groups

> Mount: `/api/v1/site-groups/*` · auth: required
> 🆕 **Top-level path** (was `/api/sites/site-groups` in legacy)

### `GET /api/v1/site-groups`
**Response:** `{ ok, data: { items: SiteGroup[] } }` (or `{ ok, items: ... }`)

### `POST /api/v1/site-groups`
**Body:** `{ "name", "code"?, "utilityId"? }`
**Errors:**
- 409 `SITE_GROUP_DUPLICATE` — name collision

---

## 6. Utilities

> Mount: `/api/v1/utilities/*` · auth: required

### `GET /api/v1/utilities`
List utility providers (PEA, MEA, PWA, etc.).
**Response:** `{ ok, items: Utility[] }`

### `POST /api/v1/utilities` · `PUT /api/v1/utilities/{id}` · `DELETE /api/v1/utilities/{id}`
**Body:** `{ "name", "code"? }` (PUT supports `code: null` to clear)

---

## 7. Devices

> Mount: `/api/v1/sites/{siteId}/devices/*` (site-scoped) + `/api/v1/devices/*` (top-level)

### `GET /api/v1/sites/{siteId}/devices?type=<type>`
**Query `type`:** `electric` | `water` | `air` | `camera` | `intercom` | `all`
**Response:** `{ ok, items: Device[] }`

### `PUT /api/v1/sites/{siteId}/devices/{deviceId}`
Partial update — emits audit log row.

**Body (all optional):**
```json
{
  "name", "status": "online" | "offline" | "maintenance",
  "ipAddress": "string | null",
  "deviceKey", "sn", "buildingTag",
  "category": "METER" | "INVERTER" | "GATEWAY" | "SENSOR"
}
```

### `DELETE /api/v1/sites/{siteId}/devices/{deviceId}`
> ⚠️ **Soft delete** (REF-04 + DATA-03). Returns `200 { ok: true, alreadyDeleted: true }` on double-delete (idempotent).

### `POST /api/v1/sites/{siteId}/devices`
> 🆕 **Unified register** — body.type dispatches. Replaces 4 legacy paths (`/cctv`, `/water`, `/air`, `/electric`/devices/register).

**Body shape varies by type:**
```json
// type: "cctv" | "water" | "air"
{ "type", "deviceKey", "sn"?, "ipAddress"?, "status"?, "name"? }

// type: "electric"
{ "type": "electric",
  "category": "METER" | "INVERTER" | "GATEWAY" | "SENSOR",
  "sn", "ipAddress"?, "status"?, "name"?, "buildingTag"? }
```

**Errors:**
- 400 `DEVICE_TYPE_REQUIRED` — missing/invalid `type`

---

## 8. Electric + Meter

> Mount: `/api/v1/sites/{siteId}/electric/*` + `/api/v1/devices/{deviceId}/dashboard` + `/api/v1/sites/{siteId}/meters/dashboard`
> auth: required

### `GET /api/v1/sites/{siteId}/electric/devices`
**Response:** `{ ok, items: ElectricDevice[] }`

### `POST /api/v1/sites/{siteId}/electric/inventory:sync`
> 🆕 **Verb syntax** (`:sync`)

Sync inventory from SolarEdge / SolisCloud (auto-detects per-site provider).

**Body or query:** `{ category?: "INVERTER" | "METER" | "GATEWAY" | "SENSOR" }` (default `INVERTER`)

### `GET /api/v1/sites/{siteId}/electric/overview`
SolarEdge overview cached + currentPowerFlow.

### `POST /api/v1/sites/{siteId}/electric/overview:refresh`
> 🆕 **Verb syntax + semantic FIX** — was a mutating GET in legacy (`/electric/overview/update`)

Triggers fresh fetch from SolarEdge/Solis + writes back to `devices.meta`.

**Body or query:** `{ sn (required), category?: "INVERTER" }` (default INVERTER)

### `GET /api/v1/sites/{siteId}/electric/series?from=&to=&timeUnit=&meters=`
**Query:**
- `from`, `to`: ISO date (required)
- `timeUnit?`: `hour` | `day` | `month` | ...
- `meters?`: comma-separated meter ids

### `GET /api/v1/sites/{siteId}/electric/equipment/{sn}/data?startTime=&endTime=&category=`
Per-equipment SolarEdge telemetry.

**Query:**
- `startTime`, `endTime`: `"YYYY-MM-DD HH:MM:SS"` (required)
- `category?`: `INVERTER` (default) | `METER` | `GATEWAY` | `SENSOR`

### `GET /api/v1/devices/{deviceId}/dashboard?startDate=&endDate=`
Per-meter dashboard payload (totals, realtime, cost.rates, chart, billingHistory, lastReading, range).

**Response:** `{ ok, data: MeterDashboard }`

### `GET /api/v1/sites/{siteId}/meters/dashboard?startDate=&endDate=&tag=`
Combined dashboard for all meters in a site (filterable by `tag` = buildingTag).

---

## 9. Water

> Mount: `/api/v1/sites/{siteId}/water/devices` · auth: required

### `GET /api/v1/sites/{siteId}/water/devices`
**Response:** `{ ok, data: { items: WaterDevice[] } }` (or `{ ok, items: ... }`)

---

## 10. Air

> Mount: `/api/v1/sites/{siteId}/air/devices` · auth: required

### `GET /api/v1/sites/{siteId}/air/devices`
**Response:** `{ ok, data: { items: AirDevice[] } }` (or `{ ok, items: ... }`)

---

## 11. Billing

> Mount: `/api/v1/billing/*` · auth: required
> Native v1 (MIG-04 — billing v1 LIVE in prod, fully refactored services + atomic tx + audit log)

### `GET /api/v1/billing/sites/{siteId}/dashboard`
Billing dashboard for a site (replaces legacy `/site/{siteId}/billing/overview`).

**Response shape:**
```json
{
  "ok": true,
  "data": {
    "cards": { "totalUsageKwh", "billAmountThisMonth", "monthlyTrendPercent" },
    "usageRows": BillingMonitorRow[],
    "billingRows": BillingMonitorRow[],
    "historyItems": string[],
    "monthlyList": MonthlyListRow[],
    "monthlyChart": { "categories": string[], "series": [{ "name", "data": number[] }] }
  }
}
```

### `POST /api/v1/billing/sites/{siteId}/bills`
Create a bill (atomic — prisma.$transaction with audit log).

**Body:**
```json
{
  "meterId": "<uuid>",
  "meterLabel"?, "meterSerial"?: "string",
  "billingMonth", "billingYear": "string",     // FE sends as string
  "ereOnPeak", "ereOffPeak": "string",
  "baseOnPeak", "baseOffPeak": "string",
  "notes"?: "string",
  "brandingLogoDataUrl"?: "data:image/png;base64,..."
}
```

**Response:** `{ ok, data: { billId } }`

### `POST /api/v1/billing/sites/{siteId}/bills:preview-excel`
> 🆕 **Verb syntax** + **`responseType: 'blob'`** in axios

Preview Excel without creating a bill. Returns binary blob.

**Body:**
```json
{
  "meterId": "<uuid>",
  "billingMode"?: "daily" | "monthly",
  "dailyDate"?: "YYYY-MM-DD",
  "billingMonth"?, "billingYear"?: number | string,
  "baseOnPeak"?, "baseOffPeak"?: "string",
  "billingDiscountRate"?, "billingFtRate"?, "billingCo2Factor"?, "billingTreeFactor"?: number | string,
  "brandingLogoDataUrl"?, "customLogoDataUrl"?: "string | null",
  "utilityCode"?: "string | null",
  "leftLogoDataUrl"?, "rightLogoDataUrl"?: "string | null",
  "leftLogoVisible"?, "rightLogoVisible"?: boolean,
  "lineColor"?: "string | null"
}
```

### `GET /api/v1/billing/bills/{billId}`
**Response:** `{ ok, data: BillDetail }`
**Errors:** 404 `BILL_NOT_FOUND` (anti-enumeration — same code for not-found vs soft-deleted)

### `DELETE /api/v1/billing/bills/{billId}`
> ⚠️ **Soft delete** (REF-04 pattern — emits audit log).
**Response:** `{ ok, data: null }`

### `POST /api/v1/billing/bills/{billId}/pdf`
Upload PDF (FE-generated).
**Body:** `{ "pdfBase64": "string" }`

### `GET /api/v1/billing/bills/{billId}/pdf`
Download PDF. **`responseType: 'blob'`** in axios.

### `POST /api/v1/billing/bills/{billId}/excel`
Upload Excel.
**Body:** `{ "excelBase64": "string" }`

### `GET /api/v1/billing/bills/{billId}/excel`
Download Excel. **`responseType: 'blob'`**.

### `POST /api/v1/billing/bills/{billId}/excel:generate`
> 🆕 **Verb syntax**

Backend regenerates Excel from cached data + branding choices.

**Body:**
```json
{
  "mode"?: "daily" | "monthly",
  "dailyDate"?: "YYYY-MM-DD",
  "billingMonth"?, "billingYear"?: number | string,
  "utilityCode"?: "string | null",
  "leftLogoDataUrl"?, "rightLogoDataUrl"?: "string | null",
  "leftLogoVisible"?, "rightLogoVisible"?: boolean,
  "lineColor"?: "string | null"
}
```

---

## 12. Readings

> Mount: `/api/v1/devices/{deviceId}/billing-readings` + `/api/v1/sites/{siteId}/billing-readings` · auth: required

### `GET /api/v1/devices/{deviceId}/billing-readings`
Per-device readings.

**Query:**
- `mode`: `daily` | `monthly` | `quarter`
- if `daily`: `date` (YYYY-MM-DD)
- if `monthly`: `month`, `year` (number)
- if `quarter`: `date`

**Response:**
```json
{
  "ok": true,
  "data": {
    "mode": "daily",
    "range": { "start": "ISO", "end": "ISO" },
    "rows": [{ "label", "timestamp", "onPeak", "offPeak", "total" }, ...]
  }
}
```

### `GET /api/v1/sites/{siteId}/billing-readings`
Site-aggregated readings, with optional `tag` filter.
**Query:** same as device + optional `tag` (e.g., `building:Building A`)

---

## 13. Notifications

> Mount: `/api/v1/notifications` · auth: required
> 🆕 **Renamed** from legacy `/notis`

### `GET /api/v1/notifications`
**Query (all optional):**
- `limit` (default 200)
- `siteCode`, `siteId`, `deviceId`
- `type`: `alert` | `warning` | `info` | `normal` | `offline` | `success`
- `severity`: `low` | `medium` | `critical`
- `from`, `to`: ISO date | timestamp | Date

**Response:** `{ ok, items: ApiNoti[] }` (FE should accept both `items` at top + nested `data.items` for transition)

---

## 14. FaceRec events

> Mount: `/api/v1/facerec/events` · auth: required (jwtGuard from SEC-03)
> ⚠️ **SSE stream NOT migrated to v1 yet** — keep using legacy `/facerec/stream` until Sprint 6 MIG-09

### `GET /api/v1/facerec/events`
History of detection events (face + plate).
**Response:** `{ ok, data: { items: any[], plateItems?: any[] } }`

---

## 15. Image Proxy

> Mount: `/api/v1/image-proxy` · auth: required (jwtGuard + ssrfGuard from SEC-04)

### `GET /api/v1/image-proxy?url=<encoded-url>`
SSRF-safe image proxy. Streams binary image data (not JSON).

**Defenses:**
1. jwtGuard — only authenticated users
2. URL parse — only `http://` or `https://`
3. Hostname allowlist (env `IMAGE_PROXY_ALLOWED_HOSTS`, comma-separated, suffix match)
4. DNS resolution + reject RFC1918 / loopback / link-local / CGNAT / IPv6
5. `maxRedirects: 0` (no redirect bypass)
6. Content-Type check — reject non-image upstream

**Errors:**
- 403 `ALLOWLIST_EMPTY` — `IMAGE_PROXY_ALLOWED_HOSTS` not configured (dev/staging)
- 403 `HOSTNAME_NOT_ALLOWED` — caller's URL host not in allowlist
- 403 `PRIVATE_IP_BLOCKED` — DNS resolved to private/loopback IP
- 400 `INVALID_URL` — malformed URL parameter

---

## 16. External wrappers

> Mount: `/api/v1/sites/{siteId}/inverters/{sn}/telemetry` + `/api/v1/weather/forecast`
> 🆕 **NEW endpoints** — replace direct browser calls (api_key leak fix + cache layer)

### `GET /api/v1/sites/{siteId}/inverters/{sn}/telemetry?startTime=&endTime=&category=`
> 🔒 **Security:** SolarEdge `api_key` is now stored per-site in DB (`sites.se_api_key`) and used server-side. **Don't include the api_key in FE code anymore.**

Same data as legacy `/electric/equipment/{sn}/data` — different (cleaner) path. FE migrating from direct `monitoringapi.solaredge.com` calls should hit this instead.

**Query:**
- `startTime`, `endTime`: `"YYYY-MM-DD HH:MM:SS"` (required)
- `category?`: `INVERTER` (default)

### `GET /api/v1/weather/forecast?lat=&lng=`
Wraps Open-Meteo. 5-minute in-memory LRU cache (key = lat/lng rounded to 3 decimals).

**Query:** `lat` ∈ [-90, 90], `lng` ∈ [-180, 180] (both required)

**Response:** Open-Meteo's response unchanged (under `data`):
```json
{
  "ok": true,
  "data": {
    "latitude", "longitude", "timezone", "timezone_abbreviation",
    "current_units": { "temperature_2m": "°C", "relative_humidity_2m": "%", ... },
    "current": { "time", "temperature_2m", "relative_humidity_2m", "wind_speed_10m", "weather_code" }
  }
}
```

**Errors:**
- 400 `WEATHER_BAD_COORD` — `lat` or `lng` not a finite number
- 400 `WEATHER_COORD_OUT_OF_RANGE` — out of `[-90, 90]` or `[-180, 180]`
- 500 `WEATHER_UPSTREAM_ERROR` — Open-Meteo API call failed (timeout / network)

---

## 17. Thai Address

> Mount: `/api/v1/thai-address/{zipcode}` · auth: required

### `GET /api/v1/thai-address/{zipcode}`
**Response:**
```json
{
  "ok": true,
  "data": {
    "zipcode": "10800",
    "province": { "th": "...", "en": "..." } | null,
    "districts": [{ "th", "en" }, ...],
    "subDistricts": [{ "th", "en" }, ...],
    "combinations": [{ "district": { "th", "en" }, "subDistrict": { "th", "en" } }, ...]
  }
}
```

---

## 18. Health probes

> Mount: `/healthz`, `/readyz` · NO `/api/v1` prefix

### `GET /healthz`
Liveness probe. No external check.
**Response:** `{ "ok": true, "uptime": <seconds>, "env": "production", "timestamp": "ISO" }` (raw, not enveloped)

### `GET /readyz`
Readiness probe with DB ping (2s timeout).
**Response:** `{ "ok": true, "checks": { "db": { "ok", "latencyMs" } }, "timestamp": "ISO" }`

Returns 503 if DB unreachable.

---

## 19. FE migration checklist

### 19.1 One-line switch (recommended)

Set the base URL to v1:
```env
VITE_API_BASE_URL=/api/v1
```

In axios:
```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  withCredentials: true,
});
```

That covers ~90% of endpoints. Everything else needs path edits below.

### 19.2 Path edits (intentional v1 changes)

| Legacy | V1 | Reason |
|---|---|---|
| `/site/{id}/...` (singular) | `/sites/{id}/...` (plural) | consistency |
| `POST /site/register` | `POST /sites:register` | Google API verb |
| `POST /site/{id}/electric/inventory/sync` | `POST /sites/{id}/electric/inventory:sync` | verb |
| `GET /site/{id}/electric/overview/update?sn=` | `POST /sites/{id}/electric/overview:refresh` body `{sn}` | semantic FIX (mutating GET → POST) |
| `POST /site/{id}/cctv/devices/register` | `POST /sites/{id}/devices` body `{type:"cctv",...}` | unified register |
| same for `water` / `air` / `electric` | (collapsed into one path) | unified |
| `/sites/site-groups` | `/site-groups` (top-level) | flatter |
| `/notis` | `/notifications` | rename |
| `POST /billing/bills/{id}/excel/generate` | `POST /billing/bills/{id}/excel:generate` | verb |
| `https://monitoringapi.solaredge.com/...` (direct) | `GET /api/v1/sites/{id}/inverters/{sn}/telemetry` | hide api_key |
| `https://api.open-meteo.com/v1/forecast` (direct) | `GET /api/v1/weather/forecast` | cache + privacy |

### 19.3 Response shape — FE accept BOTH transitional shapes

Some v1 endpoints return `{ok, data: {items}}`, others return `{ok, items}` directly (because some controllers were migrated to `sendSuccess` and others passed through `v1Envelope`). Both are valid v1 envelopes.

Recommend FE helper:
```ts
function unwrapList<T>(body: any): T[] {
  if (!body?.ok) throw new ApiError(body?.error);
  return body.items ?? body.data?.items ?? [];
}
function unwrapOne<T>(body: any): T {
  if (!body?.ok) throw new ApiError(body?.error);
  return body.data;
}
```

### 19.4 Error handling

```ts
api.interceptors.response.use(undefined, (err) => {
  const body = err.response?.data;
  if (body?.ok === false) {
    const code = body.error?.code;
    // switch on code, NOT on err.response.status alone
    if (code === "INVALID_CREDENTIALS") return Promise.reject(new InvalidLoginError());
    if (code === "TOKEN_EXPIRED" || code === "UNAUTHORIZED") {
      // redirect to login (your existing 401 interceptor)
    }
    return Promise.reject(new ApiError(code, body.error.message, body.error.details, body.meta?.traceId));
  }
  return Promise.reject(err);
});
```

For toasts/UI, prefer `body.error.message` (already localized when available).
For bug reports, include `body.meta.traceId`.

### 19.5 Things to keep using legacy paths for now

| Endpoint | Why | When |
|---|---|---|
| `/facerec/stream` (SSE) | Sprint 6 MIG-09 owns it (nginx proxy buffering tweaks needed) | Wait for Sprint 6 |
| `/webhooks/{air-sensors,water-meters,notis}` | Vendor → backend traffic, not FE-facing | N/A — FE doesn't call these |
| Static `/site-branding/*`, `/user-branding/*`, `/data/*.geojson` | Static asset paths, not API | N/A |

### 19.6 Before going live

- [ ] Update axios `VITE_API_BASE_URL` to `/api/v1`
- [ ] Edit the 9 path changes from § 19.2
- [ ] Add `unwrapList` / `unwrapOne` helpers and use them
- [ ] Update 401 interceptor allowlist if needed (already covers `/auth/login`, `/auth/register`, `/auth/logout`)
- [ ] Test against staging (`http://45.136.253.176:3002`) — security note: no TLS yet, treat as throwaway
- [ ] Coordinate FE deploy with backend deploy (legacy keeps working in parallel — order doesn't matter)
- [ ] After cutover stable for 1 week → backend can remove legacy paths (separate ticket)

---

## Appendix A — Type names referenced

These are referenced inline above. FE can either re-derive from response samples or generate from OpenAPI (when emitted).

- `AdminUserDto` — full admin user view (id, email, role, sites, branding, ...)
- `Site` — site row (see § 4 details response)
- `SiteGroup` — `{ id, name, code, utility_id, created_at, updated_at }`
- `Utility` — `{ id, name, code }`
- `Device` — base device row (see § 7 update body fields)
- `ElectricDevice` — extends Device with electric-specific meta
- `WaterDevice` / `AirDevice` — same base shape, `type='water'` / `'air'`
- `MeterDashboard` — `{ device, totals, realtime, cost.rates, chart, billingHistory, lastReading, range }`
- `BillDetail` — see legacy `src/api/billing.ts` for the FE-side type (unchanged shape under v1's `data`)
- `ApiNoti` — see legacy `src/api/notis.ts` (snake_case → camelCase normalize on FE)
- `BillingMonitorRow` / `MonthlyListRow` — see legacy `src/api/billing.ts`
- `ValidationIssue` — `{ field, code, message }`

---

## Appendix B — Quick test (Postman)

```
1. Open  postman/zyta-monitoring-manager-v1-staging.postman_collection.json
2. Set Collection variables:
     username = wichaima@yahoo.com
     password = Test1234!         (after backend reset on snapshot)
     siteId   = <UUID from GET /sites>
     deviceId = <UUID from GET /sites/:id/devices>
     inverterSN = <SN from GET /sites/:id/electric/devices>
3. Run "Auth → POST /auth/login"  → auth_token captured
4. Click any request → "Send"
```

Collection-level Tests script asserts envelope on every response (ok-discriminator + traceId match + timestamp present) — no per-request test code needed.
