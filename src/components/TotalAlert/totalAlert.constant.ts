import { fireBurning1 } from "../../assets";

export const CAMERA_ITEMS = [
  { ringColor: "ring-transparent", imgSrc: fireBurning1 },
  { ringColor: "ring-transparent", imgSrc: fireBurning1 },
  { ringColor: "ring-transparent", imgSrc: fireBurning1 },
];

export type AlertStatus = "RESOLVED" | "UNRESOLVED";

export type AlertRow = {
  id: string;
  cameraLabel: string; // กล้องที่ 1
  event: string; // fire detected
  picture: string; // image url
  cameraName: string; // hikvision
  status: AlertStatus;
  timestamp: string; // ISO string
};

export const CAMERA_OPTIONS = [
  { label: "All CAMERA", value: "all" },
  { label: "กล้องที่ 1", value: "กล้องที่ 1" },
  { label: "กล้องที่ 2", value: "กล้องที่ 2" },
  { label: "กล้องที่ 3", value: "กล้องที่ 3" },
  { label: "กล้องที่ 4", value: "กล้องที่ 4" },
];

export const EVENT_OPTIONS = [
  { label: "All Event", value: "all" },
  { label: "fire detected", value: "fire detected" },
];

export const ALERTS_MOCK: AlertRow[] = [
  {
    id: "1",
    cameraLabel: "กล้องที่ 1",
    event: "fire detected",
    picture: fireBurning1,
    cameraName: "hikvision",
    status: "UNRESOLVED",
    timestamp: "2025-01-06T17:24:55+07:00",
  },
  {
    id: "2",
    cameraLabel: "กล้องที่ 2",
    event: "fire detected",
    picture: fireBurning1,
    cameraName: "hikvision",
    status: "RESOLVED",
    timestamp: "2025-01-06T17:24:55+07:00",
  },
  {
    id: "3",
    cameraLabel: "กล้องที่ 3",
    event: "fire detected",
    picture: fireBurning1,
    cameraName: "hikvision",
    status: "UNRESOLVED",
    timestamp: "2025-01-06T17:24:55+07:00",
  },
  {
    id: "4",
    cameraLabel: "กล้องที่ 4",
    event: "fire detected",
    picture: fireBurning1,
    cameraName: "hikvision",
    status: "RESOLVED",
    timestamp: "2025-01-06T17:24:55+07:00",
  },
  {
    id: "5",
    cameraLabel: "กล้องที่ 5",
    event: "fire detected",
    picture: fireBurning1,
    cameraName: "hikvision",
    status: "RESOLVED",
    timestamp: "2025-01-06T17:24:55+07:00",
  },
  {
    id: "6",
    cameraLabel: "กล้องที่ 5",
    event: "fire detected",
    picture: fireBurning1,
    cameraName: "hikvision",
    status: "RESOLVED",
    timestamp: "2025-01-06T17:24:55+07:00",
  },
];
