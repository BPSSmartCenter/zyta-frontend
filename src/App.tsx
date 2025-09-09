import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard, Register, Login, TotalAlert, FaceRecognize } from "./pages";
import LanguageSwitcher from "./components/LanguageSwitcher";
import "./App.css";

function App() {
  return (
    <>
      <BrowserRouter>
        <LanguageSwitcher />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/alert" element={<TotalAlert />} />
          <Route path="/facerec" element={<FaceRecognize />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
