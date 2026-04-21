// src/pages/FaceRecognizePage/index.tsx
import Content from "../../components/FaceRec/Content";
import { useLocation } from "react-router-dom";
import { resolveFaceRecKind } from "../../utils/notis";

type FaceRecRouteState = {
  defaultActive?: "licensePlates" | "faceScan";
  noti?: any;
};

export default function FaceRecognize() {
  const location = useLocation();
  const state = (location.state ?? {}) as FaceRecRouteState;

  const derivedDefaultActive: "licensePlates" | "faceScan" = (() => {
    if (state?.defaultActive === "faceScan" || state?.defaultActive === "licensePlates") {
      return state.defaultActive;
    }
    const kind = resolveFaceRecKind(state?.noti as any);
    if (kind === "face") return "faceScan";
    if (kind === "plate") return "licensePlates";
    return "licensePlates";
  })();

  return (
    <div className="p-4 bg-[#F8FBFE]">
      <Content defaultActive={derivedDefaultActive} />
    </div>
  );
}
