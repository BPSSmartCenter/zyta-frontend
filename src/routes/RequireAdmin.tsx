import { Navigate, Outlet } from "react-router-dom";
import { selectAuthUser } from "../features/auth";
import { useAppSelector } from "../store/hooks";

export default function RequireAdmin() {
  const user = useAppSelector(selectAuthUser);

  if (!user) return null;
  if (user.role !== "admin") {
    const dashboardPath = user.id
      ? `/u/${encodeURIComponent(user.id)}/dashboard`
      : "/";
    return <Navigate to={dashboardPath} replace />;
  }

  return <Outlet />;
}
