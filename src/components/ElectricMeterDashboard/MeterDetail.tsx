import React from "react";
import { useNavigate } from "react-router-dom";
import type { MeterOption } from "../../types/meter";
import { useUserPath } from "../../routes/useUserPath";

type Props = {
  meter: MeterOption | null;
  onChange?: () => void;
};

const STATUS_COLOR: Record<
  MeterOption["status"],
  { dot: string; text: string }
> = {
  online: { dot: "bg-emerald-400", text: "text-emerald-300" },
  warning: { dot: "bg-amber-400", text: "text-amber-300" },
  offline: { dot: "bg-rose-400", text: "text-rose-300" },
};

const BILLING_STATUS_COLOR: Record<
  NonNullable<MeterOption["billingStatus"]>,
  string
> = {
  paid: "border border-emerald-300 bg-emerald-400/10 text-emerald-200",
  pending: "border border-amber-200 bg-amber-300/10 text-amber-200",
};

const MeterDetail: React.FC<Props> = ({ meter, onChange }) => {
  const navigate = useNavigate();
  const { abs } = useUserPath();
  const statusColor = meter
    ? STATUS_COLOR[meter.status]
    : { dot: "bg-slate-300", text: "text-slate-300" };
  const canCreateBill = Boolean(meter && !meter.isOverall);
  const billDisabled = meter?.billingStatus === "paid";
  const billingTarget = meter?.billingOutstandingMonth ?? "เดือนก่อนหน้า";

  return (
    <>
      <div className="mt-4 rounded-3xl border border-[#14334d] bg-[#05172c] p-6 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[20px] font-semibold uppercase tracking-[0.1em] text-white">
              Active Meter
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-lg font-semibold text-[#0bb1f4]">
              {meter ? (
                <>
                  <span>{meter.siteName}</span>
                  <span className="text-[#51707f]">/</span>
                  <span>{meter.isOverall ? "Overall" : meter.name}</span>
                </>
              ) : (
                <span>ยังไม่ได้เลือกมิเตอร์</span>
              )}
            </div>
            <p className="text-sm text-[#7EAEDA]">
              {meter
                ? meter.description ??
                  "มิเตอร์ mock data ใช้สำหรับออกแบบเท่านั้น"
                : "เลือกมิเตอร์หรือมุมมอง Overall เพื่อเริ่มต้นแสดงผล"}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={onChange}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-400/60 px-4 py-2 text-sm font-medium text-white transition hover:border-white/70 hover:text-white/80"
            >
              เลือกมิเตอร์
            </button>
            {canCreateBill && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (billDisabled) return;
                    navigate(abs("/electric/generate-bill"));
                  }}
                  className={[
                    "inline-flex items-center justify-center rounded-2xl border border-slate-400/60 px-4 py-2 text-sm font-medium text-white transition",
                    billDisabled
                      ? "cursor-not-allowed border-white/20 text-white/40"
                      : "hover:border-white/70 hover:text-white/80",
                  ].join(" ")}
                  aria-disabled={billDisabled}
                >
                  สร้างบิลชำระเงิน
                </button>
                <p className="text-xs text-[#9fb6cc]">
                  บิลเดือน : {billingTarget}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 text-sm text-white sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">
              สถานะ
            </p>
            <div className="mt-1 flex items-center gap-2 font-semibold">
              <span className={`h-2.5 w-2.5 rounded-full ${statusColor.dot}`} />
              <span className={statusColor.text}>
                {meter ? meter.status : "Waiting"}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">
              อัปเดตล่าสุด
            </p>
            <p className="mt-1 font-semibold text-[#01faf8]">
              {meter ? meter.lastSync : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">
              ตำแหน่ง
            </p>
            <p className="mt-1 font-semibold text-[#01faf8]">
              {meter?.location ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">
              วันนี้ (kWh)
            </p>
            <p className="mt-1 font-semibold text-[#01faf8]">
              {meter ? meter.todayKwh.toLocaleString() : "-"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-white/80">
          <span className="font-semibold uppercase tracking-[0.2em]">
            ข้อมูลประจำเดือน
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white">
            {meter?.billingMonth ?? "ไม่ระบุ"}
          </span>
          {!meter?.isOverall && meter?.billingStatus && (
            <span
              className={[
                "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
                BILLING_STATUS_COLOR[meter.billingStatus],
              ].join(" ")}
            >
              {meter.billingStatus === "paid" ? "ชำระแล้ว" : "รอการชำระ"}
            </span>
          )}
        </div>
      </div>

    </>
  );
};

export default MeterDetail;
