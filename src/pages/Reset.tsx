// src/pages/Reset.tsx
import { useCallback, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ResetPasswordPage from "../components/Auth/ResetPasswordPage";
import Modal from "../components/Modal";
import { useTranslation } from "react-i18next";
import { resetPassword } from "../api/auth";

export default function Reset() {
  const { t } = useTranslation(["reset"]);
  const [sp] = useSearchParams();
  const token = useMemo(() => sp.get("token") || "", [sp]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handle = useCallback(
    async (password: string) => {
      if (!token) return;
      await resetPassword(token, password);
      setOpen(true);
    },
    [token]
  );

  return (
    <>
      <ResetPasswordPage onSubmit={handle} />
      <Modal
        open={open}
        onClose={() => navigate("/")}
        icon="check"
        title={t("reset.modal.title")}
        message={<>{t("reset.modal.success")}</>}
        closeLabel={t("reset.modal.close")}
      />
    </>
  );
}
