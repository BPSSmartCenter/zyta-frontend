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
  SiteManagement,
  VerifyEmail,
  Forgot,
  Reset,
  ElectricMeter,
  BillingOverview,
  GenerateBillForm,
  BillPdfPreview,
} from "./pages";
import LanguageSwitcher from "./components/LanguageSwitcher";
import "./App.css";
import ScrollUnlocker from "./hook/ScrollUnlocker";
import ScrollToTop from "./hook/useScrollToTop";
import RequireAuth from "./routes/RequireAuth";
import { AppLayout } from "./layouts";
import { me as apiMe, type MeResponse } from "./api/user";
import { FiltersProvider } from "./context/FiltersContext";
import { DeviceInventoryProvider } from "./context/DeviceInventoryContext";
import { FaceRecProvider } from "./context/FaceRecContext";
import { NotisProvider } from "./context/NotisContext";

const AUTH_BOOT_TIMEOUT_MS = 8000;

async function meWithTimeout(timeoutMs = AUTH_BOOT_TIMEOUT_MS) {
  return Promise.race([
    apiMe(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

function dashboardPathFor(user: MeResponse | null) {
  return user?.id ? `/u/${encodeURIComponent(user.id)}/dashboard` : "/";
}

function AppBootLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500 text-sm">
      Loading...
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <DeviceInventoryProvider>
        <FaceRecProvider>
          <FiltersProvider>
            <NotisProvider>
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

                {/* legacy path */}
                <Route
                  path="/dashboard"
                  element={<LegacyDashboardRedirect />}
                />

                {/* protected */}
                <Route element={<RequireAuth />}>
                  <Route element={<AppLayout />}>
                    <Route path="/u/:uid">
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="electric" element={<BillingOverview />} />
                      <Route
                        path="electric/meter"
                        element={<ElectricMeter />}
                      />
                      <Route
                        path="electric/generate-bill"
                        element={<GenerateBillForm />}
                      />
                      <Route
                        path="electric/generate-bill/preview"
                        element={<BillPdfPreview />}
                      />
                      <Route path="alert" element={<TotalAlert />} />
                      <Route path="facerec" element={<FaceRecognize />} />
                      <Route path="devices" element={<Devices />} />
                      <Route path="usermanage" element={<UserManagement />} />
                      <Route path="sitemanage" element={<SiteManagement />} />
                      {/* site-scoped routes */}
                      <Route path="site/:siteCode">
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="electric" element={<BillingOverview />} />
                        <Route
                          path="electric/meter"
                          element={<ElectricMeter />}
                        />
                        <Route
                          path="electric/generate-bill"
                          element={<GenerateBillForm />}
                        />
                        <Route
                          path="electric/generate-bill/preview"
                          element={<BillPdfPreview />}
                        />
                        <Route path="alert" element={<TotalAlert />} />
                        <Route path="devices" element={<Devices />} />
                        <Route path="facerec" element={<FaceRecognize />} />
                      </Route>
                    </Route>
                  </Route>
                </Route>

                {/* catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </NotisProvider>
          </FiltersProvider>
        </FaceRecProvider>
      </DeviceInventoryProvider>
    </BrowserRouter>
  );
}

function LegacyDashboardRedirect() {
  const [to, setTo] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const user = await meWithTimeout();
        if (!alive) return;
        setTo(dashboardPathFor(user));
      } catch {
        if (!alive) return;
        setTo("/");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  if (!to) return <AppBootLoading />;
  return <Navigate to={to} replace />;
}

/**
 * If already authenticated, redirect root "/" to "/u/:uid/dashboard".
 * Otherwise render the normal Login page.
 */
function RootLoginOrDashboard() {
  const [to, setTo] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const user = await meWithTimeout();
        if (!alive) return;
        setTo(dashboardPathFor(user));
      } catch {
        if (!alive) return;
        setTo("/");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  if (!to) return <AppBootLoading />;
  if (to === "/") return <Login />;
  return <Navigate to={to} replace />;
}
export default App;
