// src/features/electric/index.ts
export { default as electricReducer } from "./electricSlice";
export type { ElectricState } from "./electricSlice";
export {
  fetchElectricDevices,
  fetchElectricOverview,
  refreshElectricOverview,
  fetchElectricSeries,
  fetchMeterDashboard,
  fetchSiteMetersDashboard,
  type MeterDashboard,
  type RegisterElectricInput,
} from "./electricThunks";
export {
  getElectricDevices,
  syncElectricInventory,
  getElectricOverview,
  updateElectricOverview,
  getElectricSeries,
  registerElectricDevice,
  fetchEquipmentTelemetry,
  getMeterDashboard,
  getSiteMetersDashboard,
  type EquipmentFetchResp,
} from "./electricApi";
