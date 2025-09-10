import { useState, useCallback } from "react";
import LoginPage from "../components/Auth/LoginPage";
import Modal from "../components/Modal";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("signin");
  const navigate = useNavigate();

  const FAKE_EMAIL = "BPS@gmail.com";
  const FAKE_PASSWORD = "Admin098765";

  // ให้โมดัลเด้งเมื่อกด Sign in
  const handleSubmit = useCallback((email: string, password: string) => {
    // TODO: คุณอาจเรียก API ตรวจสอบก่อน แล้วค่อย setOpen(true) ตามผลลัพธ์ก็ได้
    console.log(email, password);

    if (email === FAKE_EMAIL && password === FAKE_PASSWORD) {
      // ✅ ถ้าถูกต้อง
      navigate("/dashboard");
    } else {
      // ❌ ถ้าไม่ตรง เด้ง modal
      setOpen(true);
    }
  }, []);

  return (
    <>
      <LoginPage onSubmit={handleSubmit} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon="cancel" // "warning" | "mail" | "cancel"
        title={t("modal.title")}
        message={
          <>
            {t("modal.top")}
            <br />
            {t("modal.mid")}
            <br />
            {t("modal.bottom")}
          </>
        }
        closeLabel={t("modal.close")}
      />
    </>
  );
}
