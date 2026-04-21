import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App.tsx";
import "./i18n";
import "preline/preline";
import { store } from "./store/store";
import { bootstrapAuth } from "./features/auth";

// เริ่ม probe session ก่อน render UI ทำงาน parallel กับการ mount React
// ผลลัพธ์จะถูกเก็บใน state.auth (bootStatus, user)
// App.tsx จะรอ bootStatus === "ready" ก่อนตัดสินใจ route
store.dispatch(bootstrapAuth());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <Suspense
        fallback={
          <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500 text-sm">
            Loading…
          </div>
        }
      >
        <App />
      </Suspense>
    </Provider>
  </StrictMode>
);
