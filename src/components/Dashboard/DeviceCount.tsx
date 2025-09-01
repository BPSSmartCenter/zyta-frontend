import RadialBar from "../RadialBar";
import DonutLegend from "../DonutLegend";
import {
  cctvImage,
  intercomeImage,
  solarImage,
  windImage,
  waterTapImage,
} from "../../assets/index";

export default function DeviceCount() {
  return (
    <form className="flex flex-col py-2 px-3 gap-3 hover:cursor-default">
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        DEVICES
      </h1>
      <div className="flex">
        <RadialBar
          value={(45 / (45 + 89)) * 100}
          label="Offline"
          mainColor="#FB3F3F"
          primaryColor="#A9DB4E"
          bg="#FFFFFF"
          height={170}
          width={170}
          hollowSize="65%"
          rounded
          offsets={{ labelOffsetY: -6, valueOffsetY: 8 }}
          valueStyle={{ fontSize: 22, fontWeight: 600, color: "#111827" }}
          prefix="%"
        />
        <div className="flex flex-col gap-3">
          <h1 className="text-[24px] font-semibold">Cameras</h1>
          <div className="flex gap-2">
            <div className="flex flex-col w-[85px] h-[60px]] bg-[#F8FBFE] text-[#39B8EE] rounded-[10px] justify-center items-center gap-1">
              <DonutLegend
                items={[{ label: "Offline", color: "#FB3F3F" }]}
                labelClassName="text-[#39B8EE] text-[15px]"
              />
              <h1 className="text-[25px] font-semibold">45</h1>
            </div>
            <div className="flex flex-col w-[85px] h-[60px]] bg-[#F8FBFE] text-[#39B8EE] rounded-[10px] justify-center items-center gap-1">
              <DonutLegend
                items={[{ label: "Online", color: "#A9DB4E" }]}
                labelClassName="text-[#39B8EE] text-[15px]"
              />
              <h1 className="text-[25px] font-semibold">89</h1>
            </div>
          </div>
          <h1 className="mt-2 text-[24px] font-semibold text-[#1E1E1E]">
            Total <span>134</span>
          </h1>
        </div>
      </div>

      <ul className="flex flex-col gap-7 font-inter text-[16px] text-cyan-500">
        <li className="flex gap-4 justify-around">
          <div className="flex items-center gap-4">
            <img src={cctvImage} alt="" width={36} />
            <span>
              จำนวนกล้อง <span className="text-red-500 font-semibold">24</span>
            </span>
          </div>
          <li className="flex items-center gap-4 ">
            <img src={intercomeImage} alt="" width={36} />
            <span>
              intercome <span className="text-red-500 font-semibold">45</span>
            </span>
          </li>
        </li>
        <li className="flex gap-4 justify-around">
          <div className="flex items-center gap-4">
            <img src={waterTapImage} alt="" width={36} />
            <span>
              มิเตอร์น้ำ <span className="text-red-500 font-semibold">45</span>
            </span>
          </div>
          <li className="flex items-center gap-4">
            <img src={solarImage} alt="" width={36} />
            <span>
              มิเตอร์ไฟ <span className="text-red-500 font-semibold">34</span>
            </span>
          </li>
        </li>
        <li className="flex gap-4 justify-around">
          <div className="flex items-center gap-4">
            <img src={windImage} alt="" width={36} />
            <span>
              อากาศ <span className="text-red-500 font-semibold">87</span>
            </span>
          </div>
          <div className=" w-[155px]"></div>
        </li>
      </ul>
    </form>
  );
}
