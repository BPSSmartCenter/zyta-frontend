import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  Dashboard,
  Register,
  Login,
  TotalAlert,
  FaceRecognize,
  Devices,
  UserManagement,
} from "./pages";
import LanguageSwitcher from "./components/LanguageSwitcher";
import "./App.css";
import ScrollUnlocker from "./hook/ScrollUnlocker";

function App() {
  return (
    <>
      <BrowserRouter>
        <ScrollUnlocker />
        <LanguageSwitcher />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/alert" element={<TotalAlert />} />
          <Route path="/facerec" element={<FaceRecognize />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/usermanage" element={<UserManagement />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
