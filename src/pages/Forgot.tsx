// src/pages/Forgot.tsx
import { useCallback, useMemo, useRef, useState } from "react";
import ForgotPage from "../components/Auth/ForgotPage";
import Modal from "../components/Modal";
import { useTranslation } from "react-i18next";
import { checkEmailExists, requestPasswordReset } from "../api/auth";

export default function Forgot() {
  const { t } = useTranslation(["reset"]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dots, setDots] = useState(0);
  const [remoteError, setRemoteError] = useState<string | undefined>(undefined);
  const timerRef = useRef<number | null>(null);

  const submitLabel = useMemo(() => {
    if (!submitting) return undefined;
    const base = t("forgot.actions.checking");
    return base + ".".repeat((dots % 3) + 1); // ., .., ...
  }, [submitting, dots, t]);

  const startSpinner = () => {
    setDots(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(
      () => setDots((d) => (d + 1) % 3),
      400
    );
  };
  const stopSpinner = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handle = useCallback(
    async (e: string) => {
      setEmail(e);
      setRemoteError(undefined);
      setSubmitting(true);
      startSpinner();
      try {
        const res = await checkEmailExists(e);
        if (!res?.exists) {
          setRemoteError(t("forgot.errors.not_found"));
          return; // ไม่ยิง forgot-password
        }
        await requestPasswordReset(e);
        setOpen(true);
      } catch (err) {
        console.error("forgot flow failed:", err);
        setRemoteError(t("forgot.errors.server"));
      } finally {
        stopSpinner();
        setSubmitting(false);
      }
    },
    [t]
  );

  return (
    <>
      <ForgotPage
        onSubmit={handle}
        submitting={submitting}
        submitLabel={submitLabel}
        remoteError={remoteError}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon="mail"
        title={t("forgot.modal.title")}
        message={
          <>
            {t("forgot.modal.sent_to")} <b>{email}</b>
          </>
        }
        closeLabel={t("forgot.modal.close")}
      />
    </>
  );
}
