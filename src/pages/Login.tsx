import { useState, useCallback } from "react";
import LoginPage from "../components/Auth/LoginPage";
import Modal from "../components/Modal";
import { useTranslation, Trans } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from "../api/auth";
import { me as apiMe } from "../api/user";
import { resendVerification } from "../api/auth";
import { isAxiosError } from "axios";

type ModalType = "generic" | "notVerified";

export default function Login() {
  const [open, setOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>("generic");
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [lastEmail, setLastEmail] = useState<string>("");
  const { t } = useTranslation("signin");
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (email: string, password: string, opts?: { remember: boolean }) => {
      try {
        setLastEmail(email.trim());
        await apiLogin(email.trim(), password, opts?.remember);
        const user = await apiMe();
        if (!user?.id) throw new Error("No UID");
        navigate(`/u/${user.id}/dashboard`, { replace: true });
      } catch (error) {
        // ถ้า backend ส่ง 403 + code=EMAIL_NOT_VERIFIED → โชว์ modal ขอให้ยืนยันอีเมล/กด "ส่งอีกครั้ง"
        if (
          isAxiosError(error) &&
          error.response?.status === 403 &&
          error.response?.data?.code === "EMAIL_NOT_VERIFIED"
        ) {
          setModalType("notVerified");
          setOpen(true);
          return;
        }
        // error อื่น ๆ → modal แจ้งทั่วไป (เช่น รหัสผิด/เซิร์ฟเวอร์ล่ม)
        console.error("Login failed", error);
        setModalType("generic");
        setOpen(true);
      }
    },
    [navigate]
  );

  const handleResend = useCallback(async () => {
    if (!lastEmail) return;
    try {
      setResendState("sending");
      await resendVerification(lastEmail);
      setResendState("sent");
    } catch (e) {
      console.error(e);
      setResendState("error");
    }
  }, [lastEmail]);

  return (
    <>
      <LoginPage onSubmit={handleSubmit} />

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setResendState("idle");
        }}
        icon={modalType === "notVerified" ? "mail" : "cancel"} // "warning" | "mail" | "cancel"
        title={
          modalType === "notVerified"
            ? t("modalNotVerified.title")
            : t("modal.title")
        }
        message={
          modalType === "notVerified" ? (
            <>
              <p className="mb-1">{t("modalNotVerified.top")}</p>
              <p className="mb-2">
                <Trans
                  ns="signin"
                  i18nKey="modalNotVerified.bottom"
                  values={{ lastEmail }}
                  components={{ bold: <b /> }}
                />
              </p>
              <div className="text-sm mt-2">
                <span className="mr-2">{t("modalNotVerified.no_email")}?</span>
                <button
                  className="underline disabled:opacity-50 cursor-pointer"
                  onClick={handleResend}
                  disabled={resendState === "sending" || resendState === "sent"}
                >
                  {resendState === "idle" && t("modalNotVerified.resend")}
                  {resendState === "sending" && t("modalNotVerified.sending")}
                  {resendState === "sent" && t("modalNotVerified.resent")}
                  {resendState === "error" && t("modalNotVerified.no_success")}
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                * {t("modalNotVerified.check_spam")}
              </p>
            </>
          ) : (
            <>
              {t("modal.top")}
              <br />
              {t("modal.mid")}
              <br />
              {t("modal.bottom")}
            </>
          )
        }
        closeLabel={t("modal.close")}
      />
    </>
  );
}
