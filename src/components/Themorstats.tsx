// src/components/Devices/Water/Themorstat.tsx
import React, { useEffect, useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

type ThermostatProps = {
  unit?: string;
  max: number;
  maxLabel?: React.ReactNode;
  valueLabel?: React.ReactNode;
  initialValue: number; // ใช้เป็นค่าเริ่มต้น (uncontrolled)
  value?: number; // ✅ ใหม่: ถ้าส่งมาจะใช้ค่านี้เป็นตัวแสดงผล (controlled)
};

const Thermostat: React.FC<ThermostatProps> = ({
  unit,
  max,
  maxLabel,
  valueLabel,
  initialValue,
  value,
}) => {
  const [temperature, setTemperature] = useState<number>(initialValue);

  // sync เมื่อ initialValue เปลี่ยน (สำหรับโหมด uncontrolled)
  useEffect(() => {
    setTemperature(initialValue);
  }, [initialValue]);

  // ใช้ค่า value ถ้าถูกส่งมา ไม่งั้นใช้ state ภายใน
  const raw = value ?? temperature;
  const safeValue = Math.min(Math.max(raw, 0), max); // clamp 0..max

  return (
    <div className="relative min-w-[244px] min-h-[244px] select-none">
      <div className="absolute flex items-center justify-center">
        <div className=" border-[1px] w-[244px] h-[244px] border-[#FFFFFF80] rounded-[100%] bg-radial from-[#DEE2E7] to-[#DBE0E7]">
          <div className="w-[220px] h-[220px]  rounded-full absolute top-[12px] left-[13px]">
            <svg style={{ position: "absolute", width: 0, height: 0 }}>
              <defs>
                <linearGradient
                  id="gradientId"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="rgba(32,98,122,1)" />
                  <stop offset="50%" stopColor="rgba(58,180,224,1)" />
                </linearGradient>
              </defs>
            </svg>

            <CircularProgressbar
              value={safeValue}
              strokeWidth={5}
              minValue={0}
              maxValue={max}
              styles={buildStyles({
                pathColor: "url(#gradientId)",
                trailColor: "transparent",
                strokeLinecap: "round",
                pathTransitionDuration: 0.5,
              })}
            />
          </div>
          <div className="absolute w-[200px] h-[200px] rounded-full top-[22px] left-[22px] bg-gradient-to-r from-[#F5F5F9] to-[#E4E8EE] shadow-[0_15px_30px_0px_#8E9BAE]">
            <div className="absolute shadow-2xl w-[172px] h-[172px] rounded-full top-[15px] left-[15px] bg-gradient-to-r from-[#cbcfd5] to-[#fafbfc]">
              <div className="absolute w-[15px] h-[15px] rounded-full left-[109px] top-[20px] bg-gradient-to-r from-[#d9d9d9] to-[#FAFBFC] "></div>
            </div>
          </div>
        </div>

        {/* ✅ Thermostat Overlay พร้อมค่าแสดงผล */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <div className="">
            <p className="flex text-[#424242] items-center gap-1 text-gray-500 text-xl">
              {valueLabel}
            </p>
          </div>
          <p className="text-[40px] font-bold text-gray-700">
            {Math.round(safeValue)}
            {unit}
          </p>
          <p className="flex text-[#424242] items-center gap-1 text-gray-500 text-xl">
            {maxLabel}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Thermostat;
