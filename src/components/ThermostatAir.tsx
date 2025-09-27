import React from "react";

type ThermostatAirProps = {
  unit: string;
  maxLabel: string;
  valueLabel: string;
  initialValue: number;
  medium?: number;
  high?: number;
};

const ThermostatAir: React.FC<ThermostatAirProps> = ({
  unit,
  maxLabel,
  valueLabel,
  initialValue,
  medium = 25,
  high = 50,
}) => {
  return (
    <div className="relative select-none">
      <div className="relative flex items-center justify-center">
        <div>
          {initialValue >= high ? (
            <div className="w-[270px] h-[270px] rounded-full bg-transparent ]">
              <div className="border-[1px] w-[244px] h-[244px] border-[#FFFFFF80] shadow-[0px_0px_30px_5px_#FF4D4D] rounded-[100%] bg-[#FF4D4D] top-[13px] left-[13px] absolute">
                <div className="w-[220px] h-[220px] bg-gradient-to-r from-[#FF4D4D] to-[#FF4D4D] rounded-full absolute top-[12px] left-[13px] border-1 border-white"></div>
                <div className="absolute w-[200px] h-[200px] rounded-full top-[22px] left-[22px] bg-gradient-to-r from-[#F5F5F9] to-[#E4E8EE]">
                  <div className="absolute shadow-2xl w-[172px] h-[172px] rounded-full top-[15px] left-[15px] bg-gradient-to-r from-[#cbcfd5] to-[#fafbfc]">
                    <div className="absolute w-[15px] h-[15px] rounded-full left-[109px] top-[20px] bg-gradient-to-r from-[#d9d9d9] to-[#FAFBFC] "></div>
                  </div>
                </div>
              </div>
            </div>
          ) : initialValue >= medium ? (
            <div className="w-[270px] h-[270px] rounded-full bg-transparent ]">
              <div className="border-[1px] w-[244px] h-[244px] border-[#FFFFFF80] shadow-[0px_0px_30px_5px_#ffac13] rounded-[100%] bg-[#FFA500] top-[13px] left-[13px] absolute">
                <div className="w-[220px] h-[220px] bg-gradient-to-r from-[#ffb733] to-[#ffac13] rounded-full absolute top-[12px] left-[13px] "></div>
                <div className="absolute w-[200px] h-[200px] rounded-full top-[22px] left-[22px] bg-gradient-to-r from-[#F5F5F9] to-[#E4E8EE]">
                  <div className="absolute shadow-2xl w-[172px] h-[172px] rounded-full top-[15px] left-[15px] bg-gradient-to-r from-[#cbcfd5] to-[#fafbfc]">
                    <div className="absolute w-[15px] h-[15px] rounded-full left-[109px] top-[20px] bg-gradient-to-r from-[#d9d9d9] to-[#FAFBFC] "></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-[270px] h-[270px] rounded-full bg-[#93FEB0] shadow-[0px_-5px_30px_0px_#93FEB0]">
              <div className="absolute border-[1px] w-[244px] h-[244px] border-[#FFFFFF80] rounded-[100%] bg-[#7fe89b] top-[13px] left-[13px]">
                <div className="w-[220px] h-[220px] bg-gradient-to-r from-[#9DFC6A] to-[#A2FC8C] rounded-full absolute top-[12px] left-[13px] shadow-[0px_0px_30px_5px_rgba(157,252,106,0.3)] "></div>
                <div className="absolute w-[200px] h-[200px] rounded-full top-[22px] left-[22px] bg-gradient-to-r from-[#F5F5F9] to-[#E4E8EE] shadow-[0_15px_30px_0px_#8E9BAE]">
                  <div className="absolute shadow-2xl w-[172px] h-[172px] rounded-full top-[15px] left-[15px] bg-gradient-to-r from-[#cbcfd5] to-[#fafbfc]">
                    <div className="absolute w-[15px] h-[15px] rounded-full left-[109px] top-[20px] bg-gradient-to-r from-[#d9d9d9] to-[#FAFBFC] "></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ✅ Thermostat Overlay พร้อมค่าแสดงผล */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <div className="">
            <p className="flex text-[#424242] items-center gap-1 text-gray-500 text-xl font-bold">
              {valueLabel}
            </p>
          </div>
          <p className="text-[40px] font-bold text-gray-700">
            {initialValue}
            {unit}
          </p>
          <p className="flex text-[#424242] items-center gap-1 text-gray-500 text-xl font-bold">
            {maxLabel}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThermostatAir;
