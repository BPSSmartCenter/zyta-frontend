import { useCallback } from "react";
import RegisterForm from "./RegisterForm";
import Modal from "../../components/Modal";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  authActions,
  registerAccount,
  resendVerificationEmail,
  selectRegisterState,
} from "../../features/auth";

export default function Register() {
  const { t } = useTranslation("signup");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const registerState = useAppSelector(selectRegisterState);

  const submitting = registerState.status === "pending";
  const loadingLabel = submitting ? t("actions.loading") : t("actions.signup");
  const serverEmailError =
    registerState.emailErrorCode === "EMAIL_ALREADY_EXISTS"
      ? t("fields.email.error")
      : "";
  const resendState =
    registerState.resendStatus === "pending"
      ? "sending"
      : registerState.resendStatus === "succeeded"
      ? "sent"
      : registerState.resendStatus === "failed"
      ? "error"
      : "idle";

  const handleSubmit = useCallback(
    async (
      email: string,
      password: string,
      _confirm: string,
      extras?: { firstName: string; lastName: string }
    ) => {
      try {
        await dispatch(
          registerAccount({
            email,
            password,
            firstName: extras?.firstName ?? "User",
            lastName: extras?.lastName ?? "BPS",
          })
        ).unwrap();
      } catch (error) {
        console.error("Register failed", error);
      }
    },
    [dispatch]
  );

  const handleResend = useCallback(async () => {
    if (!registerState.registeredEmail) return;
    try {
      await dispatch(
        resendVerificationEmail({ email: registerState.registeredEmail })
      ).unwrap();
    } catch (error) {
      console.error("Resend verification failed", error);
    }
  }, [dispatch, registerState.registeredEmail]);

  const handleClose = useCallback(() => {
    dispatch(authActions.clearRegisterFeedback());
    navigate("/");
  }, [dispatch, navigate]);

  return (
    <>
      <RegisterForm
        onSubmit={handleSubmit}
        serverEmailError={serverEmailError}
        onChangeEmail={() => dispatch(authActions.clearRegisterEmailError())}
        submitting={submitting}
        submitLabel={loadingLabel}
      />

      <Modal
        open={
          registerState.status === "succeeded" &&
          Boolean(registerState.registeredEmail)
        }
        onClose={handleClose}
        id="hs-scale-animation-modal"
        icon="mail"
        title={t("modal.title")}
        message={
          <>
            {t("modal.top")} <br />
            <b>{registerState.registeredEmail}</b>
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
