// src/pages/Register.tsx
import { useCallback, useState } from "react";
import RegisterPage from "../components/Auth/RegisterPage";
import Modal from "../components/Modal";
import { useTranslation } from "react-i18next";

export default function Register() {
  const [open, setOpen] = useState(false);
  const [emailForModal, setEmailForModal] = useState("");
  const { t } = useTranslation("signup");

  const handleSubmit = useCallback(
    (email: string, _password: string, _confirmPassword: string) => {
      setEmailForModal(email);
      setOpen(true); // กด Sign up แล้วเด้งโมดัลยืนยันอีเมล
    },
    []
  );

  return (
    <>
      <RegisterPage onSubmit={handleSubmit} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        id="hs-scale-animation-modal"
        icon="mail"
        title={t("modal.title")}
        message={
          <>
            {t("modal.top")} <br />
            {emailForModal}
            <br />
            {t("modal.bottom")}
          </>
        }
        closeLabel={t("modal.close")}
      />
    </>
  );
}
