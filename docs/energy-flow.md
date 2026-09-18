# Energy-flow card (Electric meter page)

Animated picture of where the power is going right now for a solar + storage system — the
Zyta version of the "house" diagram the makers' own apps show.

## Where it appears
`/devices?type=electricmeter` — below the utilization hero:
- one solar system selected (Sigenergy today, Huawei once its devices exist) → that system's flow;
- the **Sigenergy** maker tab with "ภาพรวม" selected → every system of that maker on the site (or the
  site group) folded into one flow, plus a per-system list on the right.
Tuya meters and the all-makers overview do not show the card (no live power breakdown).

## Data
`GET /api/v1/sites/{id}/devices?type=electric` — each maker device carries `snapshot` written by its
poller. Sigenergy (real payload, 2026-09-18):
```
snapshot: { pvPower, gridPower, loadPower, batteryPower (kW), batterySoc (%), sigenergyStatus,
            capturedAt, dailyPowerGeneration, monthlyPowerGeneration, lifetimePowerGeneration (kWh) }
metadata.sigenergy: { systemName, pvCapacityKwp, batteryCapacityKwh, ... }
```
Sign convention (verified against the live numbers, `load = pv + grid import + battery discharge`):
`gridPower < 0` importing, `> 0` exporting · `batteryPower < 0` discharging, `> 0` charging.

The card polls once a minute while on screen (`src/hooks/useEnergyFlow.ts`); the poller itself writes
every 5 minutes, and readings older than 30 minutes turn the "updated" stamp amber.

## Files
- `src/features/electric/energyFlow.ts` — parsing, aggregation, flow directions, coverage %
- `src/hooks/useEnergyFlow.ts` — polling hook keyed by site ids
- `src/components/Devices/Electric Meter/EnergyFlowCard.tsx` + `energyFlow.css` — the SVG card
  (dark surface; validated mark colours solar `#c98500`, battery `#199e70`, grid `#3987e5`;
  arrows give direction, dot speed scales with kW; `prefers-reduced-motion` gets static arrows)
- i18n: `devices.energyFlow.*` in `public/locales/{th,en}/devices.json`

## Adding Huawei (FusionSolar)
Have the Huawei poller write the same snapshot keys (or the aliases in `snapshotFromDeviceItem`:
`solarPower`, `homePower`, `meterPower`, `chargePower`, `soc`) and `metadata.huawei.{stationName,
pvCapacityKwp, batteryCapacityKwh}`; the card picks the device up through the maker detection in
`electricVendor.ts` — no component change needed.
