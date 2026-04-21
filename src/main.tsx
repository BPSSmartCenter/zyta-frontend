import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App.tsx";
import "./i18n";
import "preline/preline";
import { store } from "./store/store";

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
