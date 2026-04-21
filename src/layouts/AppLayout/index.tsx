import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

export default function AppLayout() {
  return (
    <Sidebar>
      <Outlet />
    </Sidebar>
  );
}
