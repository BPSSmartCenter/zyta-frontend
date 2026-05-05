import { useTranslation } from "react-i18next";
import FaceRecPageShell from "../../components/FaceRec/FaceRecPageShell";
import LicensePlatePanel from "../../components/FaceRec/LicensePlatePanel";
import Table from "../../components/FaceRec/Table";

export default function LicensePlate() {
  const { t } = useTranslation("facerec");

  return (
    <FaceRecPageShell
      title={t("nav.licensePlates", { defaultValue: "License Plates" })}
    >
      <LicensePlatePanel />
      <div className="mt-6">
        <Table />
      </div>
    </FaceRecPageShell>
  );
}
