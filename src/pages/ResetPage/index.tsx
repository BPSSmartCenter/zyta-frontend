import { useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ResetPasswordForm from "./ResetPasswordForm";
import Modal from "../../components/Modal";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  authActions,
  resetPassword,
  selectResetState,
} from "../../features/auth";

export default function Reset() {
  const { t } = useTranslation(["reset"]);
  const [sp] = useSearchParams();
  const token = useMemo(() => sp.get("token") || "", [sp]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const resetState = useAppSelector(selectResetState);

  const submitting = resetState.status === "pending";
  const remoteError =
    resetState.errorCode === "MISSING_RESET_TOKEN"
      ? t("reset.errors.missing_token")
      : resetState.errorCode
      ? t("reset.errors.server")
      : undefined;

  const handleSubmit = useCallback(
    async (password: string) => {
      try {
        await dispatch(resetPassword({ token, password })).unwrap();
      } catch (error) {
        console.error("Reset password failed", error);
      }
    },
    [dispatch, token]
  );

  const handleClose = useCallback(() => {
    dispatch(authActions.clearResetFeedback());
    navigate("/");
  }, [dispatch, navigate]);

  return (
    <>
      <ResetPasswordForm
        onSubmit={handleSubmit}
        onChange={() => dispatch(authActions.clearResetFeedback())}
        submitting={submitting}
        remoteError={remoteError}
      />
      <Modal
        open={resetState.status === "succeeded"}
        onClose={handleClose}
        icon="check"
        title={t("reset.modal.title")}
        message={<>{t("reset.modal.success")}</>}
        closeLabel={t("reset.modal.close")}
      />
    </>
  );
}
