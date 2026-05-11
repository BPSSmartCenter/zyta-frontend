# BPScommand — Outsource Code Audit

> สรุปปัญหาที่เจอใน FE codebase ที่รับมาจาก outsource — แยกตามหมวด พร้อมระบุว่าแก้ไปแล้ว/ยังเหลือ
>
> **Audit date:** 2026-05-10
> **Scope:** `bpscommandcenter` (React 19 + Vite + TS + Redux Toolkit)

---

## Executive summary

โครงสร้างพื้นฐาน (Redux, TypeScript strict, route guards) อยู่ในเกณฑ์ดี — แต่ **API layer / network behavior ผิดทิศ** หลายจุด ทำให้ dashboard 1 หน้ายิง backend หลายร้อย request โดยไม่จำเป็น และมี endpoint ที่ตายแล้วยังถูกเรียกอยู่

**Root causes:**
1. ไม่ได้ใช้ Redux state เป็น single source of truth — หลาย component re-fetch เองทั้งที่ข้อมูลอยู่ใน store แล้ว
2. ไม่มี caching layer — endpoint เดียวกันถูกเรียก N ครั้งจากหลาย consumer
3. Polling แบบ aggressive (3 วินาที) สำหรับข้อมูลที่ไม่ realtime
4. API v1 migration ยังไม่เสร็จเมื่อรับช่วง — paths/envelope ปนกัน
5. Infrastructure config (vite proxy, cookie) ไม่ตรงกับ backend setup

---

## 1. ปัญหา performance / network

### 🔴 1.1 N+1 query patterns (ยังไม่แก้ — รอ backend)

ทุกครั้งเปิด dashboard ยิง backend N ครั้ง (N = จำนวน accessible sites ของ user):

| ที่ | endpoint | trigger |
|---|---|---|
| `useDeviceInventoryLoader.ts:264` | `GET /sites/{id}/details` × N | mount + เปลี่ยน filter |
| `UtilityOverview.tsx:531` | `GET /sites/{code}/electric/overview` × N | mount + เปลี่ยน accessibleSites |
| `ContentLayout.tsx:313` | `GET /users/stats?site={code}` × N | non-admin only |

**ตัวอย่างผลกระทบ:** admin มี 100 sites → ~300 calls แค่เปิด dashboard ครั้งเดียว

**ทางแก้ที่เสนอ:** ขอ backend extend `GET /sites?include=counters,overview,stats` รับมาทีเดียว → ลดเหลือ ~5 calls/visit

### 🔴 1.2 Aggressive polling (แก้แล้ว ✅)

`useDeviceInventoryLoader.ts:429` ตั้ง `setInterval(syncCounts, 3000)` poll ทุก 3 วินาที — ทำให้ N+1 ตามข้อ 1.1 ทำงานทุก 3s ตลอดทั้ง session

**ผลกระทบ:** user 5 sites = 100 req/min ต่อ tab ตลอดเวลา dashboard เปิดอยู่

**Fix:** ลบ `setInterval` ออก — counters เป็น static-ish data ไม่ต้อง poll

### 🔴 1.3 Endpoint ที่ตายแล้วยังถูกเรียก (แก้แล้ว ✅)

`getIoTDevices()` ยิง `GET /api/devices?t=...` ที่ backend ไม่มี → 404 ทุกครั้ง — ยังเรียกผ่าน `useDeviceInventoryLoader.ts:285` ทุกครั้งที่ syncCounts ทำงาน

**Fix:** `getIoTDevices()` return `[]` ทันที (no fetch) — caller render empty state

### 🟡 1.4 Duplicate `apiMe()` calls บน dashboard (แก้แล้ว ✅)

`/users/me` ถูกเรียก **3 ครั้งติดกัน** ตอน dashboard mount:
- `bootstrapAuth` thunk (จำเป็น)
- `DashboardPage:111` `useEffect` ดึง role + sites (ซ้ำ)
- `ContentLayout:168` ดึง email เช็ค master (ซ้ำ)

**Fix:** อ่านจาก `selectAuthUser` ใน Redux แทน — จาก 3 → 1 call

---

## 2. ปัญหา API layer

### 🔴 2.1 V1 migration ค้าง (แก้แล้ว ✅)

Backend v1 ship แล้ว 2026-05-10 แต่ FE ยังเรียก legacy paths ทั้งหมด:

| Legacy | V1 ที่ควรใช้ |
|---|---|
| `/site/{id}/...` (singular) | `/sites/{id}/...` (plural) |
| `POST /site/register` | `POST /sites:register` |
| `GET /site/{c}/electric/overview/update?sn=` (mutating GET!) | `POST /sites/{c}/electric/overview:refresh` |
| `/notis` | `/notifications` |
| `/sites/site-groups` | `/site-groups` (top-level) |
| Direct `monitoringapi.solaredge.com` (api_key หลุด) | `/sites/{id}/inverters/{sn}/telemetry` |
| Direct `api.open-meteo.com` | `/weather/forecast` |
| 4 separate device register paths | `POST /sites/{id}/devices` body `{type,...}` |

**Fix:** Migration เสร็จในรอบ refactor แรก + carve-out SSE/IoT บน legacy เพราะ backend ยังไม่ migrate

### 🟡 2.2 axios + custom api/ folder (แก้แล้ว ✅)

19 ไฟล์ใน `src/api/` ที่ผสม functions + types + interceptors ใช้ axios เป็น HTTP client

**Issues:**
- bespoke interceptor logic ใน `src/api/axios.ts` ที่ duplicate กับสิ่งที่ Redux thunks ทำได้
- ไม่มี shared envelope unwrap → แต่ละ caller ต้อง try/catch + parse ของตัวเอง
- response shape inconsistent (`{ok, items}` vs `{ok, data: {items}}` vs raw array) → callers มี fallback ladder ทุกที่

**Fix:** แทน axios ด้วย `src/lib/http.ts` (fetch wrapper, ~200 lines) + ย้าย api functions ไป `src/features/<domain>/` ตาม Redux structure → ลบ `src/api/` ทั้ง folder + เอา axios ออกจาก package.json

### 🔴 2.3 Solaredge dead code

`src/api/solaredge.ts` มี function `getInverterTelemetry()` ที่:
- เรียก `monitoringapi.solaredge.com` ตรงจาก browser → CORS issue + api_key หลุดไปฝั่ง client
- ไม่มี caller ในโปรเจค (verified via grep) — dead code มาตั้งแต่แรก

**Fix:** ลบไปพร้อม src/api/

---

## 3. ปัญหา routing / URL

### 🟡 3.1 `/u/:uid/...` prefix ที่ไม่มีประโยชน์ (แก้แล้ว ✅)

ทุก protected route ห่อด้วย `/u/:uid/` แต่ `:uid` ไม่ถูก validate (ไม่เช็คว่าตรงกับ logged-in user ไหม) — เป็นแค่ decorative

**Issues:**
- URL ยาวโดยไม่จำเป็น: `/u/abc-123/site/BKK1/electric/generate-bill/preview`
- `useUserPath` hook สร้าง URL ผ่าน base `/u/${uid}` — 22 ไฟล์ depend on this
- regex ใน LanguageSwitcher / SiteSelectionModal เช็ค `/^\/u\/[^/]+\/.../`

**Fix:** flatten routes — drop `/u/:uid/` prefix ทุกที่; useUserPath rewrite ให้ base = "" (callers ไม่ต้องแก้)

### 🟡 3.2 Routing flow ผิด — `/` เป็นทั้ง landing และ login

ก่อนแก้: `/` rendered LoginForm สำหรับ guest, redirect dashboard สำหรับ user logged-in → ไม่มี marketing landing

**Fix:** สร้าง `LandingPage` ที่ `/`, ย้าย login form ไป `/login`

---

## 4. ปัญหา auth flow / state

### 🟡 4.1 Logout ทำ side effect กระจัด (แก้แล้ว ✅)

`Sidebar.tsx:134-150` (เก่า) handleConfirmLogout:
- เรียก `apiLogout()` ตรงๆ
- dispatch `authActions.clearAuthUser()`
- dispatch `siteSelectionActions.resetSiteSelection()`
- เรียก `clearAllStoredSites()` ตรงๆ
- navigate("/", replace)

**Issues:**
- Side-effect chain อยู่ใน component (ทดสอบยาก)
- ถ้ามี slice ใหม่ต้อง dispatch reset เพิ่มทุกที่
- ไม่มี single logout thunk ที่ "เป็นเจ้าของ" flow

**Fix:** สร้าง `logoutUser` thunk; แต่ละ slice listen `logoutUser.fulfilled` ใน extraReducers reset state เอง; Sidebar dispatch `logoutUser()` ตัวเดียว

### 🔴 4.2 หลัง logout ติดหน้าขาว (แก้แล้ว ✅)

`logoutUser.fulfilled` reset auth slice เป็น `initialState` ซึ่งมี `bootStatus: "idle"` แต่ `selectIsAuthBooting` ถือว่า "idle" = booting → `RootLandingOrDashboard` ติด `<AppBootLoading />` ค้าง

**Fix:** logout reset ตั้ง `bootStatus: "ready"` (probe เกิดขึ้นแล้ว ผลคือ user = null)

---

## 5. ปัญหา infrastructure / config

### 🔴 5.1 vite proxy hardcoded (แก้แล้ว ✅)

`vite.config.ts` (เก่า) hardcode `target: "https://zyta.net"` ทั้งที่ `.env` มี `VITE_API_PROXY_TARGET` → env เปลี่ยน proxy ไม่ตาม → ทดสอบ staging IP ไม่ได้

**Fix:** ใช้ `loadEnv` อ่านจาก env variable

### 🔴 5.2 Cookie domain mismatch (แก้แล้ว ✅)

Backend set `Set-Cookie: token=...; Domain=.zyta.net` — เมื่อ proxy ผ่าน `localhost:5173` browser **reject cookie** เพราะ domain mismatch → login สำเร็จแต่ session ไม่ติด ทุก request ถัดไป 401

**Fix:** vite proxy ตั้ง `cookieDomainRewrite: ""` strip Domain attribute ออก → cookie default เป็น request host

### 🟡 5.3 .env not in repo / not documented

`.env` มี secrets/config ที่ FE ต้องตั้งเอง แต่ไม่มี `.env.example` ที่ครบถ้วน — onboard developer ใหม่ต้องเดาค่า

**Status:** ยังไม่แก้ — ควร update `.env.example` ให้มีทุก key + comment

---

## 6. ปัญหา code quality

### 🟡 6.1 Folder ซ้ำ: `hooks/` กับ `hook/`

มีทั้ง 2 folders ใน src/ — เก็บไฟล์คนละชุด — ไม่ชัดว่าใช้อันไหน

**Status:** ยังไม่รวม — ควร consolidate เป็น `hooks/`

### 🟡 6.2 .bak files ใน src tree

```
src/components/FaceRec/TableFace.tsx.bak
src/components/Map/Map_OLD_BACKUP.tsx.bak
src/components/FaceRec/Table.tsx.bak
```

**Status:** ยังไม่ลบ — quick fix: `rm src/**/*.bak`

### 🟡 6.3 console.log ค้างใน production code

~12 จุด เช่น:
- `MapPanel.tsx`
- `Map.tsx` (~6 logs)
- `electricMeterPanel.tsx`

**Status:** ยังไม่ทำ cleanup

### 🟡 6.4 `components/` organization ปนกัน

Sub-folders แบบ feature (`Devices/`, `Dashboard/`, `FaceRec/`) ปนกับไฟล์ลอย root (`Chart.tsx`, `Modal.tsx`) — import paths inconsistent

**Status:** ยังไม่ refactor — ควร move loose files เข้า `shared/` หรือ feature folder ที่เหมาะสม

### 🟡 6.5 ไม่มี Error Boundary

ทั้งโปรเจคไม่มี React `ErrorBoundary` — component error ทำ entire app crash → blank screen

**Status:** ควรเพิ่มที่ `AppLayout` กับ route-level

### 🟡 6.6 Selectors ไม่ memoized

หลาย slice ไม่ใช้ `createSelector` — composite selectors ที่ return object ใหม่ทุกครั้งจะทำให้ React re-render ซ้ำเมื่อ state ส่วนอื่นเปลี่ยน

**Status:** ส่วนใหญ่ยังเป็น plain selectors — `authSelectors.ts` มี memoize แล้ว แต่ที่อื่นยัง

### 🟡 6.7 ไฟล์ encoding มั่ว

`src/pages/VerifyEmailPage/index.tsx` (เก่า) มี Thai comments ที่ encode ผิด → แสดงเป็น `?????` ใน editor ทุก editor

**Fix:** rewrite file with proper UTF-8 + แปล comments เป็น EN

---

## 7. ปัญหา git / branch hygiene

### 🟡 7.1 หลาย branch สาย dev ขนานกัน

อย่างน้อย 2 สาย:
- `Prod` (af38386 family) — มี Redux Toolkit + features/ + CSRF + reorganized pages
- `connect api legacy FE` (cff643b family) — โครงสร้างเก่ากว่า

ต่างกัน ~170 ไฟล์ — ไม่ชัดว่า main branch จริงๆ คืออะไร

**Status:** ตอนนี้ทำงานบน `development` branch (sync กับ Prod แล้วผ่าน merge) — **ควรกำหนด main/release branch ให้ชัดเจน + เลิก dev parallel**

### 🟡 7.2 Detached HEAD บ่อย

ระหว่าง audit เจอ HEAD detached ที่ commit `af38386 (Prod)` — ถ้าทำงานต่อโดยไม่ create branch อาจหลุด

**Recommendation:** ตั้ง git hook / pre-commit ที่เตือนถ้า detached HEAD

---

## 8. ปัญหา observability

### 🟡 8.1 ไม่มี request logging / monitoring

- ไม่มี Sentry / Datadog RUM
- ไม่มี structured error reporting
- network errors silently swallow ใน try/catch หลายที่

**Status:** ควรพิจารณาเพิ่ม

### 🟡 8.2 ไม่มี trace ID flow

V1 backend ส่ง `X-Request-ID` / `meta.traceId` ใน response — FE รับมาแต่ **ไม่ได้ใช้** (ไม่ log, ไม่แสดงใน error toast) → ยากตอน support ลูกค้า

**Status:** ApiError class ตอนนี้เก็บ traceId แล้ว — แต่ไม่มี UI/log ที่แสดง

---

## สรุปสถานะ

| หมวด | ทั้งหมด | แก้แล้ว ✅ | ยังเหลือ |
|---|---:|---:|---:|
| Performance / network | 4 | 3 | 1 (รอ backend) |
| API layer | 3 | 3 | 0 |
| Routing / URL | 2 | 2 | 0 |
| Auth flow | 2 | 2 | 0 |
| Infrastructure | 3 | 2 | 1 (env doc) |
| Code quality | 7 | 1 | 6 |
| Git hygiene | 2 | 0 | 2 |
| Observability | 2 | 0 | 2 |
| **รวม** | **25** | **13** | **12** |

---

## Priorities สำหรับงานต่อ

### 🔴 High (ส่งผลต่อ user/backend load)

1. **Coordinate กับ backend ขอ `GET /sites?include=counters,overview,stats`** — แก้ N+1 ตอน dashboard load (ดู proposal แยก)
2. เพิ่ม Error Boundary ที่ AppLayout / route-level
3. เคลียร์ `.env.example` ให้ครบ

### 🟡 Medium (code health)

4. รวม `hook/` กับ `hooks/`
5. ลบ `.bak` files + strip console.log จาก production code
6. กำหนด main branch ชัดเจน + ลบ dev parallel
7. เริ่ม memoize selectors ที่ return object/array

### 🟢 Low (nice-to-have)

8. Sentry / RUM integration
9. Trace ID surface ใน error UI
10. Re-organize loose components/ files into feature folders

---

## Appendix — ไฟล์ที่เกี่ยวข้อง

- `src/lib/http.ts` — ใหม่ (replace axios)
- `src/features/*/` — ใหม่ (replace src/api/)
- `src/hooks/useDeviceInventoryLoader.ts` — แก้ polling + N+1
- `src/features/auth/authSlice.ts` — แก้ logout reset
- `vite.config.ts` — แก้ proxy + cookie rewrite
- `src/App.tsx` — flatten routes + landing page
- ลบ: `src/api/` ทั้ง folder, axios จาก package.json
