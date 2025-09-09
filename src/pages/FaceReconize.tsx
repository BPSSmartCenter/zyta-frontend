import Sidebar from "../components/Sidebar";
import Content from "../components/FaceRec/Content";
import FaceRecTable from "../components/FaceRec/Table";
FaceRecTable;
export default function FaceRecognize() {
  return (
    <Sidebar>
      <div className="p-4 bg-[#F8FBFE]">
        <Content defaultActive="licensePlates" />
      </div>
    </Sidebar>
  );
}
