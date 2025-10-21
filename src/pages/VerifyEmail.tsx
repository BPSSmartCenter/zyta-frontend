// src/pages/VerifyEmail.tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyEmail } from "../api/auth";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";

export default function VerifyEmail() {
  const { t } = useTranslation("verify");
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const token = sp.get("token") || "";
  const [status, setStatus] = useState<"checking" | "ok" | "bad">("checking");

  useEffect(() => {
    (async () => {
      try {
        if (!token) {
          setStatus("bad");
          return;
        }
        const { data } = await verifyEmail(token);
        // ถ้า backend ตอบ 200 ไม่ว่า ok:true หรือ ok:true,already:true → ถือว่าผ่าน
        if (data?.ok) {
          setStatus("ok");
          return;
        }
        setStatus("bad");
      } catch (e) {
        if (isAxiosError(e)) {
          // กันกรณี backend ตอบ 409/200-already → ถือว่าผ่าน
          if (e.response?.status === 409) {
            setStatus("ok");
            return;
          }
        }
        setStatus("bad");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-full text-center">
        {status === "checking" && <p>{t("verifying")}</p>}
        {status === "ok" && (
          <>
            <h1 className="text-[30px] text-lime-500 font-bold mb-2">
              {t("success")}
            </h1>
            <button
              className="bg-cyan text-white px-4 py-2 rounded cursor-pointer mt-10"
              onClick={() => navigate("/")}
            >
              {t("login")}
            </button>
          </>
        )}
        {status === "bad" && (
          <>
            <h1 className="text-xl font-bold mb-2">{t("denied")}</h1>
            <p className="mb-4">{t("go_signin")}</p>
            <button
              className="bg-cyan text-white px-4 py-2 rounded cursor-pointer"
              onClick={() => navigate("/")}
            >
              {t("login")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
