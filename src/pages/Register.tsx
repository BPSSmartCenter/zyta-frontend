// src/pages/Register.tsx
import { useCallback, useState } from "react";
import RegisterPage from "../components/Auth/RegisterPage";
import Modal from "../components/Modal";

export default function Register() {
  const [open, setOpen] = useState(false);
  const [emailForModal, setEmailForModal] = useState("");

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
        title="ยืนยันตัวตน"
        message={
          <>
            โปรดยืนยันตัวตนผ่านอีเมลล์ <br />
            {emailForModal}
            <br />
            เพื่อใช้บริการ Dashboard BPS
          </>
        }
        closeLabel="ตกลง"
      />
    </>
  );
}
