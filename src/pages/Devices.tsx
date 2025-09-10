import Sidebar from "../components/Sidebar";
import Content from "../components/Devices/Content";

export default function Devices() {
  return (
    <Sidebar>
      <div className="p-4 bg-[#F8FBFE]">
        <Content />
      </div>
    </Sidebar>
  );
}
