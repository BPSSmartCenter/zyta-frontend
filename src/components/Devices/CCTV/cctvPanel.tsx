// src/components/Devices/CCTV/CCTVPanel.tsx
import React from "react";
import Switch from "../../Switch";
import {
  wifiImage,
  wifiSelected,
  tvImage,
  tvSelected,
  intercomeImage,
  intercomeSelected,
  cloudyDay1,
} from "../../../assets";

type DeviceTile = {
  id: string;
  title: string;
  subtitle: string;
  defaultOn?: boolean;
  icon?: string;
  activeImg?: string; // ← เพิ่ม prop สำหรับรูปตอน active
};

type Props = {
  // ทั้งหมดเป็น optional — ถ้าไม่ส่งจะมีค่า mock ให้
  camera?: {
    title?: string;
    img?: string; // ส่งรูปมาเองได้; ถ้าไม่ส่งจะเป็นกล่องเทา
    status?: "online" | "offline";
  };
  weather?: {
    location?: string;
    tempC?: number;
    description?: string;
  };
  devices?: DeviceTile[];
};

export default function CCTVPanel({ camera, weather, devices }: Props) {
  const cam = {
    title: camera?.title ?? "Camera 1",
    img: camera?.img,
    status: camera?.status ?? "online",
  };

  const met = {
    location: weather?.location ?? "Lebak, Bangkok",
    tempC: weather?.tempC ?? 0,
    description: weather?.description ?? "Outdoor Temperature",
  };

  const tiles: DeviceTile[] = devices ?? [
    {
      id: "wifi",
      title: "Nest Wifi",
      subtitle: "Connected",
      defaultOn: false,
      icon: wifiImage,
      activeImg: wifiSelected, // ← ใช้รูป Selected ตอน active
    },
    {
      id: "tv",
      title: "Benq TV",
      subtitle: "Connect - Standby",
      defaultOn: false,
      icon: tvImage,
      activeImg: tvSelected, // ← ใช้รูป Selected ตอน active
    },
    {
      id: "lan",
      title: "LAN",
      subtitle: "Connected",
      defaultOn: false,
      icon: intercomeImage,
      activeImg: intercomeSelected, // ← ใช้รูป Selected ตอน active
    },
  ];

  return (
    <section className="mt-6 grid grid-cols-1 lg-1291:grid-cols-[1.1fr_1fr] gap-4">
      {/* Left: Camera card */}
      <div className="rounded-xl bg-white p-2 shadow">
        <div className="relative rounded-lg overflow-hidden bg-gray-100">
          {cam.img ? (
            <img src={cam.img} alt={cam.title} className="w-full h-auto" />
          ) : (
            <div className="aspect-[16/12] w-full bg-gray-200" />
          )}
        </div>
        <div className="flex items-center justify-between px-2 py-2 select-none">
          <h3 className="text-lg font-bold">{cam.title}</h3>
          <span
            className={[
              "text-md font-semibold px-3 py-[2px] rounded-full border",
              cam.status === "online"
                ? "bg-lime-50 text-lime-600 border-lime-200"
                : "bg-rose-50 text-rose-600 border-rose-200",
            ].join(" ")}
          >
            • {cam.status}
          </span>
        </div>
      </div>

      {/* Right: Weather (top) + three device tiles (bottom) */}
      <div className="grid grid-rows-[1fr_auto] gap-3 select-none">
        {/* Weather */}
        <div className="flex rounded-xl bg-cyan p-0 shadow">
          {/* ไอคอนอากาศ placeholder */}

          <div className="flex items-center justify-around w-full whitespace-nowrap">
            <div>
              <img src={cloudyDay1} width={240} alt="" />
            </div>
            <div className="flex flex-col py-5 px-3 items-center">
              <div className="text-sm text-white flex items-center gap-1">
                <i className="material-icons text-white">place</i>
                {met.location}
              </div>
              <div className="text-[60px] text-white">{met.tempC}°c</div>
              <div className="text-white text-[24px]">{met.description}</div>
            </div>
          </div>
        </div>

        {/* Device tiles */}
        <div className="grid grid-cols-3 gap-3">
          {tiles.map((d) => {
            const [on, setOn] = React.useState(!!d.defaultOn);
            // ใช้รูป activeImg ถ้ามี เมื่อ on; ไม่งั้นใช้ icon เดิม
            const iconSrc = on ? d.activeImg ?? d.icon : d.icon;

            return (
              <div
                key={d.id}
                className={[
                  "rounded-xl p-3 shadow border text-center select-none",
                  on
                    ? "bg-cyan border-cyan-200 text-white"
                    : "bg-white border-gray-200",
                ].join(" ")}
              >
                {/* OFF/ON label + switch */}
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span
                    className={[
                      "uppercase",
                      on ? "text-white" : "text-black",
                    ].join(" ")}
                  >
                    {on ? "ON" : "OFF"}
                  </span>
                  <div className="pointer-events-none">
                    <div className="pointer-events-auto">
                      <Switch checked={on} onChange={() => setOn((v) => !v)} />
                    </div>
                  </div>
                </div>

                {/* Icon + title + subtitle */}
                <div className="mt-2 flex flex-col items-center gap-1">
                  <div className="text-4xl text-cyan-500">
                    {iconSrc ? <img src={iconSrc} alt="" /> : null}
                  </div>
                  <div
                    className={[
                      "text-[13px]  font-medium",
                      on ? "text-white" : "text-black",
                    ].join(" ")}
                  >
                    {d.title}
                  </div>
                  <div
                    className={[
                      "text-[12px]",
                      on ? "text-white" : "text-black",
                    ].join(" ")}
                  >
                    {d.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
