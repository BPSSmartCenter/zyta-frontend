// src/routes/RequireAuth.tsx
import { useEffect, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { me as apiMe } from "../api/user";

export default function RequireAuth() {
  const [ok, setOk] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const params = useParams(); // รองรับเคสที่ route มี :uid

  useEffect(() => {
    (async () => {
      try {
        const user = await apiMe();          // ถ้า cookie ถูกต้องจะได้ user กลับมา
        if (!user?.id) throw new Error();    // กัน shape แปลก
        setOk(true);
      } catch {
        setOk(false);
        navigate("/", { replace: true });    // ไม่ได้ล็อกอิน → กลับหน้า Login
      }
    })();
  }, [navigate, params.uid]);

  if (ok === null) return null; // จะใส่ spinner ก็ได้
  if (ok === false) return null;

  return <Outlet/>;
}
