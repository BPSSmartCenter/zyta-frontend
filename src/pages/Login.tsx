import { useState, useCallback } from "react";
import LoginPage from "../components/Auth/LoginPage";
import Modal from "../components/Modal";

export default function Login() {
  const [open, setOpen] = useState(false);

  // ให้โมดัลเด้งเมื่อกด Sign in
  const handleSubmit = useCallback((email: string, password: string) => {
    // TODO: คุณอาจเรียก API ตรวจสอบก่อน แล้วค่อย setOpen(true) ตามผลลัพธ์ก็ได้
    console.log(email, password);

    setOpen(true);
  }, []);

  return (
    <>
      <LoginPage onSubmit={handleSubmit} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon="cancel" // "warning" | "mail" | "cancel"
        title="ไม่พบบัญชีนี้"
        message={
          <>
            ไม่พบบัญชีนี้ในระบบ
            <br />
            กรุณาตรวจสอบความถูกต้องของข้อมูลบัญชี
            <br />
            หรือสมัครบัญชีผู้ใช้ใหม่
          </>
        }
        closeLabel="ตกลง"
      />
    </>
  );
}
