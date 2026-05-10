import { Navigate, Outlet } from "react-router-dom";
import { selectAuthUser } from "../features/auth";
import { useAppSelector } from "../store/hooks";

export default function RequireAdmin() {
  const user = useAppSelector(selectAuthUser);

  if (!user) return null;
  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
