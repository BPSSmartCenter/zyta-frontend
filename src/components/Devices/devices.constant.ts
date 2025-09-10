import { cctvImage, cctvSelected } from "../../assets";

export type DeviceCard = {
  id: string;
  label: string;
  img: string;
  activeImg: string;
};

export const DEVICE_CARDS: DeviceCard[] = Array.from({ length: 5 }).map(
  (_, i) => ({
    id: `cctv-${i + 1}`,
    label: "กล้องวงจรปิด",
    img: cctvImage,
    activeImg: cctvSelected,
  })
);
