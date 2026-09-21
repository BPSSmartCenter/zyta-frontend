# Real solar savings (ค่าประหยัดไฟที่ใช้ได้จริง)

Shown on the Billing page as two cards — *this month* and *this year (Jan → today)* — with a
detail panel per system and per month. Code: `src/features/electric/solarSavings.ts`,
`src/hooks/useSolarSavings.ts`, `src/components/Billing/SolarSavingsPanel.tsx`.

## Formula

```
saving (THB)      = Σ_days  self-consumed(day) × rate(day)
self-consumed(day) = generated(day) − exported to grid(day)
rate(day)          = (weekday ? onPeakRate : offPeakRate) + ftRate       // THB/kWh
```

* Only kWh that replaced grid power is a saving on the utility bill; exported kWh is not.
* Rates come from Site Management (`sites[].billing.onPeakRate / offPeakRate / ftRate` in
  `GET /users/me`). Without at least one energy rate the cards show `-` and the panel asks for
  the rates. The contractual discount rate is **not** applied — the number is what the customer
  avoided paying the utility, not what BPS invoices.
* Solar output falls almost entirely inside the 09:00–22:00 on-peak window, and the daily
  rollups carry no intra-day split, so weekdays are priced at on-peak and weekends at off-peak.
  Thai public holidays (off-peak all day) are not modelled.
* Only generating devices count: makers detected as Sigenergy, Huawei (FusionSolar), SolarEdge,
  Solis (`electricVendor.ts`). Tuya / billing meters are consumption and are ignored.

## Data the frontend reads

`GET /sites/{id}/electric/equipment/{sn}/data?startTime=<Jan 1>&endTime=<today>&category=…`
— one call per solar device; `telemetries[]` are cumulative Wh counters (`totalEnergy`),
half-hourly today and one rollup per past day. A day's energy is its last counter minus the last
counter before the day started.

## What the backend still needs to add

The ZytaSite API does not report grid export yet, so every generated kWh is counted as
self-consumed and the panel labels the figures **ประมาณการ / Estimate** (an upper bound).
To make them exact, add a cumulative export counter to the same telemetry points:

```json
{ "date": "2026-09-18T04:30:00.000Z", "totalEnergy": 1869960, "exportEnergy": 231400 }
```

`exportEnergy` (Wh, cumulative, same cadence as `totalEnergy`; aliases accepted:
`gridExportEnergy`, `exportTotalEnergy`). Sigenergy's middleware already exposes grid
import/export in its snapshot, so the poller can accumulate it into `billing_data_raw` next to
`energy_total`. As soon as the field appears the estimate badge disappears — no frontend change.
