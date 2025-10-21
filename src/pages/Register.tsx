// src/pages/Register.tsx
import { useCallback, useState, useEffect } from "react";
import RegisterPage from "../components/Auth/RegisterPage";
import Modal from "../components/Modal";
import { useTranslation } from "react-i18next";
import { register as apiRegister, resendVerification } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";

export default function Register() {
  const [open, setOpen] = useState(false);
  const [emailForModal, setEmailForModal] = useState("");
  const [serverEmailError, setServerEmailError] = useState<string>("");
  const { t } = useTranslation("signup");
  const navigate = useNavigate();
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const [submitting, setSubmitting] = useState(false);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    if (!submitting) return;
    const itv = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(itv);
  }, [submitting]);
  const loadingLabel = submitting
    ? `${t("actions.loading")}${".".repeat(dots)}`
    : t("actions.signup");

  const handleSubmit = useCallback(
    async (
      email: string,
      password: string,
      _confirm: string,
      extras?: { firstName: string; lastName: string }
    ) => {
      setServerEmailError(""); // ล้าง error เก่า
      setSubmitting(true);
      try {
        await apiRegister({
          email,
          password,
          firstName: extras?.firstName ?? "User",
          lastName: extras?.lastName ?? "BPS",
        });
        setEmailForModal(email);
        setOpen(true);
        // หรือ navigate("/") ไปหน้า login หลังสมัคร
      } catch (e) {
        // เดิม: alert("Register failed")
        if (isAxiosError(e) && e.response?.status === 409) {
          // ⬅️ เจอ email ซ้ำ
          setServerEmailError(
            t("fields.email.error") || "This email is already registered."
          );
          return;
        }
        console.error(e);
        alert("Register failed");
      } finally {
        setSubmitting(false);
      }
    },
    [t, navigate]
  );

  const handleResend = useCallback(async () => {
    if (!emailForModal) return;
    try {
      setResendState("sending");
      await resendVerification(emailForModal);
      setResendState("sent");
    } catch (e) {
      console.error(e);
      setResendState("error");
    }
  }, [emailForModal]);

  return (
    <>
      <RegisterPage
        onSubmit={handleSubmit}
        serverEmailError={serverEmailError}
        onChangeEmail={() => setServerEmailError("")}
        submitting={submitting}
        submitLabel={loadingLabel}
      />

      <Modal
        open={open}
        onClose={() => navigate("/")}
        id="hs-scale-animation-modal"
        icon="mail"
        title={t("modal.title")}
        message={
          <>
            {t("modal.top")} <br />
            <b>{emailForModal}</b>
            <br />
            {t("modal.bottom")}
            <div className="mt-3 text-sm">
              <span className="mr-2 select-none">{t("modal.no_email")}</span>
              <button
                className="underline disabled:opacity-50 cursor-pointer"
                onClick={handleResend}
                disabled={resendState === "sending" || resendState === "sent"}
              >
                {resendState === "idle" && `${t("modal.resend")}`}
                {resendState === "sending" && `${t("modal.sending")}`}
                {resendState === "sent" && `${t("modal.resent")}`}
                {resendState === "error" && `${t("modal.no_success")}`}
              </button>
            </div>
          </>
        }
        closeLabel={t("modal.close")}
      />
    </>
  );
}
