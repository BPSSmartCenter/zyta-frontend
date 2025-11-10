# BPS Command Center Webhook Guide

This note explains how to exercise the backend webhooks that the dashboard consumes. All examples assume the API is running locally on `http://localhost:3000`; adjust the host/port to fit your deployment.

---

## 1. Authentication

Most device-registration endpoints are protected by JWT. Obtain a token via the standard login flow:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'
```

Copy the `token` (or `accessToken`) from the response and pass it in the `Authorization` header as `Bearer <token>` for every authenticated request.

---

## 2. Device Registration Webhooks

All manual registration APIs accept either a site UUID or site code in the path (`:siteId`). They update existing records when a matching device is found, otherwise they create a new one and refresh site counters. The supported device families are:

1. Electric (SolarEdge integration fallback)
2. CCTV (camera)
3. Water Meter
4. Air Sensor

### 2.1 Register / Update an Electric Device

- **Method / URL**: `POST /site/:siteId/electric/devices/register`
- **Auth**: `Authorization: Bearer <token>`
- **Headers**: `Content-Type: application/json`
- **Body Fields**
  | Field      | Type     | Required | Notes                                                      |
  |------------|----------|----------|------------------------------------------------------------|
  | `category` | string   | yes      | One of `METER`, `INVERTER`, `GATEWAY`, `SENSOR` (case insensitive). |
  | `sn`       | string   | yes      | Serial number used as the primary identity.                |
  | `ipAddress`| string   | no       | Stored as `ip_address`.                                    |
  | `status`   | string   | no       | Defaults to `offline`. Accepted: `online`, `offline`, `maintenance`. |
  | `name`     | string   | no       | Optional friendly name.                                    |

Example:

```bash
curl -X POST http://localhost:3000/site/3078000/electric/devices/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "INVERTER",
    "sn": "INV-3078-L01",
    "ipAddress": "10.1.0.10",
    "status": "online",
    "name": "Rooftop Inverter"
  }'
```

Successful responses look like:

```json
{
  "ok": true,
  "item": {
    "id": "uuid",
    "site_id": "3078000",
    "model": "INVERTER:INV-3078-L01",
    "type": "electric",
    "status": "online",
    "ip_address": "10.1.0.10",
    "last_seen": "2025-11-11T03:21:20.123Z",
    "meta": {
      "source": "manual",
      "deviceCategory": "INVERTER",
      "sn": "INV-3078-L01",
      "details": {
        "serialNumber": "INV-3078-L01",
        "name": "Rooftop Inverter",
        "raw": { "SN": "INV-3078-L01" }
      }
    }
  }
}
```

### 2.2 Register / Update a CCTV Device

- **Method / URL**: `POST /site/:siteId/cctv/devices/register`
- **Auth**: `Authorization: Bearer <token>`
- **Headers**: `Content-Type: application/json`
- **Body Fields**
  | Field        | Type   | Required | Notes                                                                 |
  |--------------|--------|----------|-----------------------------------------------------------------------|
  | `deviceKey`  | string | yes      | Primary identity (camera key, model, or unique code).                |
  | `sn`         | string | no       | Optional serial number; stored in metadata.                          |
  | `ipAddress`  | string | no       | Optional IP.                                                          |
  | `status`     | string | no       | Defaults to `online`. Accepted: `online`, `offline`, `maintenance`.   |
  | `name`       | string | no       | Optional display name.                                               |

Example:

```bash
curl -X POST http://localhost:3000/site/3078000/cctv/devices/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceKey": "CAM-3078-L01",
    "sn": "SN-CAM-001",
    "ipAddress": "10.1.0.15",
    "status": "online",
    "name": "Lobby Camera"
  }'
```

Response:

```json
{
  "ok": true,
  "item": {
    "id": "uuid",
    "site_id": "3078000",
    "model": "CAM-3078-L01",
    "type": "camera",
    "status": "online",
    "ip_address": "10.1.0.15",
    "last_seen": "2025-11-11T03:35:55.678Z",
    "meta": {
      "source": "manual",
      "sn": "SN-CAM-001",
      "details": {
        "serialNumber": "SN-CAM-001",
        "name": "Lobby Camera",
        "raw": { "SN": "SN-CAM-001" }
      }
    }
  }
}
```

### 2.3 Register / Update a Water Meter Device

- **Method / URL**: `POST /site/:siteId/water/devices/register`
- **Auth**: `Authorization: Bearer <token>`
- **Headers**: `Content-Type: application/json`
- **Body Fields**
  | Field        | Type   | Required | Notes                                                                 |
  |--------------|--------|----------|-----------------------------------------------------------------------|
  | `deviceKey`  | string | yes      | Unique identifier for the meter (asset code, model, etc.).            |
  | `sn`         | string | no       | Optional serial number; saved in metadata.                            |
  | `ipAddress`  | string | no       | Optional IP address.                                                  |
  | `status`     | string | no       | Defaults to `online`. Accepted values: `online`, `offline`, `maintenance`. |
  | `name`       | string | no       | Friendly display name.                                                |

Example:

```bash
curl -X POST http://localhost:3000/site/3078000/water/devices/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceKey": "WATER-3078-A01",
    "sn": "WM-0001",
    "ipAddress": "10.1.0.21",
    "status": "online",
    "name": "Main Water Meter"
  }'
```

### 2.4 Register / Update an Air Sensor Device

- **Method / URL**: `POST /site/:siteId/air/devices/register`
- **Auth**: `Authorization: Bearer <token>`
- **Headers**: `Content-Type: application/json`
- **Body Fields**
  | Field        | Type   | Required | Notes                                                                 |
  |--------------|--------|----------|-----------------------------------------------------------------------|
  | `deviceKey`  | string | yes      | Unique identity for the sensor (model or hardware code).              |
  | `sn`         | string | no       | Optional serial number.                                               |
  | `ipAddress`  | string | no       | Optional IP address.                                                  |
  | `status`     | string | no       | Defaults to `online`. Accepted values: `online`, `offline`, `maintenance`. |
  | `name`       | string | no       | Friendly display name.                                                |

Example:

```bash
curl -X POST http://localhost:3000/site/3078000/air/devices/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceKey": "AIR-3078-S01",
    "sn": "AS-0009",
    "ipAddress": "10.1.0.31",
    "status": "maintenance",
    "name": "Warehouse Air Sensor"
  }'
```

### 2.5 Update Air Sensor Telemetry (Webhook)

Use this webhook when the external IoT gateway pushes live air-quality readings. Each successful call updates the device's `meta.air.lastReading`, which the dashboard reads via `GET /site/:siteId/air/devices`.

- **Method / URL**: `POST /webhooks/air-sensors`
- **Auth**: none (place behind your own gateway if required)
- **Headers** *(optional)*:
  - `X-Device-Key`, `X-Device-SN`, `X-Device-IP` — used to resolve the device if `siteId`/`deviceId` are omitted
- **Body Fields**
  | Field        | Required | Notes |
  |--------------|----------|-------|
  | `siteId` / `siteCode` | No | Provide if you do not send device headers. |
  | `deviceId` / `deviceKey` / `sn` | No | At least one identifier or header must be present. |
  | `timestamp`  | No | ISO string. Defaults to server receive time. |
  | `source`     | No | Friendly sensor/source name. |
  | `metrics`    | Yes | Object containing any of `pm25`, `pm10`, `humidity`, `temperature`, `co2`, `tvoc`, `pressure`, `aqiUs`, `aqiTh`. At least one metric is required. |

Example payload:

```bash
curl -X POST http://localhost:3000/webhooks/air-sensors \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: AIR-3078-S01" \
  -d '{
    "siteCode": "3078000",
    "deviceKey": "AIR-3078-S01",
    "timestamp": "2025-11-11T04:05:00Z",
    "source": "iaq-node-1",
    "metrics": {
      "pm25": 32.4,
      "pm10": 58.1,
      "humidity": 62.3,
      "temperature": 26.4
    }
  }'
```

Status thresholds (used to color the dashboard ThermostatAir):

- **PM 2.5** – Medium at ≥25 µg/m³, High at ≥50 µg/m³.
- **PM 10** – Medium at ≥50 µg/m³, High at ≥120 µg/m³.

Response:

```json
{
  "ok": true,
  "device": {
    "id": "uuid",
    "site_id": "3078000",
    "model": "AIR-3078-S01"
  },
  "reading": {
    "pm25": 32.4,
    "pm10": 58.1,
    "humidity": 62.3,
    "temperature": 26.4,
    "status": {
      "pm25": "medium",
      "pm10": "medium"
    },
    "capturedAt": "2025-11-11T04:05:00.000Z",
    "updatedAt": "2025-11-11T04:05:01.102Z",
    "source": "iaq-node-1"
  }
}
```

The UI consumes these readings via `GET /site/:siteId/air/devices` (JWT required), which returns every registered air sensor plus its latest `meta.air.lastReading`.

### 2.6 Update Water Meter Telemetry (Webhook)

This webhook mirrors the air-sensor flow but writes into `device.meta.water`. The Devices page (`devices?type=watermeter`) reads these fields to hydrate the Thermostat widgets, KPI cards, and the three ApexCharts (`WaterStackedChart`, `WaterMultiRadial`, `WaterAreaStackedChart`).

- **Method / URL**: `POST /webhooks/water-meters`
- **Auth**: none (protect the endpoint at the gateway/reverse proxy)
- **Headers** (same contract as `/webhooks/air-sensors`; supply at least `X-Device-Key` so the server can resolve the device/site automatically):
  - `X-Device-Key` — resolves `devices.model`
  - `X-Device-SN`
  - `X-Device-IP`
- **Body Fields**

  | Field | Type | Required | Notes |
  |-------|------|----------|-------|
  | `siteId` | string | no | Optional fallback only when header/device lookup fails (same behavior as the air webhook). |
  | `deviceId` / `deviceKey` / `sn` | string | conditional | Provide only if you cannot send headers (the server still prefers `X-Device-Key`). |
  | `timestamp` | ISO string | no | When the readings were sampled. Defaults to server time. |
  | `domestic` | object | yes | Instant values for **น้ำอุปโภค** (feeds the left Thermostat + KPI cards). |
  | `drinking` | object | yes | Instant values for **น้ำบริโภค** (feeds the right Thermostat + KPI cards). |
  | `totals` | object | yes | Daily / monthly / yearly liters for both domestic & drinking cards on the sidebar. |
  | `stackedSeries` | object | no | Data source for `WaterStackedChart` (12 categories + up to 3 series). |
  | `radial` | object | no | Data source for `WaterMultiRadial` (total + 3-lane split). |
  | `usageTimeline` | array | no | Array of Apex series for `WaterAreaStackedChart` (stacked area view). |

  **`domestic` / `drinking` object fields**

  | Field | Type | Required | Notes |
  |-------|------|----------|-------|
  | `ph` | number | yes | Latest pH value (displayed on KPI tile + Thermostat label). |
  | `flowRateLpm` | number | required for `domestic` | Liters per minute (goes to the left KPI card). Not needed for `drinking`. |
  | `tdsPpm` | number | required for `drinking` | Dissolved solids in ppm (right KPI). Optional for `domestic`. |
  | `consumptionLiters` | number | yes | Current aggregate consumption for the active window (FE defaults to `12:00 AM → 11:30 PM` until live scheduling is wired). Used as the Thermostat `initialValue`. |
  | `maxLitersLabel` | string | no | Overrides the Thermostat `maxLabel` (defaults to `devices.waterMeter.ofMl`). |

  **`totals` object**

  ```json
  {
    "domestic": { "today": 0, "month": 0, "year": 0 },
    "drinking": { "today": 0, "month": 0, "year": 0 }
  }
  ```

  Each value is in liters and maps 1:1 to the six sidebar cards (บริโภค today/month/year, อุปโภค today/month/year).

  **`stackedSeries` object**

  ```json
  {
    "categories": ["Jan","Feb",...,"Dec"],
    "series": [
      { "name": "Domestic", "data": [/* 12 monthly totals */] },
      { "name": "Drinking", "data": [/* 12 values */] },
      { "name": "Reclaimed", "data": [/* optional */] }
    ]
  }
  ```

  Values feed directly into the `<WaterStackedChart categories={} series={} />` props.

  **`radial` object**

  ```json
  {
    "totalLiters": 0,
    "labels": ["Domestic","Drinking","Reclaimed"],
    "values": [300, 120, 40]
  }
  ```

  `totalLiters` becomes the center number, while `labels` + `values` populate `WaterMultiRadial`.

  **`usageTimeline` array**

  Provide an array compatible with Apex stacked area series (the same shape already used in `WaterAreaStackedChart`):

  ```json
  [
    { "name": "Domestic", "data": [60, 90, ...] },
    { "name": "Drinking", "data": [40, 70, ...] },
    { "name": "Reclaimed", "data": [20, 30, ...] }
  ]
  ```

  Categories default to months, but you can send an optional `timelineCategories` array to override the X-axis labels if you later extend the chart props.

Example webhook call:

```bash
curl -X POST http://localhost:3000/webhooks/water-meters \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: WATER-3078-A01" \
  -d '{
    "deviceKey": "WATER-3078-A01",
    "timestamp": "2025-11-11T04:05:00Z",
    "domestic": { "ph": 7.2, "flowRateLpm": 38.5, "consumptionLiters": 960 },
    "drinking": { "ph": 6.8, "tdsPpm": 118, "consumptionLiters": 420 },
    "totals": {
      "domestic": { "today": 960, "month": 18640, "year": 104800 },
      "drinking": { "today": 420, "month": 8200, "year": 50210 }
    },
    "stackedSeries": {
      "categories": ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      "series": [
        { "name": "Domestic", "data": [820,910,960,880,1020,990,1040,980,950,970,1010,960] },
        { "name": "Drinking", "data": [350,370,420,380,430,410,460,420,415,430,440,420] },
        { "name": "Reclaimed", "data": [70,60,55,62,58,60,65,63,61,59,57,54] }
      ]
    },
    "radial": {
      "totalLiters": 1380,
      "labels": ["Domestic","Drinking","Reclaimed"],
      "values": [960, 420, 0]
    },
    "usageTimeline": [
      { "name": "Domestic", "data": [60,90,120,140,250,300,260,340,360,320,380,460] },
      { "name": "Drinking", "data": [360,380,420,430,450,470,440,500,520,510,530,560] },
      { "name": "Reclaimed", "data": [540,560,590,600,650,700,660,740,780,760,800,840] }
    ]
  }'
```

On success the handler should upsert the target device and persist:

```json
{
  "meta": {
    "water": {
      "lastReading": {
        "timestamp": "2025-11-11T04:05:00Z",
        "domestic": { "ph": 7.2, "flowRateLpm": 38.5, "consumptionLiters": 960 },
        "drinking": { "ph": 6.8, "tdsPpm": 118, "consumptionLiters": 420 }
      },
      "totals": { ... },
      "charts": {
        "stackedSeries": { ... },
        "radial": { ... },
        "usageTimeline": [ ... ]
      }
    }
  }
}
```

The future `GET /site/:siteId/water/devices` (JWT) will mirror `getAirDevices`: it should return every water meter device with its `meta.water` payload so the FE can hydrate without additional joins.

---

## 3. Notification Webhook (`/webhooks/notis`)

Use this endpoint to push alert payloads into the dashboard. It is unauthenticated but validates payload structure before writing to the database.

- **Method / URL**: `POST /webhooks/notis`
- **Headers**:
  - `Content-Type: application/json`
  - Optional device headers for automatic lookup:
    - `X-Device-Key`
    - `X-Device-IP`
    - `X-Device-SN`
- **Body Fields**
  | Field         | Type         | Required | Notes |
  |---------------|--------------|----------|-------|
  | `type`        | string       | yes      | One of `alert`, `warning`, `info`, `normal`. |
  | `severity`    | string       | no       | One of `low`, `medium`, `critical` (defaults to `low`). |
  | `titleKey`    | string       | semi     | Provide either `titleKey` (i18n key) or `title` (plain string). |
  | `title`       | string       | semi     | Plain-text headline if you are not using translation keys. |
  | `siteId`      | string       | conditional | Site UUID. Required unless device headers allow lookup. |
  | `deviceId`    | string       | conditional | Device UUID. Required unless headers provide enough context. |
  | `img`         | string (URL) | no       | Optional thumbnail / snapshot URL. |
  | `lat`, `lng`  | number       | no       | Optional explicit coordinates. Falls back to site lat/lng if omitted. |
  | `occurredAt`  | ISO string / epoch | no | When the event happened. Defaults to server time. |
  | `meta`        | object       | no       | Any JSON payload. Entire request body is stored if `meta` is missing or invalid JSON. |

### 3.1 Sample Payloads

**Critical alert – person fell**
```bash
curl -X POST http://localhost:3000/webhooks/notis \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: CAM-3078-L01" \
  -d '{
    "type": "alert",
    "severity": "critical",
    "titleKey": "notis.fallDetected",
    "img": "https://example.com/fall.jpg",
    "occurredAt": "2025-02-11T03:15:00Z",
    "meta": {
      "category": "fall",
      "trackedBy": "Lobby Camera",
      "confidence": 0.94
    }
  }'
```

**Warning – motion detected**
```bash
curl -X POST http://localhost:3000/webhooks/notis \
  -H "Content-Type: application/json" \
  -d '{
    "type": "warning",
    "severity": "medium",
    "siteId": "3078000",
    "deviceId": "device-uuid-here",
    "titleKey": "notis.motionDetected",
    "occurredAt": "2025-02-11T03:20:00Z",
    "meta": {
      "zone": "Parking",
      "confidence": 0.73
    }
  }'
```

**Informational – face recognised**
```bash
curl -X POST http://localhost:3000/webhooks/notis \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: CAM-3078-ENTRANCE" \
  -d '{
    "type": "info",
    "severity": "low",
    "titleKey": "notis.faceDetected",
    "title": "ตรวจพบใบหน้า",
    "img": null,
    "occurredAt": "2025-11-10T11:16:15Z",
    "meta": {
      "kind": "face",
      "rawId": "face-001",
      "person": {
        "fullName": "Somchai Raaruk",
        "gender": "MALE"
      }
    }
  }'
```

**Informational – license plate detected**
```bash
curl -X POST http://localhost:3000/webhooks/notis \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: CAM-3078-ENTRANCE" \
  -d '{
    "type": "info",
    "titleKey": "notis.plateDetected",
    "severity": "low",
    "title": "ตรวจพบป้ายทะเบียน",
    "img": null,
    "occurredAt": "2025-11-10T13:15:15Z",
    "meta": {
      "kind": "plate",
      "rawId": "plate-001",
      "plateText": "กข 1234",
      "province": "กรุงเทพมหานคร",
      "cameraName": "Entrance Cam",
      "confidenceHeader": ["A", "B", "C", "D", "E", "F"],
      "picture": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
      "platePicture": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
    }
  }'
```

**Normal – device offline notice**
```bash
curl -X POST http://localhost:3000/webhooks/notis \
  -H "Content-Type: application/json" \
  -d '{ 
    "type": "normal",
    "severity": "low",
    "titleKey": "notis.deviceOffline",
    "title": "อุปกรณ์ออฟไลน์",
    "img": null,
    "occurredAt": "2025-11-07T10:11:00+07:00",
    "meta": {
      "status": "active"
    }
  }'
```

**Response format**

```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "site_id": "3078000",
    "device_id": "device-uuid-here",
    "type": "alert",
    "severity": "critical",
    "title_key": "notis.fallDetected",
    "title": "notis.fallDetected",
    "img": "https://example.com/fall.jpg",
    "lat": null,
    "lng": null,
    "meta": {
      "category": "fall",
      "trackedBy": "Lobby Camera",
      "confidence": 0.94
    },
    "occurred_at": "2025-02-11T03:15:00.000Z",
    "created_at": "2025-02-11T03:15:01.502Z"
  }
}
```

If the API cannot resolve the device context it returns `404 Unknown device. Provide site/device or X-Device headers.` Ensure the camera or electric device is registered first.

---

## 4. Query Notifications

Use the public listing endpoint to verify what the dashboard will see:

```bash
curl "http://localhost:3000/notis?siteId=3078000&type=alert&severity=critical&limit=50"
```

Supported query parameters:

| Query      | Description                                      |
|------------|--------------------------------------------------|
| `siteId`   | Filter by site UUID.                             |
| `siteCode` | Filter by site code (if supplied during register).|
| `deviceId` | Filter by device UUID.                           |
| `type`     | `alert`, `warning`, `info`, `normal`.            |
| `severity` | `low`, `medium`, `critical`.                     |
| `limit`    | 1-500 (default 200).                             |
| `from`, `to` | ISO timestamps bounding `occurred_at`.         |

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `400 Invalid type` | `type` not in the allowed list. | Use one of `alert`, `warning`, `info`, `normal`. |
| `400 title or titleKey is required` | Payload missing both fields. | Provide at least one headline field. |
| `404 Unknown device` from webhook | API cannot match a device. | Supply `siteId` & `deviceId` explicitly, or register the device and send `X-Device-Key` / `X-Device-IP` / `X-Device-SN`. |
| Dashboard cards show fallback icons | Image URL missing or unreachable. | Include a reachable `img` URL if you need custom thumbnails; otherwise defaults will render. |
| Newly created device not visible in UI | Poller cache delay. | Hit `/site/:siteId/.../register` again or wait for the next site counter refresh (few seconds). |

---

Keep this file close to your API sources so it stays in sync with future contract changes. Update the examples whenever endpoints or required fields change.
