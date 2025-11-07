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

Both registration APIs accept either a site UUID or site code in the path (`:siteId`). They update existing records when a matching device is found, otherwise they create a new one and refresh site counters.

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
    "titleKey": "notis.faceDetected",
    "severity": "low",
    "occurredAt": "2025-02-11T03:25:00+07:00",
    "meta": {
      "kind": "face",
      "person": {
        "fullName": "Somchai Jaruk",
        "gender": "MALE"
      },
      "rawId": "face-001",
      "cropImg": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "fullFrame": "https://example.com/full-frame.jpg"
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
    "occurredAt": "2025-02-11T03:27:00+07:00",
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
    "title": "ตรวจพบอุปกรณ์ออฟไลน์",
    "siteId": "3078000",
    "deviceId": "device-uuid-here",
    "meta": {
      "status": "offline",
      "lastOnline": "2025-02-11T02:58:00Z"
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
