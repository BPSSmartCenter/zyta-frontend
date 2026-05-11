// src/features/devices/index.ts
export { default as devicesReducer } from "./devicesSlice";
export type { DevicesState } from "./devicesSlice";
export {
  fetchSiteDevices,
  registerManualDevice,
  fetchWaterDevices,
  fetchAirDevices,
  type AirDeviceRecord,
  type DeviceTypeKey,
  type IoTDevice,
  type ManualDeviceRegisterInput,
  type UpdateDevicePayload,
  type WaterDeviceRecord,
} from "./devicesThunks";
export {
  listSiteDevices,
  deleteSiteDevice,
  updateSiteDevice,
  registerCctvDevice,
  registerWaterMeterDevice,
  registerAirSensorDevice,
  getWaterDevices,
  getAirDevices,
  getIoTDevices,
  type AirDevicesResponse,
  type DevicesListResponse,
  type WaterDevicesResponse,
} from "./devicesApi";
