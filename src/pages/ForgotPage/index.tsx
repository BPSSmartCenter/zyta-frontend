import { useCallback } from "react";
import ForgotForm from "./ForgotForm";
import Modal from "../../components/Modal";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  authActions,
  forgotPassword,
  selectForgotState,
} from "../../features/auth";

export default function Forgot() {
  const { t } = useTranslation(["reset"]);
  const dispatch = useAppDispatch();
  const forgotState = useAppSelector(selectForgotState);

  const submitting = forgotState.status === "pending";
  const submitLabel = submitting ? t("forgot.actions.checking") : undefined;
  const remoteError =
    forgotState.errorCode === "EMAIL_NOT_FOUND"
      ? t("forgot.errors.not_found")
      : forgotState.errorCode
      ? t("forgot.errors.server")
      : undefined;

  const handleSubmit = useCallback(
    async (email: string) => {
      try {
        await dispatch(forgotPassword({ email })).unwrap();
      } catch (error) {
        console.error("Forgot password failed", error);
      }
    },
    [dispatch]
  );

  return (
    <>
      <ForgotForm
        onSubmit={handleSubmit}
        onChangeEmail={() => dispatch(authActions.clearForgotFeedback())}
        submitting={submitting}
        submitLabel={submitLabel}
        remoteError={remoteError}
      />
      <Modal
        open={forgotState.status === "succeeded" && Boolean(forgotState.email)}
        onClose={() => dispatch(authActions.clearForgotFeedback())}
        icon="mail"
        title={t("forgot.modal.title")}
        message={
          <>
            {t("forgot.modal.sent_to")} <b>{forgotState.email}</b>
          </>
        }
        closeLabel={t("forgot.modal.close")}
      />
    </>
  );
}
