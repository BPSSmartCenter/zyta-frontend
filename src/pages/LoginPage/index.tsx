import { useCallback } from "react";
import LoginForm from "./LoginForm";
import Modal from "../../components/Modal";
import { useTranslation, Trans } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  authActions,
  loginWithCredentials,
  resendVerificationEmail,
  selectLoginState,
} from "../../features/auth";
import {
  buildPostLoginPath,
  getReturnToFromState,
} from "../../routes/authRedirect";

export default function Login() {
  const { t } = useTranslation("signin");
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const loginState = useAppSelector(selectLoginState);
  const submitting = loginState.status === "pending";
  const returnTo = getReturnToFromState(location.state);

  const resendState =
    loginState.resendStatus === "pending"
      ? "sending"
      : loginState.resendStatus === "succeeded"
      ? "sent"
      : loginState.resendStatus === "failed"
      ? "error"
      : "idle";

  const handleSubmit = useCallback(
    async (email: string, password: string, opts?: { remember: boolean }) => {
      try {
        const user = await dispatch(
          loginWithCredentials({
            email: email.trim(),
            password,
            remember: opts?.remember,
          })
        ).unwrap();
        if (!user?.id) throw new Error("No UID");
        navigate(buildPostLoginPath(user.id, returnTo), { replace: true });
      } catch (error) {
        console.error("Login failed", error);
      }
    },
    [dispatch, navigate, returnTo]
  );

  const handleResend = useCallback(async () => {
    if (!loginState.lastEmail) return;
    try {
      await dispatch(
        resendVerificationEmail({ email: loginState.lastEmail })
      ).unwrap();
    } catch (error) {
      console.error("Resend verification failed", error);
    }
  }, [dispatch, loginState.lastEmail]);

  return (
    <>
      <LoginForm onSubmit={handleSubmit} submitting={submitting} />

      <Modal
        open={Boolean(loginState.issue)}
        onClose={() => dispatch(authActions.clearLoginFeedback())}
        icon={loginState.issue === "notVerified" ? "mail" : "cancel"} // "warning" | "mail" | "cancel"
        title={
          loginState.issue === "notVerified"
            ? t("modalNotVerified.title")
            : loginState.issue === "inactive"
            ? t("modalInactive.title")
            : t("modal.title")
        }
        message={
          loginState.issue === "notVerified" ? (
            <>
              <p className="mb-1">{t("modalNotVerified.top")}</p>
              <p className="mb-2">
                <Trans
                  ns="signin"
                  i18nKey="modalNotVerified.bottom"
                  values={{ lastEmail: loginState.lastEmail }}
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
          ) : loginState.issue === "inactive" ? (
            <>
              {t("modalInactive.top")}
              <br />
              {t("modalInactive.mid")}
              <br />
              {t("modalInactive.bottom")}
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
        closeLabel={
          loginState.issue === "inactive"
            ? t("modalInactive.close")
            : t("modal.close")
        }
      />
    </>
  );
}
