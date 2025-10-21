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
        // ��� backend �ͺ 200 ������ ok:true ���� ok:true,already:true  �����Ҽ�ҹ
        if (data?.ok) {
          setStatus("ok");
          return;
        }
        setStatus("bad");
      } catch (e) {
        if (isAxiosError(e)) {
          // �ѹ�ó� backend �ͺ 409/200-already  �����Ҽ�ҹ
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-white to-[#F6FBFF] relative overflow-hidden">
      {/* decorative blurred orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-blue/10 blur-3xl"
      />
      <div
        className={`relative bg-white/90 backdrop-blur p-8 rounded-2xl w-full max-w-md text-center shadow-2xl border border-gray-100 transition-all duration-300 ${
          status === "ok"
            ? "ring-2 ring-lime-200"
            : status === "bad"
            ? "ring-2 ring-rose-200"
            : "ring-1 ring-cyan/20"
        }`}
      >
        {/* top accent bar */}
        <div
          aria-hidden
          className="absolute inset-x-0 -top-px h-1 bg-gradient-to-r from-cyan via-blue to-cyan rounded-t-3xl"
        />
        {status === "checking" && <p>{t("verifying")}</p>}
        {status === "checking" && (
          <div className="mx-auto mt-4 h-10 w-10 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
        )}
        {status === "ok" && (
          <>
            <h1 className="text-[30px] text-lime-500 font-bold mb-2 drop-shadow-sm">
              {t("success")}
            </h1>
            <button
              className="bg-cyan text-white px-6 py-2.5 rounded-lg cursor-pointer mt-10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-transform duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
              onClick={() => navigate("/")}
            >
              {t("login")}
            </button>
          </>
        )}
        {status === "bad" && (
          <>
            <h1 className="text-xl font-bold mb-2 text-rose-500 drop-shadow-sm">
              {t("denied")}
            </h1>
            <p className="mb-4 text-gray-600">{t("go_signin")}</p>
            <button
              className="bg-cyan text-white px-6 py-2.5 rounded-lg cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-transform duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
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
