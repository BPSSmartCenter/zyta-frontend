import { useState, useCallback } from "react";
import LoginPage from "../components/Auth/LoginPage";
import Modal from "../components/Modal";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { login as mockLogin } from "../data/Dashboard/auth";

export default function Login() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("signin");
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    (email: string, password: string) => {
      try {
        const response = mockLogin({ email: email.trim(), password });
        if ("error" in response) {
          setOpen(true);
          return;
        }

        setOpen(false);
        navigate("/dashboard");
      } catch (error) {
        console.error("Mock login failed", error);
        setOpen(true);
      }
    },
    [navigate]
  );

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
