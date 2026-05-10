// src/routes/RequireAuth.tsx
import { useEffect, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import {
  selectAuthUser,
  selectIsAuthBooting,
} from "../features/auth";
import { createLoginRedirectState } from "./authRedirect";

type RequireAuthProps = {
  /**
   * Optional wrapper (เช่น AuthedProviders) ที่จะ mount เฉพาะตอนผ่านการตรวจสอบแล้ว
   * เพื่อไม่ให้ context providers ที่ต้องใช้ API ถูก mount ก่อน login
   */
  children?: ReactNode;
};

/**
 * Route guard — ต้องมี user ใน Redux ถึงจะ render children/<Outlet />
 *
 * ✅ อ่านจาก Redux state เท่านั้น (ไม่เรียก /users/me เอง)
 *    bootstrap ถูก dispatch ใน main.tsx ครั้งเดียวต่อ app lifecycle
 *
 * - booting → render null (รอ main splash screen จัดการ)
 * - ready + no user → redirect ไปหน้า "/" พร้อมจำ intended path
 * - ready + has user → render protected routes
 */
export default function RequireAuth({ children }: RequireAuthProps = {}) {
  const booting = useAppSelector(selectIsAuthBooting);
  const user = useAppSelector(selectAuthUser);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!booting && !user) {
      navigate("/login", {
        replace: true,
        state: createLoginRedirectState(location),
      });
    }
  }, [booting, user, navigate, location]);

  // ยังอยู่ระหว่าง bootstrap — ไม่ต้อง render อะไร (main.tsx แสดง splash อยู่)
  if (booting) return null;
  // bootstrap เสร็จแล้วแต่ไม่มี user → useEffect ข้างบนกำลัง redirect ไป "/"
  if (!user) return null;

  // ถ้ามี wrapper (children) ให้ mount wrapper ซึ่งข้างในมี <Outlet /> อยู่แล้ว
  // ถ้าไม่มี children ก็ render <Outlet /> ปกติ — รองรับทั้งสองการใช้งาน
  return <>{children ?? <Outlet />}</>;
}
