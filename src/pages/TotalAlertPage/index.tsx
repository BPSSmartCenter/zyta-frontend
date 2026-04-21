import Sidebar from "../../components/Sidebar";
import Content from "../../components/TotalAlert/Content";
import Table from "../../components/TotalAlert/Table";
import { statItems } from "../../components/Dashboard/dashboard.constants";
import { CAMERA_ITEMS } from "../../components/TotalAlert/totalAlert.constant";

export default function TotalAlert() {
  return (
    <Sidebar>
      <div className="p-4 bg-[#F8FBFE]">
        <Content statItems={statItems} cameraItems={CAMERA_ITEMS.slice(0, 3)} />
        <div className="mt-6">
          <Table />
        </div>
      </div>
    </Sidebar>
  );
}
