// src/pages/GenerateBillForm.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Dashboard/Navbar";
import Modal from "../components/Modal";
import Dropdown from "../components/Dropdown";
import { useFilters } from "../context/FiltersContext";
import { useUserPath } from "../routes/useUserPath";
import { getElectricDevices } from "../api/electric";
import { getSiteDetails } from "../api/sites";
import { getMeterDashboard, type MeterDashboard } from "../api/meter";
import { createBill } from "../api/billing";

type ManualFormState = {
  meterId: string;
  ereOnPeak: string;
  ereOffPeak: string;
  baseOnPeak: string;
  baseOffPeak: string;
  billingMonth: string;
  billingYear: string;
};

const DEFAULT_FORM_STATE: ManualFormState = {
  meterId: "",
  ereOnPeak: "",
  ereOffPeak: "",
  baseOnPeak: "",
  baseOffPeak: "",
  billingMonth: "",
  billingYear: "",
};

const MONTH_OPTIONS = [
  { value: "01", label: "มกราคม" },
  { value: "02", label: "กุมภาพันธ์" },
  { value: "03", label: "มีนาคม" },
  { value: "04", label: "เมษายน" },
  { value: "05", label: "พฤษภาคม" },
  { value: "06", label: "มิถุนายน" },
  { value: "07", label: "กรกฎาคม" },
  { value: "08", label: "สิงหาคม" },
  { value: "09", label: "กันยายน" },
  { value: "10", label: "ตุลาคม" },
  { value: "11", label: "พฤศจิกายน" },
  { value: "12", label: "ธันวาคม" },
];

const GenerateBillForm: React.FC = () => {
  const {
    searchSite,
    setSearchSite,
    siteOptions,
    selectedSite,
    setSelectedSite,
    date,
    setDate,
  } = useFilters();
  const [formState, setFormState] = React.useState<ManualFormState>(
    DEFAULT_FORM_STATE
  );
  const [meterOptions, setMeterOptions] = React.useState<
    Array<{ value: string; label: string; description?: string; serial?: string }>
  >([]);
  const [siteInfo, setSiteInfo] = React.useState<{
    name?: string;
    address?: string;
  } | null>(null);
  const [loadingOptions, setLoadingOptions] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [meterDashboard, setMeterDashboard] = React.useState<MeterDashboard | null>(null);
  const [loadingDashboard, setLoadingDashboard] = React.useState(false);
  const [meterDashboardError, setMeterDashboardError] = React.useState<string | null>(null);
  const lastPrefillIdRef = React.useRef<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [siteGuardOpen, setSiteGuardOpen] = React.useState(false);
  const navigate = useNavigate();
  const { abs } = useUserPath();

  const normalizedSite = (selectedSite ?? "").trim();
  const requiresSiteSelection = !normalizedSite || normalizedSite === "all";

  React.useEffect(() => {
    setSiteGuardOpen(requiresSiteSelection);
  }, [requiresSiteSelection]);

  React.useEffect(() => {
    if (requiresSiteSelection) {
      setMeterOptions([]);
      setSiteInfo(null);
      setFormState((prev) => ({ ...prev, meterId: "" }));
      setMeterDashboard(null);
      setMeterDashboardError(null);
      return;
    }
    let canceled = false;
    async function fetchData() {
      setLoadingOptions(true);
      setLoadError(null);
      try {
        const [siteResp, devicesResp] = await Promise.all([
          getSiteDetails(normalizedSite),
          getElectricDevices(normalizedSite),
        ]);
        if (canceled) return;

        const rawSite = (siteResp as any)?.data ?? siteResp;
        const siteData = rawSite?.site ?? rawSite ?? null;
        if (siteData) {
          const addressParts = [
            siteData.address_line,
            siteData.address_sub,
            siteData.address_district,
            siteData.address_province,
            siteData.zipcode,
          ]
            .map((part: any) => (typeof part === "string" ? part.trim() : ""))
            .filter(Boolean);
          setSiteInfo({
            name: siteData.name ?? siteData.code ?? "",
            address: addressParts.join(", ") || undefined,
          });
        } else {
          setSiteInfo(null);
        }

        const devicePayload =
          devicesResp?.items ??
          devicesResp?.data?.items ??
          devicesResp?.data ??
          devicesResp ??
          [];
        const mapped = (devicePayload as any[])
          .filter((item) => item?.id)
          .map((item) => {
            const meta = (item?.meta ?? {}) as Record<string, any>;
            const details = (meta.details ?? {}) as Record<string, any>;
            return {
              value: item.id as string,
              label:
                details.name ??
                (typeof item.model === "string"
                  ? item.model.split(":").pop()
                  : "Meter"),
              description: details.location ?? item.siteName ?? "",
              serial:
                details.serialNumber ??
                meta.sn ??
                (typeof item.model === "string"
                  ? item.model.split(":").pop()
                  : undefined),
            };
          });
        setMeterOptions(mapped);
        setFormState((prev) => ({
          ...prev,
          meterId: prev.meterId && mapped.some((m) => m.value === prev.meterId)
            ? prev.meterId
            : mapped[0]?.value ?? "",
        }));
      } catch (err) {
        console.error("[GenerateBillForm] load site/meter failed", err);
        if (!canceled) {
          setLoadError("ไม่สามารถโหลดข้อมูลมิเตอร์ของไซต์นี้ได้");
          setMeterOptions([]);
          setSiteInfo(null);
          setFormState((prev) => ({ ...prev, meterId: "" }));
        }
      } finally {
        if (!canceled) setLoadingOptions(false);
      }
    }
    fetchData();
    return () => {
      canceled = true;
    };
  }, [requiresSiteSelection, normalizedSite]);

  React.useEffect(() => {
    if (!formState.meterId) {
      setMeterDashboard(null);
      setMeterDashboardError(null);
      return;
    }
    lastPrefillIdRef.current = null;
    let canceled = false;
    setLoadingDashboard(true);
    setMeterDashboardError(null);
    getMeterDashboard(formState.meterId)
      .then((data) => {
        if (canceled) return;
        setMeterDashboard(data);
      })
      .catch((err) => {
        console.error("[GenerateBillForm] load meter dashboard failed", err);
        if (!canceled) {
          setMeterDashboard(null);
          setMeterDashboardError("ไม่สามารถดึงข้อมูลมิเตอร์ได้");
        }
      })
      .finally(() => {
        if (!canceled) setLoadingDashboard(false);
      });
    return () => {
      canceled = true;
    };
  }, [formState.meterId]);

  React.useEffect(() => {
    if (!meterDashboard) return;
    if (lastPrefillIdRef.current === meterDashboard.device.id) return;
    lastPrefillIdRef.current = meterDashboard.device.id;
    setFormState((prev) => ({
      ...prev,
      meterId: prev.meterId || meterDashboard.device.id,
      ereOnPeak: formatInputNumber(meterDashboard.totals.onPeakKwh),
      ereOffPeak: formatInputNumber(meterDashboard.totals.offPeakKwh),
    }));
  }, [meterDashboard]);

  const handleSiteGuardClose = React.useCallback(() => {
    setSiteGuardOpen(false);
    navigate(abs("/dashboard"), { replace: true });
  }, [navigate, abs]);

  const YEAR_OPTIONS = React.useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, idx) => {
      const year = current - idx;
      return { value: String(year), label: String(year + 543) };
    });
  }, []);

  const handleInputChange = React.useCallback(
    (field: keyof ManualFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;
        setFormState((prev) => ({ ...prev, [field]: value }));
      },
    []
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!formState.meterId) {
        alert("กรุณาเลือกมิเตอร์ก่อนสร้างบิล");
        return;
      }
      if (requiresSiteSelection) {
        alert("กรุณาเลือก Site ก่อนสร้างบิล");
        return;
      }
      const selectedMeter = meterOptions.find(
        (m) => m.value === formState.meterId
      );
      setSubmitting(true);
      try {
        const payload = {
          ...formState,
          meterLabel: selectedMeter?.label,
          meterSerial: selectedMeter?.serial,
        };
        const bill = await createBill(normalizedSite, payload);
        const billId = bill?.billId;
        if (!billId) {
          throw new Error("bill id missing");
        }
        navigate(
          `${abs("/electric/generate-bill/preview")}?billId=${encodeURIComponent(
            billId
          )}`
        );
      } catch (err) {
        console.error("[GenerateBillForm] create bill failed", err);
        alert("ไม่สามารถสร้างบิลได้ กรุณาลองใหม่");
      } finally {
        setSubmitting(false);
      }
    },
    [navigate, abs, formState, meterOptions, normalizedSite, requiresSiteSelection]
  );

  const handleBack = React.useCallback(() => {
    navigate(abs("/electric?view=trend"));
  }, [navigate, abs]);

  return (
    <Sidebar>
      <div className="min-h-screen bg-slate-50">
        <Navbar
          searchSite={searchSite}
          setSearchSite={setSearchSite}
          siteOptions={siteOptions}
          selectedSite={selectedSite}
          setSelectedSite={setSelectedSite}
          date={date as any}
          setDate={setDate as any}
        />

        <div className="mx-auto w-full max-w-xl px-6 py-10">
          <button
            onClick={handleBack}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            กลับไปหน้าบิล
          </button>

          <div className="w-full rounded-[32px] bg-slate-50/90 p-8">
            <h1 className="text-center text-2xl font-semibold text-slate-900">
              คำนวณค่าไฟฟ้า
            </h1>
            {siteInfo && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  {siteInfo.name ?? "Site"}
                </p>
                <p className="mt-1">
                  ที่อยู่: {siteInfo.address ?? "ไม่ระบุ"}
                </p>
              </div>
            )}
            {loadError && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </div>
            )}
            {meterDashboardError && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {meterDashboardError}
              </div>
            )}
            {loadingDashboard && (
              <div className="mt-3 text-sm text-slate-500">
                กำลังโหลดข้อมูลจากมิเตอร์...
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                เลือกมิเตอร์ที่ต้องการสร้างบิล
                <select
                  value={formState.meterId}
                  onChange={handleInputChange("meterId")}
                  disabled={loadingOptions || meterOptions.length === 0}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {loadingOptions && (
                    <option value="">กำลังโหลดรายการมิเตอร์...</option>
                  )}
                  {!loadingOptions && meterOptions.length === 0 && (
                    <option value="">ไม่พบมิเตอร์ในไซต์นี้</option>
                  )}
                  {meterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                      {opt.description ? ` - ${opt.description}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                E<sub>RE</sub> (On Peak) จากมิเตอร์ (kWh)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.ereOnPeak}
                  onChange={handleInputChange("ereOnPeak")}
                  placeholder="0.00 kWh"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                E<sub>RE</sub> (Off Peak) จากมิเตอร์ (kWh)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.ereOffPeak}
                  onChange={handleInputChange("ereOffPeak")}
                  placeholder="0.00 kWh"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Base (On Peak %Discount) ที่ผู้ใช้กรอก (บาท/หน่วย)
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={formState.baseOnPeak}
                  onChange={handleInputChange("baseOnPeak")}
                  placeholder="0.0000 บาท/หน่วย"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Base (Off Peak %Discount) ที่ผู้ใช้กรอก (บาท/หน่วย)
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={formState.baseOffPeak}
                  onChange={handleInputChange("baseOffPeak")}
                  placeholder="0.0000 บาท/หน่วย"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                เดือน / ปี ที่ต้องการสร้างบิล
                <div className="grid w-full grid-cols-2 gap-3">
                  <Dropdown
                    options={MONTH_OPTIONS}
                    value={formState.billingMonth}
                    onChange={(value) =>
                      setFormState((prev) => ({ ...prev, billingMonth: value }))
                    }
                  >
                    {({
                      getButtonProps,
                      getMenuProps,
                      getItemProps,
                      options,
                      open,
                      selected,
                    }) => (
                      <div className="relative w-full">
                        <button
                          {...getButtonProps({
                            className:
                              "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50 cursor-pointer",
                          })}
                        >
                          <span>{selected?.label ?? "เลือกเดือน"}</span>
                          <svg
                            className={`h-4 w-4 text-slate-500 transition ${
                              open ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M6 8l4 4 4-4" />
                          </svg>
                        </button>
                        {open && (
                          <div
                            {...getMenuProps({
                              className:
                                "absolute bottom-full mb-2 w-full rounded-2xl border border-slate-100 bg-white py-2 shadow-lg",
                            })}
                          >
                            {options.map((opt) => (
                              <button
                                key={opt.value}
                                {...getItemProps(opt, {
                                  className: `flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                                    opt.value === formState.billingMonth
                                      ? "text-cyan-600 font-semibold"
                                      : "text-slate-700"
                                  } hover:bg-slate-50 cursor-pointer`,
                                })}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Dropdown>

                  <Dropdown
                    options={YEAR_OPTIONS}
                    value={formState.billingYear}
                    onChange={(value) =>
                      setFormState((prev) => ({ ...prev, billingYear: value }))
                    }
                  >
                    {({
                      getButtonProps,
                      getMenuProps,
                      getItemProps,
                      options,
                      open,
                      selected,
                    }) => (
                      <div className="relative w-full">
                        <button
                          {...getButtonProps({
                            className:
                              "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50 cursor-pointer",
                          })}
                        >
                          <span>{selected?.label ?? "เลือกปี"}</span>
                          <svg
                            className={`h-4 w-4 text-slate-500 transition ${
                              open ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M6 8l4 4 4-4" />
                          </svg>
                        </button>
                        {open && (
                          <div
                            {...getMenuProps({
                              className:
                                "absolute bottom-full mb-2 w-full rounded-2xl border border-slate-100 bg-white py-2 shadow-lg",
                            })}
                          >
                            {options.map((opt) => (
                              <button
                                key={opt.value}
                                {...getItemProps(opt, {
                                  className: `flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                                    opt.value === formState.billingYear
                                      ? "text-cyan-600 font-semibold"
                                      : "text-slate-700"
                                  } hover:bg-slate-50 cursor-pointer`,
                                })}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Dropdown>
                </div>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className={[
                  "mt-2 w-full rounded-2xl px-5 py-3 text-base font-semibold text-white transition",
                  submitting
                    ? "bg-[#9bdfff] cursor-not-allowed"
                    : "bg-[#1cb5ff] hover:bg-[#11a2e6] cursor-pointer",
                ].join(" ")}
              >
                {submitting ? "กำลังสร้างบิล..." : "คำนวณค่าไฟฟ้า"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Modal
        open={siteGuardOpen}
        id="manual-billing-site-required"
        icon="cancel"
        title="กรุณาเลือก Site ก่อนใช้งาน"
        message="โปรดเลือก Site จากเมนูด้านบน (Navbar) ก่อนเริ่มคำนวณบิลค่าไฟ"
        closeLabel="โอเค"
        onClose={handleSiteGuardClose}
      />
    </Sidebar>
  );
};

export default GenerateBillForm;

function formatInputNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number(value).toFixed(2);
}
