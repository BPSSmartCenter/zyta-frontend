import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
import "preline/preline";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500 text-sm">
          Loading…
        </div>
      }
    >
      <App />
    </Suspense>
  </StrictMode>
);
