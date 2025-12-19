import React from "react";
import { useTranslation } from "react-i18next";
import type { SiteRow } from "./site.constant";
import { lookupThaiAddress } from "../../api/thaiAddress";
import Dropdown from "../Dropdown";
import { buildBrandingLogoSrc } from "../../utils/branding";

type UpdatePayload = {
  name?: string;
  code?: string;
  lat?: number;
  lng?: number;
  zipcode?: string;
  addressProvince?: string;
  addressDistrict?: string;
  addressSubDistrict?: string;
  addressLine?: string;
  brandingLogoDataUrl?: string;
  removeBrandingLogo?: boolean;
  solaredgeSiteId?: string;
  solaredgeApiKey?: string;
};

type Props = {
  site: SiteRow;
  loading?: boolean;
  onSave: (payload: UpdatePayload) => Promise<void>;
  onCancel: () => void;
};

export default function ContentEdit({
  site,
  loading = false,
  onSave,
  onCancel,
}: Props) {
  const { t } = useTranslation("siteManagement");
  const texts = React.useMemo(
    () => ({
      header: {
        title: t("edit.title", { defaultValue: "Edit site" }),
        subtitle: t("edit.subtitle", {
          name: site.name ?? "",
          defaultValue: "{{name}}",
        }),
      },
      labels: {
        siteName: t("form.labels.siteName", { defaultValue: "Site name" }),
        siteCode: t("form.labels.siteCode", { defaultValue: "Site code" }),
        solarEdgeTitle: t("form.labels.solarEdgeTitle", {
          defaultValue: "SolarEdge Credentials",
        }),
        solarEdgeSiteId: t("form.labels.solarEdgeSiteId", {
          defaultValue: "SolarEdge Site ID",
        }),
        solarEdgeApiKey: t("form.labels.solarEdgeApiKey", {
          defaultValue: "SolarEdge API Key",
        }),
        brandingLogo: t("form.labels.brandingLogo", { defaultValue: "Branding logo" }),
        latitude: t("form.labels.latitude", { defaultValue: "Latitude" }),
        longitude: t("form.labels.longitude", { defaultValue: "Longitude" }),
        addressDetail: t("form.labels.addressDetail", { defaultValue: "Address detail" }),
        zipcode: t("form.labels.zipcode", { defaultValue: "Zipcode (auto-fill)" }),
        province: t("form.labels.province", { defaultValue: "Province" }),
        district: t("form.labels.district", { defaultValue: "District" }),
        subDistrict: t("form.labels.subDistrict", { defaultValue: "Sub-district" }),
      },
      placeholders: {
        siteName: t("form.placeholders.siteName", { defaultValue: "e.g. Bangkok HQ" }),
        siteCode: t("form.placeholders.siteCodeEdit", {
          defaultValue: "Internal code",
        }),
        solarEdgeSiteId: t("form.placeholders.solarEdgeSiteId", {
          defaultValue: "e.g. 3078000",
        }),
        solarEdgeApiKey: t("form.placeholders.solarEdgeApiKey", {
          defaultValue: "SE_xxxxxxxx",
        }),
        latitude: t("form.placeholders.latitude", { defaultValue: "13.7563" }),
        longitude: t("form.placeholders.longitude", { defaultValue: "100.5018" }),
        addressDetail: t("form.placeholders.addressDetail", {
          defaultValue: "House number / building / road",
        }),
        zipcode: t("form.placeholders.zipcode", { defaultValue: "e.g. 10100" }),
        province: t("form.placeholders.province", { defaultValue: "Province" }),
      },
      hints: {
        solarEdge: t("form.hints.solarEdgeEdit", {
          defaultValue:
            "Adjust Site ID / API Key for SolarEdge (clear to revert to default).",
        }),
        zipInfo: t("form.hints.zipManual", {
          defaultValue: "You can edit from postal code or type manually.",
        }),
      },
      logo: {
        empty: t("edit.logo.empty", {
          defaultValue: "No logo yet. Upload PNG / JPG / WEBP under 2.5MB.",
        }),
        upload: t("form.logo.upload", { defaultValue: "Upload" }),
        change: t("form.logo.change", { defaultValue: "Change" }),
        remove: t("form.logo.remove", { defaultValue: "Remove" }),
        alt: t("form.logo.previewAlt", { defaultValue: "Site logo preview" }),
        errors: {
          notImage: t("form.logo.errors.notImage", {
            defaultValue: "Please select an image file",
          }),
          tooLarge: t("form.logo.errors.tooLarge", {
            defaultValue: "File must be smaller than 2.5MB",
          }),
          readFail: t("form.logo.errors.readFail", {
            defaultValue: "Unable to read file",
          }),
        },
      },
      errors: {
        nameRequired: t("form.errors.nameRequired", {
          defaultValue: "Please enter site name",
        }),
      },
      zip: {
        loading: t("form.zip.loading", { defaultValue: "Fetching address..." }),
        notFound: t("form.zip.notFound", {
          defaultValue: "Postal code not found",
        }),
        failed: t("form.zip.failed", {
          defaultValue: "Unable to fetch address from postal code",
        }),
        success: (province: string, count: number) =>
          t("form.zip.success", {
            province,
            count,
            defaultValue: "Found {{count}} subdistricts in {{province}}",
          }),
        needPostal: t("form.zip.needPostal", {
          defaultValue: "Enter postal code first",
        }),
        selectDistrict: t("form.zip.selectDistrict", {
          defaultValue: "Select district",
        }),
        selectSubDistrict: t("form.zip.selectSubDistrict", {
          defaultValue: "Select sub-district",
        }),
      },
      buttons: {
        cancel: t("form.buttons.cancel", { defaultValue: "Cancel" }),
        submit: t("edit.buttons.submit", { defaultValue: "Save changes" }),
        submitting: t("edit.buttons.submitting", { defaultValue: "Saving..." }),
      },
    }),
    [t, site.name]
  );
  const [form, setForm] = React.useState({
    name: site.name ?? "",
    code: site.code ?? "",
    lat: site.lat ?? undefined,
    lng: site.lng ?? undefined,
    zipcode: site.zipcode ?? "",
    addressProvince: site.addressProvince ?? site.provinceLabel ?? "",
    addressDistrict: site.addressDistrict ?? "",
    addressSubDistrict: site.addressSubDistrict ?? "",
    addressLine: site.addressLine ?? "",
    solaredgeSiteId: site.solaredgeSiteId ?? "",
    solaredgeApiKey: site.solaredgeApiKey ?? "",
  });
  const [logoPreview, setLogoPreview] = React.useState<string | null>(
    site.brandingLogoUrl ?? null
  );
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = React.useState(false);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [districtOptions, setDistrictOptions] = React.useState<string[]>(() =>
    site.addressDistrict ? [site.addressDistrict] : []
  );
  const [subDistrictOptions, setSubDistrictOptions] = React.useState<string[]>(
    () => (site.addressSubDistrict ? [site.addressSubDistrict] : [])
  );
  const [zipStatus, setZipStatus] = React.useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [zipMessage, setZipMessage] = React.useState<string>("");
  const lastLookupRef = React.useRef<string>("");
  const districtDropdownOptions = React.useMemo(() => {
    if (!districtOptions.length) return [];
    const list = districtOptions.map((value) => ({ value, label: value }));
    const current = form.addressDistrict?.trim();
    if (current && !list.some((opt) => opt.value === current)) {
      list.unshift({ value: current, label: current });
    }
    return list;
  }, [districtOptions, form.addressDistrict]);

  const subDistrictDropdownOptions = React.useMemo(() => {
    if (!subDistrictOptions.length) return [];
    const list = subDistrictOptions.map((value) => ({ value, label: value }));
    const current = form.addressSubDistrict?.trim();
    if (current && !list.some((opt) => opt.value === current)) {
      list.unshift({ value: current, label: current });
    }
    return list;
  }, [subDistrictOptions, form.addressSubDistrict]);

  const displayLogoSrc = React.useMemo(
    () => buildBrandingLogoSrc(logoPreview),
    [logoPreview]
  );

  const handleChange = (
    field:
      | "name"
      | "code"
      | "zipcode"
      | "addressProvince"
      | "addressDistrict"
      | "addressSubDistrict"
      | "addressLine"
      | "solaredgeSiteId"
      | "solaredgeApiKey",
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumber = (field: "lat" | "lng", value: string) => {
    const trimmed = value.trim();
    const num = trimmed === "" ? undefined : Number(trimmed);
    const nextValue =
      typeof num === "number" && Number.isFinite(num) ? num : undefined;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name?.trim()) nextErrors.name = texts.errors.nameRequired;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const payload: UpdatePayload = {
      name: form.name.trim(),
      lat: form.lat,
      lng: form.lng,
      zipcode: form.zipcode?.trim() || undefined,
      addressProvince: form.addressProvince?.trim() || undefined,
      addressDistrict: form.addressDistrict?.trim() || undefined,
      addressSubDistrict: form.addressSubDistrict?.trim() || undefined,
      addressLine: form.addressLine?.trim() || undefined,
      brandingLogoDataUrl: logoDataUrl ?? undefined,
      removeBrandingLogo: logoRemoved && !logoDataUrl ? true : undefined,
    };
    const nextSiteId = form.solaredgeSiteId?.trim() ?? "";
    const prevSiteId = site.solaredgeSiteId?.trim() ?? "";
    if (nextSiteId !== prevSiteId) {
      payload.solaredgeSiteId = nextSiteId;
    }
    const trimmedCode = form.code?.trim() ?? "";
    const prevCode = site.code?.trim() ?? "";
    if (trimmedCode !== prevCode) {
      payload.code = trimmedCode || undefined;
    }
    const nextApiKey = form.solaredgeApiKey?.trim() ?? "";
    const prevApiKey = site.solaredgeApiKey?.trim() ?? "";
    if (nextApiKey !== prevApiKey) {
      payload.solaredgeApiKey = nextApiKey;
    }
    await onSave(payload);
  };

  React.useEffect(() => {
    const zip = form.zipcode?.trim() ?? "";
    if (!zip) {
      setZipStatus("idle");
      setZipMessage("");
      return;
    }
    if (/^\d{5}$/.test(zip) && zip !== lastLookupRef.current) {
      lastLookupRef.current = zip;
      setZipStatus("loading");
      setZipMessage(texts.zip.loading);
      lookupThaiAddress(zip)
        .then((resp) => {
          const payload = resp?.data;
          if (!payload) {
            setZipStatus("error");
            setZipMessage(texts.zip.notFound);
            setDistrictOptions([]);
            setSubDistrictOptions([]);
            return;
          }
          setZipStatus("success");
          setZipMessage(
            texts.zip.success(payload.province?.th ?? "-", payload.combinations.length)
          );
          const districts = payload.districts.map((d) => d.th);
          const subDistricts = payload.subDistricts.map((s) => s.th);
          setDistrictOptions(districts);
          setSubDistrictOptions(subDistricts);
          setForm((prev) => ({
            ...prev,
            addressProvince: payload.province?.th ?? prev.addressProvince,
            addressDistrict:
              prev.addressDistrict && districts.includes(prev.addressDistrict)
                ? prev.addressDistrict
                : districts[0] ?? prev.addressDistrict,
            addressSubDistrict:
              prev.addressSubDistrict &&
              subDistricts.includes(prev.addressSubDistrict)
                ? prev.addressSubDistrict
                : subDistricts[0] ?? prev.addressSubDistrict,
          }));
        })
        .catch(() => {
          setZipStatus("error");
          setZipMessage(texts.zip.failed);
          setDistrictOptions([]);
          setSubDistrictOptions([]);
        });
    }
  }, [form.zipcode, texts.zip]);

  const handleLogoFile = (file: File | null) => {
    if (!file) {
      setLogoDataUrl(null);
      setLogoPreview(site.brandingLogoUrl ?? null);
      setLogoRemoved(false);
      setLogoError(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLogoError(texts.logo.errors.notImage);
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setLogoError(texts.logo.errors.tooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setLogoDataUrl(result);
      setLogoPreview(result);
      setLogoRemoved(false);
      setLogoError(null);
    };
    reader.onerror = () => setLogoError(texts.logo.errors.readFail);
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoDataUrl(null);
    setLogoRemoved(true);
    setLogoError(null);
  };

  return (
    <div className="mt-6 p-6 bg-white rounded-lg">
      <div className="flex items-center gap-3 pb-4 border-b">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700"
          onClick={onCancel}
        >
          <i className="material-icons-outlined">arrow_back</i>
        </button>
        <div>
          <h2 className="text-xl font-semibold">{texts.header.title}</h2>
          <p className="text-sm text-gray-500">{texts.header.subtitle}</p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="font-semibold text-sm block mb-2">
            {texts.labels.siteName} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            placeholder={texts.placeholders.siteName}
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="font-semibold text-sm block mb-2">
            {texts.labels.siteCode}
          </label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => handleChange("code", e.target.value)}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            placeholder={texts.placeholders.siteCode}
          />
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-sm">
              {texts.labels.solarEdgeTitle}
            </p>
            <p className="text-xs text-gray-500">{texts.hints.solarEdge}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="font-semibold text-sm block mb-2">
                {texts.labels.solarEdgeSiteId}
              </label>
              <input
                type="text"
                value={form.solaredgeSiteId ?? ""}
                onChange={(e) => handleChange("solaredgeSiteId", e.target.value)}
                className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
                placeholder={texts.placeholders.solarEdgeSiteId}
              />
            </div>
            <div>
              <label className="font-semibold text-sm block mb-2">
                {texts.labels.solarEdgeApiKey}
              </label>
              <input
                type="password"
                value={form.solaredgeApiKey ?? ""}
                onChange={(e) => handleChange("solaredgeApiKey", e.target.value)}
                className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
                placeholder={texts.placeholders.solarEdgeApiKey}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="font-semibold text-sm block mb-2">
            {texts.labels.brandingLogo}
          </label>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 flex flex-col gap-3">
            {logoPreview ? (
              <img
                src={displayLogoSrc ?? ""}
                alt={texts.logo.alt}
                className="h-20 w-32 object-contain mx-auto"
              />
            ) : (
              <p className="text-xs text-slate-500 text-center">
                {texts.logo.empty}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-cyan text-white text-sm font-semibold hover:bg-cyan-500 cursor-pointer"
              >
                {logoPreview ? texts.logo.change : texts.logo.upload}
              </button>
              {(logoPreview || site.brandingLogoUrl) && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white cursor-pointer"
                >
                  {texts.logo.remove}
                </button>
              )}
            </div>
            {logoError && (
              <p className="text-xs text-red-500 text-center">{logoError}</p>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(event) => handleLogoFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="font-semibold text-sm block mb-2">
              {texts.labels.latitude}
            </label>
            <input
              type="number"
              step="0.0001"
              value={form.lat ?? ""}
              onChange={(e) => handleNumber("lat", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
              placeholder={texts.placeholders.latitude}
            />
          </div>
          <div>
            <label className="font-semibold text-sm block mb-2">
              {texts.labels.longitude}
            </label>
            <input
              type="number"
              step="0.0001"
              value={form.lng ?? ""}
              onChange={(e) => handleNumber("lng", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
              placeholder={texts.placeholders.longitude}
            />
          </div>
        </div>

        <div>
            <label className="font-semibold text-sm block mb-2">
              {texts.labels.addressDetail}
            </label>
          <textarea
            value={form.addressLine ?? ""}
            onChange={(e) => handleChange("addressLine", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            rows={3}
            placeholder={texts.placeholders.addressDetail}
          />
        </div>

        <div>
            <label className="font-semibold text-sm block mb-2">
              {texts.labels.zipcode}
            </label>
          <input
            type="text"
            value={form.zipcode ?? ""}
            onChange={(e) => handleChange("zipcode", e.target.value)}
            maxLength={5}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            placeholder={texts.placeholders.zipcode}
          />
          {zipMessage && (
            <p
              className={`text-xs mt-1 ${
                zipStatus === "error" ? "text-red-500" : "text-gray-500"
              }`}
            >
              {zipMessage}
            </p>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
          <div>
            <label className="font-semibold text-sm block mb-2">
              {texts.labels.province}
            </label>
            <input
              type="text"
              value={form.addressProvince ?? ""}
              onChange={(e) => handleChange("addressProvince", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
              placeholder={texts.placeholders.province}
            />
          </div>
          <div>
            <label className="font-semibold text-sm block mb-2">
              {texts.labels.district}
            </label>
            <Dropdown
              options={districtDropdownOptions}
              value={form.addressDistrict ?? ""}
              onChange={(value) => handleChange("addressDistrict", value)}
            >
              {({
                open,
                selected,
                getButtonProps,
                getMenuProps,
                getItemProps,
                options,
              }) => {
                const disabled = options.length === 0;
                return (
                  <div className="relative w-full">
                    <button
                      {...getButtonProps({
                        disabled,
                        className: [
                          "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50",
                          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                        ].join(" "),
                      })}
                    >
                      <span className="truncate">
                        {selected?.label ??
                          (disabled ? texts.zip.needPostal : texts.zip.selectDistrict)}
                      </span>
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
                    {open && !disabled && (
                      <div
                        {...getMenuProps({
                          className:
                            "absolute bottom-full mb-2 w-full rounded-2xl border border-slate-100 bg-white py-2 shadow-lg max-h-64 overflow-y-auto",
                        })}
                      >
                        {options.map((opt) => (
                          <button
                            key={opt.value}
                            {...getItemProps(opt, {
                              className: `flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                                opt.value === form.addressDistrict
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
                );
              }}
            </Dropdown>
          </div>
          <div>
            <label className="font-semibold text-sm block mb-2">
              {texts.labels.subDistrict}
            </label>
            <Dropdown
              options={subDistrictDropdownOptions}
              value={form.addressSubDistrict ?? ""}
              onChange={(value) =>
                handleChange("addressSubDistrict", value)
              }
            >
              {({
                open,
                selected,
                getButtonProps,
                getMenuProps,
                getItemProps,
                options,
              }) => {
                const disabled = options.length === 0;
                return (
                  <div className="relative w-full">
                    <button
                      {...getButtonProps({
                        disabled,
                        className: [
                          "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-normal text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50",
                          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                        ].join(" "),
                      })}
                    >
                      <span className="truncate">
                        {selected?.label ??
                          (disabled ? texts.zip.needPostal : texts.zip.selectSubDistrict)}
                      </span>
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
                    {open && !disabled && (
                      <div
                        {...getMenuProps({
                          className:
                            "absolute bottom-full mb-2 w-full rounded-2xl border border-slate-100 bg-white py-2 shadow-lg max-h-64 overflow-y-auto",
                        })}
                      >
                        {options.map((opt) => (
                          <button
                            key={opt.value}
                            {...getItemProps(opt, {
                              className: `flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                                opt.value === form.addressSubDistrict
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
                );
              }}
            </Dropdown>
          </div>
        </div>
        <p className="text-xs text-gray-500">{texts.hints.zipInfo}</p>

        <div className="flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-50"
            disabled={loading}
          >
            {texts.buttons.cancel}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-md bg-cyan text-white text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading ? texts.buttons.submitting : texts.buttons.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
