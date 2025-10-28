// src/App.tsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  Dashboard,
  Register,
  Login,
  TotalAlert,
  FaceRecognize,
  Devices,
  UserManagement,
  VerifyEmail,
  Forgot,
  Reset,
} from "./pages";
import LanguageSwitcher from "./components/LanguageSwitcher";
import "./App.css";
import ScrollUnlocker from "./hook/ScrollUnlocker";
import ScrollToTop from "./hook/useScrollToTop";
import RequireAuth from "./routes/RequireAuth";
import { me as apiMe } from "./api/user";
import { FiltersProvider } from "./context/FiltersContext";

function App() {
  console.log(`API Base URL: ${import.meta.env.VITE_API_BASE_URL}/api`);
  return (
    <BrowserRouter>
      <FiltersProvider>
        <ScrollToTop smooth={true} />
        <ScrollUnlocker />
        <LanguageSwitcher />
        <Routes>
        {/* public */}
        <Route path="/" element={<RootLoginOrDashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />

        {/* legacy path: redirect ไป /u/:uid/dashboard */}
        <Route path="/dashboard" element={<LegacyDashboardRedirect />} />

        {/* protected */}
        <Route element={<RequireAuth />}>
          <Route path="/u/:uid">
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="alert" element={<TotalAlert />} />
            <Route path="facerec" element={<FaceRecognize />} />
            <Route path="devices" element={<Devices />} />
            <Route path="usermanage" element={<UserManagement />} />
            {/* site-scoped routes */}
            <Route path="site/:siteCode">
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="alert" element={<TotalAlert />} />
              <Route path="devices" element={<Devices />} />
            </Route>
          </Route>
        </Route>

        {/* catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </FiltersProvider>
    </BrowserRouter>
  );
}

/** ตัวช่วย: ถ้าใครยังกด /dashboard อยู่ ให้ redirect ไป /u/:myUid/dashboard */
function LegacyDashboardRedirect() {
  const [to, setTo] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const user = await apiMe();
        if (user?.id) setTo(`/u/${user.id}/dashboard`);
        else setTo("/");
      } catch {
        setTo("/");
      }
    })();
  }, []);
  if (!to) return null;
  return <Navigate to={to} replace />;
}

/**
 * If already authenticated, redirect root "/" to "/u/:uid/dashboard".
 * Otherwise render the normal Login page.
 */
function RootLoginOrDashboard() {
  const [to, setTo] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const user = await apiMe();
        if (user?.id) setTo(`/u/${user.id}/dashboard`);
        else setTo("/");
      } catch {
        setTo("/");
      }
    })();
  }, []);
  if (!to) return null;
  if (to === "/") return <Login />;
  return <Navigate to={to} replace />;
}
export default App;
