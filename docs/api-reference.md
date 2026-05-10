# BPS Command Center — API Reference

เอกสารอ้างอิง endpoints ทั้งหมดที่ frontend (`bpscommandcenter`) เรียกใช้
ใช้สำหรับวางแผน refactor ไป `/api/v1/...`

> **Source of truth:** ไฟล์ใน `src/api/*.ts` และ `src/context/FaceRecContext.tsx`
> **Last sync:** 2026-05-08

---

## 0. Configuration

### Base URL & Proxy

```
.env
  VITE_API_BASE_URL=/api          # baseURL ของ axios
  VITE_API_PROXY_TARGET=https://zyta.net
  VITE_IOT_API_TARGET=https://zyta.net

vite.config.ts
  /api          → https://zyta.net   (changeOrigin)
  /api/devices  → https://zyta.net   (มี rule แยก แต่ target เดียวกัน)
  /site-branding, /user-branding → https://zyta.net
```

### Axios client (`src/api/axios.ts`)

| Field | Value |
|---|---|
| baseURL | `import.meta.env.VITE_API_BASE_URL || "/api"` (trim trailing `/`) |
| withCredentials | `true` (cookie session-based) |
| Content-Type | `application/json` |

**Interceptor:**
- ถ้า response status = `401` และ URL ไม่ใช่ `/auth/login`, `/auth/register`, `/auth/logout`
  → redirect ไป `/` (ยกเว้นถ้าอยู่บน public path: `/`, `/register`, `/verify-email`, `/forgot`, `/reset`)

### Convention การตอบกลับ

หลาย endpoint ตอบในรูป `{ ok: boolean, data: T }` หรือ `{ ok: boolean, items: T[] }` แต่ไม่ทุกตัว — ดูเป็นรายตัวด้านล่าง

> **Note สำหรับ v1:** แนะนำ standardize ทุก endpoint เป็น `{ ok, data }` หรือ `{ ok, items, total, page }` เพื่อตัด fallback logic ใน FE ออก เช่น `Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []`

---

## 1. Auth — `src/api/auth.ts`

### `POST /auth/register`
สมัครสมาชิก
- **Caller:** `register({ firstName, lastName, email, password })`
- **Body:** `{ firstName, lastName, email, password }`
- **Response:** ข้อมูล user ที่สร้าง (id, email)

### `POST /auth/login`
เข้าสู่ระบบ (set session cookie)
- **Caller:** `login(email, password, remember?)`
- **Body:** `{ email, password, remember? }`
- **Response:** `{ user: {...} }` (FE ใช้แค่ `data.user`)

### `POST /auth/logout`
ออกจากระบบ (เคลียร์ cookie)
- **Caller:** `logout()`

### `POST /auth/resend-verification`
- **Body:** `{ email }`

### `GET /auth/verify-email?token=...`
ยืนยันอีเมลจาก link
- **Query:** `token`

### `POST /auth/check-email`
ตรวจว่าอีเมลถูกใช้แล้วหรือยัง
- **Body:** `{ email }`
- **Response:** `{ ok: boolean, exists: boolean }`

### `POST /auth/forgot-password`
- **Body:** `{ email }`

### `POST /auth/reset-password`
- **Body:** `{ token, password }`

---

## 2. User (Self) — `src/api/user.ts`

### `GET /users/me`
ดึงข้อมูลผู้ใช้ปัจจุบัน
- **Response:**
  ```ts
  {
    id, email,
    role: "admin" | "manager" | "officer" | "user",
    firstName, lastName,
    sites: Array<{ id, code, name, province_code, lat, lng }>,
    brandingLogoUrl?: string | null
  }
  ```

### `GET /users/stats?site=<code>`
สถิติจำนวน user แยกตาม role
- **Query:** `site` (optional, site code)
- **Response:** `{ total, byRole: { admin, manager, officer, user } }`

---

## 3. Admin Users — `src/api/adminUsers.ts`

### `GET /users`
ดึงรายการ user ทั้งหมด (admin)
- **Response:** `{ items: AdminUserDto[] }` หรือ `AdminUserDto[]` (FE รองรับทั้งสอง)

### `POST /users`
สร้าง user (admin)
- **Body:**
  ```ts
  {
    firstName, lastName, email, password,
    role: "admin" | "manager" | "officer" | "user",
    siteIds?: string[],
    brandingLogoDataUrl?: string  // base64 data URL
  }
  ```
- **Response:** `AdminUserDto`

### `GET /users/{id}`
ดึง user รายตัว (รวม sites ที่เข้าถึงได้, brandingLogoUrl)

### `PATCH /users/{id}`
- **Body (partial):**
  ```ts
  {
    firstName?, lastName?, email?,
    role?, active?,
    siteIds?: string[],
    brandingLogoDataUrl?: string,
    removeBrandingLogo?: boolean
  }
  ```

### `DELETE /users/{id}`
- **Response:** `{ id }`

### `POST /users/{id}/reset-password`
- **Body:** `{ password: string }`
- **Response:** `{ id }`

### `GET /users/search?email=<q>`
ค้นหา user ตามอีเมล (สำหรับ assign ลง site)
- **Response:**
  ```ts
  {
    items: Array<{
      id, firstName, lastName, email, role, active,
      siteIds: string[],
      inManagedScope: boolean,
      manageableSiteIds: string[],
      manageableSites: Array<{ id, name?, code? }>
    }>
  }
  ```

### `POST /users/{id}/assign-sites`
- **Body:** `{ siteIds?: string[] }`
- **Response:** `{ id, siteIds: string[] }`

---

## 4. Sites — `src/api/sites.ts`

### `GET /sites`
ดึงรายการ site ทั้งหมด (ตาม scope ของ user)

### `GET /sites/{siteId}/inventory`
ดึง inventory ของ site
- **Fallback:** ถ้า 404 → ลอง `GET /site/{siteId}/inventory` (singular)
- **Note v1:** เหลือแค่ `/sites/{id}/inventory` พอ — endpoint singular ควรเอาออก

### `GET /site/{siteIdOrCode}/details`
รายละเอียด site (รับได้ทั้ง `siteId` และ `siteCode`)
- **Note v1:** ตัดสินใจว่าจะใช้ id หรือ code ให้ตายตัว ลด ambiguity

### `POST /site/register`
สร้าง site ใหม่
- **Body:**
  ```ts
  {
    name: string,            // required
    code?: string,
    utilityId?: string,
    siteGroupId?: string,
    siteGroupName?: string,  // ใช้สร้าง group ใหม่ถ้าไม่มี id
    lat?: number,
    lng?: number,
    zipcode?: string,
    addressProvince?, addressDistrict?, addressSubDistrict?, addressLine?: string,
    brandingLogoDataUrl?: string,    // base64
    inverterApiType?: string,        // "solaredge" | "solis" | ...
    solaredgeSiteId?, solaredgeApiKey?: string,
    solisKeyId?, solisKeySecret?, solisStationId?: string
  }
  ```

### `PUT /site/{siteId}`
อัปเดต site (FE ส่งเฉพาะ field ที่เปลี่ยน)
- **Body (partial):** เหมือน `POST /site/register` + flags:
  ```ts
  {
    removeUtility?: boolean,
    removeSiteGroup?: boolean,
    removeBrandingLogo?: boolean
  }
  ```

### `DELETE /site/{siteId}`

### `GET /site/{siteIdOrCode}/billing-access`
- **Response:** `{ ok, data: SiteBillingAccess }`
- **Type:** ดู `src/types/billing.ts`

### `PATCH /site/{siteIdOrCode}/billing-access`
- **Body:** `Partial<SiteBillingAccess>`
- **Response:** `{ ok, data: SiteBillingAccess }`

---

## 5. Site Groups — `src/api/siteGroups.ts`

### `GET /sites/site-groups`
- **Response:** `{ items: SiteGroup[] }` หรือ array ตรงๆ

### `POST /sites/site-groups`
- **Body:** `{ name: string, code?: string, utilityId?: string }`

> **v1 suggestion:** ย้ายไป `/site-groups` (top-level) แทนที่จะอยู่ใต้ `/sites/...`

---

## 6. Utilities — `src/api/utilities.ts`

### `GET /utilities`
รายการการไฟฟ้า/การประปา (PEA/MEA/PWA/...)

### `POST /utilities`
- **Body:** `{ name: string, code?: string }`

### `PUT /utilities/{utilityId}`
- **Body:** `{ name?: string, code?: string | null }`

### `DELETE /utilities/{utilityId}`

---

## 7. Devices (generic) — `src/api/devices.ts` + `src/api/iot.ts`

### `GET /devices?t={timestamp}` *(IoT realtime list)*
**Caller:** `getIoTDevices()` (`src/api/iot.ts`)
- ใช้ `?t=Date.now()` กัน cache
- timeout 5000ms
- **Response:** `IoTDevice[]` หรือ `{ data: IoTDevice[] }`

### `GET /site/{siteIdOrCode}/devices?type=<key>`
รายการ device ของ site
- **Query `type`:** `electric | water | air | camera | intercom | all`

### `PUT /site/{siteIdOrCode}/devices/{deviceId}`
แก้ไข device
- **Body (partial):**
  ```ts
  {
    name?, status?: "online"|"offline"|"maintenance",
    ipAddress?: string | null,
    deviceKey?, sn?: string,
    category?: "METER"|"INVERTER"|"GATEWAY"|"SENSOR",
    buildingTag?: string | null
  }
  ```

### `DELETE /site/{siteIdOrCode}/devices/{deviceId}`

### `POST /site/{siteId}/{type}/devices/register`
ลงทะเบียน device แบบ manual
- **`{type}`:** `cctv | water | air`  *(หมายเหตุ: electric ใช้ endpoint แยก ดูข้อ 8)*
- **Body:**
  ```ts
  {
    deviceKey: string,
    sn?: string,
    ipAddress?: string,
    status?: "online" | "offline" | "maintenance",
    name?: string
  }
  ```

> **v1 suggestion:** รวมทุก type เข้า `POST /sites/{id}/devices` body `{ type: "cctv"|"water"|"air"|"electric", category, ... }` แทนการแยก path

---

## 8. Electric — `src/api/electric.ts`, `src/api/equipment.ts`, `src/api/meter.ts`

### `GET /site/{siteCode}/electric/devices?from=&to=`
รายการมิเตอร์/inverter ของ site (option filter ช่วงเวลา)

### `POST /site/{siteCode}/electric/inventory/sync?category=<X>`
Sync inventory จาก vendor (SolarEdge/Solis)
- **Query `category`:** `INVERTER | METER | GATEWAY | SENSOR`

### `GET /site/{siteCode}/electric/overview`
ภาพรวมไฟฟ้าของ site (today_kwh, month_kwh ฯลฯ)

### `GET /site/{siteCode}/electric/overview/update?sn=&category=`
Trigger update overview ของอุปกรณ์ตัวหนึ่ง
- **Query:** `sn` (required), `category?`
- **Response:** `{ ok, today_kwh, month_kwh }`

> **v1 suggestion:** เปลี่ยนเป็น `POST /sites/{id}/electric/overview/refresh` (เพราะมัน mutate state ฝั่ง backend)

### `GET /site/{siteCode}/electric/series?from=&to=&timeUnit=&meters=`
ข้อมูล timeseries สำหรับกราฟ
- **Query:**
  - `from`, `to` (required, ISO date)
  - `timeUnit?`: `"hour" | "day" | "month" | ...`
  - `meters?`: comma-separated meter ids

### `POST /site/{siteId}/electric/devices/register`
ลงทะเบียน electric device (แยกจาก devices.ts)
- **Body:**
  ```ts
  {
    category: "METER"|"INVERTER"|"GATEWAY"|"SENSOR",
    sn: string,
    ipAddress?: string,
    status?: "online"|"offline"|"maintenance",
    name?: string,
    buildingTag?: string
  }
  ```

### `GET /site/{siteIdOrCode}/electric/equipment/{sn}/data?startTime=&endTime=&category=`
ดึง telemetry รายเครื่อง (รูปแบบใกล้เคียง SolarEdge response)
- **Query:**
  - `startTime`, `endTime`: `"YYYY-MM-DD HH:MM:SS"`
  - `category?`: `INVERTER | METER | GATEWAY | SENSOR`

### `GET /devices/{deviceId}/dashboard?startDate=&endDate=`
Dashboard ของมิเตอร์รายเครื่อง
- **Response shape:** `MeterDashboard` (ดู `src/api/meter.ts` — มี `device`, `totals`, `realtime`, `cost.rates`, `chart`, `billingHistory`, `lastReading`, `range`)

### `GET /site/{siteId}/meters/dashboard?startDate=&endDate=&tag=`
Dashboard รวมของหลาย meter ใน site (รูปแบบเดียวกับด้านบน)
- **Query `tag?`:** `buildingTag` filter

---

## 9. Water — `src/api/water.ts`

### `GET /site/{siteIdOrCode}/water/devices`
รายการมิเตอร์น้ำของ site
- **Response:** `{ ok?, items?: WaterDeviceRecord[] }` หรือ array ตรงๆ

---

## 10. Air — `src/api/air.ts`

### `GET /site/{siteIdOrCode}/air/devices`
รายการ Air Sensor ของ site
- **Response:** `{ ok?, items?: AirDeviceRecord[] }` หรือ array ตรงๆ

---

## 11. Billing — `src/api/billing.ts`

### `GET /site/{siteId}/billing/overview`
ภาพรวมหน้า Billing
- **Response:** `{ ok, data: BillingOverviewPayload }`
  ```ts
  BillingOverviewPayload {
    cards: { totalUsageKwh, billAmountThisMonth, monthlyTrendPercent },
    usageRows: BillingMonitorRow[],
    billingRows: BillingMonitorRow[],
    historyItems: string[],
    monthlyList: MonthlyListRow[],
    monthlyChart: { categories: string[], series: Array<{ name, data: number[] }> }
  }
  ```

### `POST /site/{siteId}/billing/bills`
สร้างบิล
- **Body:**
  ```ts
  {
    meterId: string,
    meterLabel?, meterSerial?: string,
    billingMonth, billingYear: string,    // (ใช้ string ใน FE)
    ereOnPeak, ereOffPeak: string,
    baseOnPeak, baseOffPeak: string,
    notes?: string,
    brandingLogoDataUrl?: string
  }
  ```
- **Response:** `{ ok, bill: { billId } }`

### `POST /site/{siteId}/billing/preview/excel`
สร้าง Excel preview (ยังไม่ commit เป็นบิล) — ตอบกลับเป็น `Blob`
- **Body:**
  ```ts
  {
    meterId: string,
    billingMode?: "daily"|"monthly",
    dailyDate?: string,
    billingMonth?, billingYear?: number|string,
    baseOnPeak?, baseOffPeak?: string,
    billingDiscountRate?, billingFtRate?, billingCo2Factor?, billingTreeFactor?: string|number,
    brandingLogoDataUrl?, customLogoDataUrl?: string | null,
    utilityCode?: string | null,
    leftLogoDataUrl?, rightLogoDataUrl?: string | null,
    leftLogoVisible?, rightLogoVisible?: boolean,
    lineColor?: string | null
  }
  ```
- **`responseType`:** `"blob"`

### `GET /billing/bills/{billId}`
รายละเอียดบิล
- **Response:** `{ ok, data: BillDetailPayload }` (ดู type ใน `src/api/billing.ts:71`)

### `DELETE /billing/bills/{billId}`
- **Response:** `{ ok }`

### `POST /billing/bills/{billId}/pdf`
อัปโหลด PDF ของบิล (FE generate เอง)
- **Body:** `{ pdfBase64: string }`

### `GET /billing/bills/{billId}/pdf`
ดาวน์โหลด PDF ของบิล
- **`responseType`:** `"blob"`

### `POST /billing/bills/{billId}/excel`
อัปโหลด Excel ของบิล
- **Body:** `{ excelBase64: string }`

### `GET /billing/bills/{billId}/excel`
ดาวน์โหลด Excel ของบิล
- **`responseType`:** `"blob"`

### `POST /billing/bills/{billId}/excel/generate`
สั่ง backend generate Excel ใหม่
- **Body:**
  ```ts
  {
    mode?: "daily"|"monthly",
    dailyDate?: string,
    billingMonth?, billingYear?: number|string,
    utilityCode?: string | null,
    leftLogoDataUrl?, rightLogoDataUrl?: string | null,
    leftLogoVisible?, rightLogoVisible?: boolean,
    lineColor?: string | null
  }
  ```

### `GET /devices/{deviceId}/billing-readings?...`
ค่ามิเตอร์รายช่วง (รายเครื่อง)
- **Query:**
  - `mode`: `"daily" | "monthly" | "quarter"`
  - ถ้า `daily`: `date`
  - ถ้า `monthly`: `month`, `year`
  - ถ้า `quarter`: `date`
- **Response:**
  ```ts
  {
    ok, data: {
      mode, range: { start, end },
      rows: Array<{ label, timestamp, onPeak, offPeak, total }>
    }
  }
  ```

### `GET /site/{siteId}/billing-readings?...&tag=`
ค่ามิเตอร์รายช่วง (รวมระดับ site, filter ด้วย tag)
- query เหมือนข้างบน + `tag?`

> **v1 suggestion:** บิลทั้งหมดควรอยู่ใต้ `/sites/{id}/bills/...` ตลอด (ตอนนี้ครึ่งอยู่ใต้ `/site/{id}/billing/...`, ครึ่งอยู่ใต้ `/billing/bills/...`)

---

## 12. Face Recognition — `src/api/facerec.ts`

### `GET /facerec/events`
ดึงเหตุการณ์ตรวจจับใบหน้า/ทะเบียน (snapshot ล่าสุด)
- **Response:** `{ items: any[], plateItems?: any[] }`

### `GET /facerec/stream` *(Server-Sent Events)*
**Caller:** `new EventSource(faceRecStreamUrl(), { withCredentials: true })` ใน `src/context/FaceRecContext.tsx:421`
- **Event payload:** `{ type: "face" | "plate", payload: { row?, raw? } }`
- **Note:** EventSource ใช้ absolute URL = `${API_BASE_URL}/facerec/stream`

> **v1 note:** ถ้าจะย้ายไป `/api/v1/facerec/stream` ต้องอัปเดต `faceRecStreamUrl()` และทดสอบ proxy SSE (ห้ามทำ buffering)

---

## 13. Notifications — `src/api/notis.ts`

### `GET /notis`
รายการแจ้งเตือน
- **Query (ทั้งหมด optional):**
  ```
  limit (default 200)
  siteCode, siteId, deviceId
  type      // alert|warning|info|normal|offline|success
  severity  // low|medium|critical
  from, to  // ISO date | timestamp | Date
  ```
- **Response:** `{ items: ApiNoti[] }` หรือ array ตรงๆ
- **FE normalize:** snake_case → camelCase, parse date เป็น ISO

---

## 14. Thai Address Lookup — `src/api/thaiAddress.ts`

### `GET /thai-address/{zipcode}`
ค้นหา province/district/sub-district จาก zipcode
- **Response:**
  ```ts
  {
    ok,
    data?: {
      zipcode,
      province: { th, en } | null,
      districts: Array<{ th, en }>,
      subDistricts: Array<{ th, en }>,
      combinations: Array<{
        district: { th, en },
        subDistrict: { th, en }
      }>
    }
  }
  ```

---

## 15. External / Third-Party APIs (ไม่ผ่าน proxy)

### SolarEdge — `src/api/solaredge.ts`
> เรียกตรงจาก browser; ต้องดูเรื่อง CORS

### `GET https://monitoringapi.solaredge.com/equipment/{siteId}/{inverterSN}/data`
- **Query:** `startTime`, `endTime` (`YYYY-MM-DD HH:mm:ss`), `api_key`
- **Response:** `{ data: { count, telemetries: SolarEdgeTelemetry[] } }`

> **v1 suggestion:** ห่อให้กลายเป็น backend endpoint `/sites/{id}/electric/inverter/{sn}/telemetry` เพื่อ
> (1) ซ่อน api_key ไม่ให้หลุดมาที่ FE
> (2) แก้ปัญหา CORS
> (3) รวม path เข้าระบบเดียวกับ `/electric/equipment/{sn}/data` ที่มีอยู่แล้ว

### Open-Meteo (Weather) — `src/components/Devices/Air Sensor/AirPanel.tsx:408`

### `GET https://api.open-meteo.com/v1/forecast`
- **Query:** `latitude`, `longitude`, `current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`, `timezone=Asia/Bangkok`
- ใช้ใน Air Panel แสดงอุณหภูมิ/ความชื้น

> **v1 suggestion:** ทำ backend cache layer (TTL 5–10 นาที) เพื่อกัน rate-limit + ให้ FE ไม่ต้องรู้จัก URL ภายนอก

---

## 16. Static assets (ไม่ใช่ API — แค่ static fetch)

ใช้ใน `src/components/Map/`:
- `/data/districts.geojson`
- `/data/subdistricts.geojson`
- `/data/provinces.geojson`
- `/data/thailand.geojson`

---

## 17. สรุป Endpoint Inventory

| หมวด | Endpoints |
|---|---:|
| Auth | 8 |
| Self user | 2 |
| Admin Users | 8 |
| Sites | 8 |
| Site Groups | 2 |
| Utilities | 4 |
| Devices (generic + IoT) | 6 |
| Electric / Meter | 9 |
| Water | 1 |
| Air | 1 |
| Billing | 11 |
| FaceRec (รวม SSE) | 2 |
| Notifications | 1 |
| Thai Address | 1 |
| **Internal total** | **~64** |
| External (SolarEdge, Open-Meteo) | 2 |

---

## 18. Checklist สำหรับ Refactor → `/api/v1/...`

ทำตามลำดับนี้จะเปลี่ยนเร็วที่สุดและ rollback ง่าย:

1. **เปลี่ยน base URL ที่จุดเดียว**
   - `.env`: `VITE_API_BASE_URL=/api/v1`
   - ถ้า backend ขึ้น v1 พร้อมแล้วและ deprecate v0 → จบที่ตรงนี้

2. **เปิด v1 + v0 พร้อมกัน (recommended for migration)**
   - `vite.config.ts` proxy ทั้ง `/api` และ `/api/v1`
   - ค่อย flip ทีละ endpoint โดยใช้ env flag เช่น `VITE_USE_V1_BILLING=true`

3. **Path ที่ควรปรับแบบ breaking ตอนขึ้น v1** (จาก suggestions ในเอกสาร)
   - `/site/{id}/...` → `/sites/{id}/...` (plural ทุกที่)
   - `/sites/site-groups` → `/site-groups`
   - `/billing/bills/...` → `/sites/{id}/bills/...`
   - แยก `siteCode` กับ `siteId` ให้ชัด: ใช้ id อย่างเดียวใน path, ส่ง code เป็น query
   - `/site/{id}/electric/overview/update` (GET) → `/sites/{id}/electric/overview/refresh` (POST)
   - `/auth/check-email` (POST) → `/auth/email-availability?email=...` (GET) ตามแนว REST
   - รวม device register endpoints: `/sites/{id}/devices` (POST `{ type, ... }`)
   - SolarEdge external → ห่อเป็น `/sites/{id}/inverters/{sn}/telemetry`

4. **Response shape ให้เป็น standard เดียว**
   - List: `{ ok: true, items: T[], total?: number }`
   - Single: `{ ok: true, data: T }`
   - Error: `{ ok: false, error: { code, message, details? } }`
   - หลัง v1 แล้ว FE จะลบ fallback `Array.isArray(data?.items) ? data.items : data` ทิ้งได้หมด

5. **ที่ต้องระวังเป็นพิเศษ**
   - **SSE `/facerec/stream`**: proxy ต้องไม่ buffer (`proxyBuffering off`)
   - **Blob endpoints** (PDF/Excel): อย่าลืม `responseType: "blob"` ใน v1 — FE หลายที่ผูกไว้แล้ว
   - **401 redirect interceptor** ใน `src/api/axios.ts` — ตรวจว่า path ใหม่ยังถูก match ใน auth-endpoint allowlist (`/auth/login`, `/auth/register`, `/auth/logout`)
   - **`baseURL: ""` override** ใน `iot.ts` — ถ้าเปลี่ยน path ต้องระวังตรงนี้
   - **`withCredentials: true`** + cookie: ตรวจว่า backend v1 ตั้ง cookie path ถูก (`/` หรือ `/api`)

---

## Appendix — File → Endpoint mapping (quick lookup)

| ไฟล์ | จำนวน endpoint |
|---|---:|
| `src/api/auth.ts` | 8 |
| `src/api/user.ts` | 2 |
| `src/api/adminUsers.ts` | 8 |
| `src/api/sites.ts` | 8 |
| `src/api/siteGroups.ts` | 2 |
| `src/api/utilities.ts` | 4 |
| `src/api/devices.ts` | 5 |
| `src/api/iot.ts` | 1 |
| `src/api/electric.ts` | 6 |
| `src/api/equipment.ts` | 1 |
| `src/api/meter.ts` | 2 |
| `src/api/water.ts` | 1 |
| `src/api/air.ts` | 1 |
| `src/api/billing.ts` | 11 |
| `src/api/facerec.ts` | 2 (รวม SSE) |
| `src/api/notis.ts` | 1 |
| `src/api/thaiAddress.ts` | 1 |
| `src/api/solaredge.ts` | 1 (external) |
| `src/components/Devices/Air Sensor/AirPanel.tsx` | 1 (external — open-meteo) |
| `src/context/FaceRecContext.tsx` | (ใช้ SSE จาก facerec.ts) |
