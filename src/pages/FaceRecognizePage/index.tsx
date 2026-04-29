import { useTranslation } from "react-i18next";
import FaceRecPageShell from "../../components/FaceRec/FaceRecPageShell";
import FaceScanPanel from "../../components/FaceRec/FaceScanPanel";
import TableFaceScan from "../../components/FaceRec/TableFace";

export default function FaceRecognize() {
  const { t } = useTranslation("facerec");

  return (
    <FaceRecPageShell
      title={t("nav.faceRecognize", { defaultValue: "Face Recognize" })}
    >
      <FaceScanPanel />
      <div className="mt-6">
        <TableFaceScan />
      </div>
    </FaceRecPageShell>
  );
}
