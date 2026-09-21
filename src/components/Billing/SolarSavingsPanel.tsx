import React from "react";
import { useTranslation } from "react-i18next";
import type { SolarSavingsState } from "../../hooks/useSolarSavings";
import { ELECTRIC_VENDOR_LABELS, type SavingsPeriod } from "../../features/electric";

type Props = {
  savings: SolarSavingsState;
  locale: string;
};

const SECTION =
  "rounded-3xl border border-gray-200 bg-white shadow-[0_20px_35px_rgba(15,23,42,0.08)]";

/**
 * Detail behind the two "real solar savings" cards on the Billing page: how much of the solar
 * energy the customer actually used, what it saved at the site's utility rate, per device and
 * per month. Numbers come from useSolarSavings (features/electric/solarSavings.ts).
 */
const SolarSavingsPanel: React.FC<Props> = ({ savings, locale }) => {
  const { t } = useTranslation(["billing"]);
  const text = React.useMemo(
    () => ({
      title: t("overview.savings.title", { defaultValue: "Real solar savings" }),
      subtitle: t("overview.savings.subtitle", {
        defaultValue:
          "Self-consumed solar energy × the utility rate set for this site — only the kWh that replaced grid power counts as a saving.",
      }),
      loading: t("overview.savings.loading", { defaultValue: "Calculating savings..." }),
      noSolar: t("overview.savings.noSolar", {
        defaultValue: "This site has no solar system with readings (Sigenergy / Huawei).",
      }),
      noRates: t("overview.savings.noRates", {
        defaultValue:
          "Set the electricity rates (on-peak / off-peak / Ft) for this site in Site Management to calculate savings.",
      }),
      error: t("overview.savings.error", { defaultValue: "Could not load solar readings." }),
      estimateBadge: t("overview.savings.estimateBadge", { defaultValue: "Estimate" }),
      estimateNote: t("overview.savings.estimateNote", {
        defaultValue:
          "The backend does not report grid export yet, so all generated energy is counted as self-consumed. The saving is an upper bound until export data arrives.",
      }),
      periods: {
        month: t("overview.savings.periods.month", { defaultValue: "This month" }),
        ytd: t("overview.savings.periods.ytd", { defaultValue: "This year (Jan – today)" }),
      },
      metrics: {
        production: t("overview.savings.metrics.production", { defaultValue: "Generated" }),
        exported: t("overview.savings.metrics.exported", { defaultValue: "Exported to grid" }),
        selfConsumed: t("overview.savings.metrics.selfConsumed", { defaultValue: "Self-consumed" }),
        savings: t("overview.savings.metrics.savings", { defaultValue: "Saved" }),
      },
      rates: {
        label: t("overview.savings.rates.label", { defaultValue: "Rates used" }),
        onPeak: t("overview.savings.rates.onPeak", { defaultValue: "On-peak (weekdays)" }),
        offPeak: t("overview.savings.rates.offPeak", { defaultValue: "Off-peak (weekends)" }),
        ft: t("overview.savings.rates.ft", { defaultValue: "Ft" }),
        perKwh: t("overview.savings.rates.perKwh", { defaultValue: "THB/kWh" }),
      },
      devices: {
        title: t("overview.savings.devices.title", { defaultValue: "By system" }),
        device: t("overview.savings.devices.device", { defaultValue: "System" }),
        vendor: t("overview.savings.devices.vendor", { defaultValue: "Brand" }),
        customer: t("overview.savings.devices.customer", { defaultValue: "Customer / plant" }),
        production: t("overview.savings.devices.production", { defaultValue: "Generated this month (kWh)" }),
        selfConsumed: t("overview.savings.devices.selfConsumed", { defaultValue: "Self-consumed this month (kWh)" }),
        month: t("overview.savings.devices.month", { defaultValue: "Saved this month (THB)" }),
        ytd: t("overview.savings.devices.ytd", { defaultValue: "Saved this year (THB)" }),
      },
      monthly: {
        title: t("overview.savings.monthly.title", { defaultValue: "By month" }),
        month: t("overview.savings.monthly.month", { defaultValue: "Month" }),
        production: t("overview.savings.monthly.production", { defaultValue: "Generated (kWh)" }),
        selfConsumed: t("overview.savings.monthly.selfConsumed", { defaultValue: "Self-consumed (kWh)" }),
        savings: t("overview.savings.monthly.savings", { defaultValue: "Saved (THB)" }),
        empty: t("overview.savings.monthly.empty", { defaultValue: "No readings this year yet" }),
      },
    }),
    [t]
  );

  const kwh = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 1 });
  const thb = (value: number) =>
    value.toLocaleString(locale, { style: "currency", currency: "THB", maximumFractionDigits: 0 });
  const rate = (value: number | null) =>
    value === null ? "-" : value.toLocaleString(locale, { maximumFractionDigits: 4 });
  const monthLabel = (year: number, month: number) =>
    new Date(year, month - 1, 1).toLocaleDateString(locale, { month: "short", year: "numeric" });

  const { data, loading, error, noSolarDevices, tariff } = savings;

  const renderPeriod = (label: string, period: SavingsPeriod) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {!period.hasExportData ? (
          <span
            className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700"
            title={text.estimateNote}
          >
            {text.estimateBadge}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-[30px] font-semibold leading-none text-slate-900">
        {thb(period.savingsThb)}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-[11px] text-slate-400">{text.metrics.production}</dt>
          <dd className="font-semibold text-slate-700">{kwh(period.productionKwh)} kWh</dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-400">{text.metrics.exported}</dt>
          <dd className="font-semibold text-slate-700">
            {period.hasExportData ? `${kwh(period.exportKwh)} kWh` : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-400">{text.metrics.selfConsumed}</dt>
          <dd className="font-semibold text-slate-700">{kwh(period.selfConsumedKwh)} kWh</dd>
        </div>
      </dl>
    </div>
  );

  let body: React.ReactNode;
  if (loading) {
    body = <p className="px-6 py-8 text-sm text-slate-500">{text.loading}</p>;
  } else if (error) {
    body = <p className="px-6 py-8 text-sm text-rose-600">{text.error}</p>;
  } else if (noSolarDevices || !data) {
    body = <p className="px-6 py-8 text-sm text-slate-500">{text.noSolar}</p>;
  } else if (!data.ratesConfigured) {
    body = (
      <div className="px-6 py-8">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          {text.noRates}
        </p>
      </div>
    );
  } else {
    const showEstimateNote = !data.month.hasExportData || !data.ytd.hasExportData;
    body = (
      <div className="space-y-6 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderPeriod(text.periods.month, data.month)}
          {renderPeriod(text.periods.ytd, data.ytd)}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">{text.rates.label}:</span>
          <span>
            {text.rates.onPeak} {rate(tariff.onPeakRate ?? tariff.offPeakRate)} {text.rates.perKwh}
          </span>
          <span>
            {text.rates.offPeak} {rate(tariff.offPeakRate ?? tariff.onPeakRate)} {text.rates.perKwh}
          </span>
          <span>
            {text.rates.ft} {rate(tariff.ftRate)} {text.rates.perKwh}
          </span>
        </div>
        {showEstimateNote ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800">
            {text.estimateNote}
          </p>
        ) : null}

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{text.devices.title}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed">
              <thead>
                <tr className="text-xs tracking-wide text-slate-500">
                  <th className="px-4 py-2 text-left">{text.devices.device}</th>
                  <th className="px-4 py-2 text-left">{text.devices.vendor}</th>
                  <th className="px-4 py-2 text-left">{text.devices.customer}</th>
                  <th className="px-4 py-2 text-right">{text.devices.production}</th>
                  <th className="px-4 py-2 text-right">{text.devices.selfConsumed}</th>
                  <th className="px-4 py-2 text-right">{text.devices.month}</th>
                  <th className="px-4 py-2 text-right">{text.devices.ytd}</th>
                </tr>
              </thead>
              <tbody>
                {data.devices.map((row) => (
                  <tr key={row.device.id} className="border-t border-gray-100 text-sm text-slate-700">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{row.device.label}</span>
                      <span className="block text-[11px] text-slate-400">{row.device.sn}</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.device.vendor === "other" ? "-" : ELECTRIC_VENDOR_LABELS[row.device.vendor]}
                    </td>
                    <td className="px-4 py-3">{row.device.customerName ?? "-"}</td>
                    <td className="px-4 py-3 text-right">{kwh(row.month.productionKwh)}</td>
                    <td className="px-4 py-3 text-right">{kwh(row.month.selfConsumedKwh)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {thb(row.month.savingsThb)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {thb(row.ytd.savingsThb)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{text.monthly.title}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] table-fixed">
              <thead>
                <tr className="text-xs tracking-wide text-slate-500">
                  <th className="px-4 py-2 text-left">{text.monthly.month}</th>
                  <th className="px-4 py-2 text-right">{text.monthly.production}</th>
                  <th className="px-4 py-2 text-right">{text.monthly.selfConsumed}</th>
                  <th className="px-4 py-2 text-right">{text.monthly.savings}</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly
                  .slice()
                  .reverse()
                  .map((row) => (
                    <tr key={row.key} className="border-t border-gray-100 text-sm text-slate-700">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {monthLabel(row.year, row.month)}
                      </td>
                      <td className="px-4 py-3 text-right">{kwh(row.productionKwh)}</td>
                      <td className="px-4 py-3 text-right">{kwh(row.selfConsumedKwh)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {thb(row.savingsThb)}
                      </td>
                    </tr>
                  ))}
                {data.monthly.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                      {text.monthly.empty}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-8 ${SECTION}`}>
      <div className="border-b border-gray-100 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">{text.title}</h2>
        <p className="text-sm text-slate-500">{text.subtitle}</p>
      </div>
      {body}
    </div>
  );
};

export default SolarSavingsPanel;
