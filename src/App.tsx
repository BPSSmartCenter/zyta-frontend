// src/App.tsx
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import {
  Dashboard,
  Register,
  Login,
  TotalAlert,
  FaceRecognize,
  LicensePlates,
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
  CardSandbox,
} from "./pages";
import LanguageSwitcher from "./components/LanguageSwitcher";
import "./App.css";
import ScrollUnlocker from "./hook/ScrollUnlocker";
import ScrollToTop from "./hook/useScrollToTop";
import RequireAdmin from "./routes/RequireAdmin";
import RequireAuth from "./routes/RequireAuth";
import RequireSiteSelected from "./routes/RequireSiteSelected";
import { AppLayout } from "./layouts";
import { FiltersProvider } from "./context/FiltersContext";
import { DeviceInventoryProvider } from "./context/DeviceInventoryContext";
import { FaceRecProvider } from "./context/FaceRecContext";
import { NotisProvider } from "./context/NotisContext";
import BootstrapSitesGate from "./components/BootstrapSitesGate";
import { SiteSelectionModal } from "./components/SiteSelection";
import { useAppSelector } from "./store/hooks";
import { selectAuthUser, selectIsAuthBooting } from "./features/auth";
import type { AuthUser } from "./features/auth";

function dashboardPathFor(user: AuthUser | null) {
  return user?.id ? `/u/${encodeURIComponent(user.id)}/dashboard` : "/";
}

function cardSandboxPathFor(user: AuthUser | null) {
  if (!user?.id) return "/";
  if (user.role !== "admin") return dashboardPathFor(user);
  return `/u/${encodeURIComponent(user.id)}/sandbox/card-board`;
}

function AppBootLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500 text-sm">
      Loading...
    </div>
  );
}

/**
 * รวม providers ที่ **ต้องเรียก API ผู้ใช้** (apiMe, listSites, listNotis, ฯลฯ)
 * ไว้ใต้ RequireAuth เท่านั้น เพื่อไม่ให้ยิง request ตอนยังไม่ได้ login
 * (หน้า public เช่น /, /register, /forgot, /reset จะไม่ mount providers เหล่านี้)
 */
function AuthedProviders({ children }: { children: React.ReactNode }) {
  return (
    <BootstrapSitesGate>
      <DeviceInventoryProvider>
        <FaceRecProvider>
          <FiltersProvider>
            <NotisProvider>
              {children}
              {/* Modal เลือกไซต์ global — overlay ทุกหน้า protected */}
              <SiteSelectionModal />
            </NotisProvider>
          </FiltersProvider>
        </FaceRecProvider>
      </DeviceInventoryProvider>
    </BootstrapSitesGate>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop smooth={true} />
      <ScrollUnlocker />
      <LanguageSwitcher />
      <Routes>
        {/* public — ไม่ mount authed providers */}
        <Route path="/" element={<RootLoginOrDashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/sandbox/card-board" element={<LegacyCardSandboxRedirect />} />

        {/* legacy path */}
        <Route path="/dashboard" element={<LegacyDashboardRedirect />} />

        {/* protected — mount providers หลังผ่าน RequireAuth แล้ว */}
        <Route
          element={
            <RequireAuth>
              <AuthedProviders>
                <Outlet />
              </AuthedProviders>
            </RequireAuth>
          }
        >
          <Route element={<AppLayout />}>
            <Route path="/u/:uid">
              <Route element={<RequireAdmin />}>
                <Route path="sandbox/card-board" element={<CardSandbox />} />
              </Route>

              {/* data routes — require a selected site (or "all") */}
              <Route element={<RequireSiteSelected />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="electric" element={<BillingOverview />} />
                <Route path="electric/meter" element={<ElectricMeter />} />
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
                <Route path="license-plates" element={<LicensePlates />} />
                <Route path="devices" element={<Devices />} />
              </Route>

              {/* admin routes — ไม่ต้องบังคับเลือกไซต์ */}
              <Route path="usermanage" element={<UserManagement />} />
              <Route path="sitemanage" element={<SiteManagement />} />

              {/* site-scoped routes — URL ระบุ site แล้ว ไม่ต้องผ่าน picker guard */}
              <Route path="site/:siteCode">
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="electric" element={<BillingOverview />} />
                <Route path="electric/meter" element={<ElectricMeter />} />
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
                <Route path="license-plates" element={<LicensePlates />} />
              </Route>
            </Route>
          </Route>
        </Route>

        {/* catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Legacy `/dashboard` path → redirect ไปยัง `/u/:uid/dashboard`
 * อ่าน user จาก Redux (ซึ่งถูก bootstrap แล้วจาก main.tsx) ไม่ต้อง fetch ซ้ำ
 */
function LegacyDashboardRedirect() {
  const booting = useAppSelector(selectIsAuthBooting);
  const user = useAppSelector(selectAuthUser);

  if (booting) return <AppBootLoading />;
  return <Navigate to={dashboardPathFor(user)} replace />;
}

function LegacyCardSandboxRedirect() {
  const booting = useAppSelector(selectIsAuthBooting);
  const user = useAppSelector(selectAuthUser);

  if (booting) return <AppBootLoading />;
  return <Navigate to={cardSandboxPathFor(user)} replace />;
}

/**
 * หน้า root "/" : ถ้า login แล้ว → redirect ไป dashboard, ถ้ายัง → แสดง Login
 * อ่าน user จาก Redux (bootstrap ใน main.tsx) — ไม่ fetch /users/me ซ้ำ
 */
function RootLoginOrDashboard() {
  const booting = useAppSelector(selectIsAuthBooting);
  const user = useAppSelector(selectAuthUser);

  if (booting) return <AppBootLoading />;
  if (!user) return <Login />;
  return <Navigate to={dashboardPathFor(user)} replace />;
}

export default App;
