import React from "react";
import type { MeterOption } from "../../types/meter";

type Props = {
  open: boolean;
  onClose: () => void;
  meter: MeterOption | null;
  billingTarget?: string;
};

const BillingMeterModal: React.FC<Props> = ({
  open,
  onClose,
  meter,
  billingTarget,
}) => {
  const usage = meter?.todayKwh ?? 0;
  const rate = meter?.isOverall ? 4.5 : 4.75;
  const serviceFee = meter?.isOverall ? 3200 : 680;
  const vatRate = 0.07;

  const energyCost = usage * rate;
  const subtotal = energyCost + serviceFee;
  const vat = subtotal * vatRate;
  const total = subtotal + vat;

  if (!open) return null;

  const breakdown = [
    { label: "พลังงานไฟฟ้า (kWh)", value: `${usage.toLocaleString()} kWh` },
    { label: `อัตราค่าไฟ ${rate.toFixed(2)} บาท/หน่วย`, value: `${energyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท` },
    { label: "ค่าบริการระบบ", value: `${serviceFee.toLocaleString()} บาท` },
    { label: "ภาษีมูลค่าเพิ่ม (7%)", value: `${vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท` },
  ];

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-[32px] border border-[#14334d] bg-[#05172c] p-8 text-white shadow-[0_30px_65px_rgba(5,23,44,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-[#7EAEDA]">
              Billing Preview
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {meter
                ? `สร้างบิล: ${meter.isOverall ? "Overall" : meter.name}`
                : "ยังไม่เลือกมิเตอร์"}
            </h3>
            <p className="text-sm text-[#7EAEDA]">
              {billingTarget
                ? `รอบบิลย้อนหลัง: ${billingTarget}`
                : "ระบบจำลองการคำนวณค่าไฟและแสดง QR Code mockup สำหรับชำระเงิน"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-600/60 px-4 py-2 text-sm font-medium text-white/80 hover:border-white hover:text-white"
          >
            ปิดหน้าต่าง
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[#14334d] bg-[#071f35] p-6">
            <div className="space-y-4 text-sm">
              {breakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[#9fb6cc]">{item.label}</span>
                  <span className="font-semibold text-[#01faf8]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-[#0b2b45] px-5 py-4">
              <div className="text-xs uppercase tracking-[0.4em] text-[#7EAEDA]">
                ยอดที่ต้องชำระ
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                บาท
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#14334d] bg-[#071f35] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7EAEDA]">
              QR PAYMENT MOCKUP
            </p>
            <div className="mt-4 flex flex-col items-center gap-4">
              <div className="rounded-3xl border border-[#10304b] bg-[#051326] p-4 shadow-inner">
                <div className="grid grid-cols-8 gap-1 bg-white/95 p-4">
                  {Array.from({ length: 64 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`block h-3 w-3 ${
                        (idx + Math.floor(idx / 8)) % 3 === 0
                          ? "bg-slate-900"
                          : "bg-white"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-center text-xs text-[#7EAEDA]">
                สแกนเพื่อชำระเงิน (ตัวอย่าง QR code)
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-[#0b2b45] px-4 py-3 text-sm text-[#9fb6cc]">
              <p>ผู้ชำระ: {meter ? meter.siteName : "ไม่ระบุ"}</p>
              <p>รอบบิลล่าสุด: วันนี้ เวลา 10:30 น.</p>
              <p>หมายเหตุ: ข้อมูลทั้งหมดเป็น mock data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingMeterModal;
