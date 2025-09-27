// src/pages/FaceReconize.tsx
import Sidebar from "../components/Sidebar";
import Content from "../components/FaceRec/Content";

export default function FaceRecognize() {
  return (
    <Sidebar>
      <div className="p-4 bg-[#F8FBFE]">
        <Content />
      </div>
    </Sidebar>
  );
}
