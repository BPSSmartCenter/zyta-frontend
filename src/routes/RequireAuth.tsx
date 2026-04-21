// src/routes/RequireAuth.tsx
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { me as apiMe } from "../api/user";
import { authActions } from "../features/auth";
import { useAppDispatch } from "../store/hooks";
import { createLoginRedirectState } from "./authRedirect";

export default function RequireAuth() {
  const [ok, setOk] = useState<boolean | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams(); // รองรับเคสที่ route มี :uid

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const user = await apiMe();          // ถ้า cookie ถูกต้องจะได้ user กลับมา
        if (!user?.id) throw new Error();    // กัน shape แปลก
        if (!alive) return;
        dispatch(authActions.setAuthUser(user));
        setOk(true);
      } catch {
        if (!alive) return;
        dispatch(authActions.clearAuthUser());
        setOk(false);
        navigate("/", {
          replace: true,
          state: createLoginRedirectState(location),
        });    // ไม่ได้ล็อกอิน → กลับหน้า Login พร้อมจำหน้าที่ตั้งใจเข้า
      }
    })();

    return () => {
      alive = false;
    };
  }, [dispatch, location, navigate, params.uid]);

  if (ok === null) return null; // จะใส่ spinner ก็ได้
  if (ok === false) return null;

  return <Outlet/>;
}
