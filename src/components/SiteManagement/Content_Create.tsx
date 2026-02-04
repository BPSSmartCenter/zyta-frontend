import React from "react";
import { useTranslation } from "react-i18next";
import { lookupThaiAddress } from "../../api/thaiAddress";
import { useSiteGroups } from "../../hooks/useSiteGroups";
import Dropdown from "../Dropdown";

type CreatePayload = {
  name: string;
  code?: string;
  siteGroupId?: string;
  lat?: number;
  lng?: number;
  zipcode?: string;
  addressProvince?: string;
  addressDistrict?: string;
  addressSubDistrict?: string;
  addressLine?: string;
  brandingLogoDataUrl?: string;
  solaredgeSiteId?: string;
  solaredgeApiKey?: string;
};

type Props = {
  loading?: boolean;
  onCreate: (payload: CreatePayload) => Promise<void>;
  onCancel: () => void;
};

export default function ContentCreate({
  loading = false,
  onCreate,
  onCancel,
}: Props) {
  const { t } = useTranslation("siteManagement");
  const texts = React.useMemo(
    () => ({
      header: {
        title: t("create.title", { defaultValue: "Register new site" }),
        subtitle: t("create.subtitle", {
          defaultValue: "Fill in the details to add a site to the system.",
        }),
      },
      labels: {
        siteName: t("form.labels.siteName", { defaultValue: "Site name" }),
        brandingLogo: t("form.labels.brandingLogo", { defaultValue: "Branding logo" }),
        siteCode: t("form.labels.siteCode", { defaultValue: "Site code" }),
        siteGroup: t("form.labels.siteGroup", { defaultValue: "Site group" }),
        siteGroupCreate: t("form.labels.siteGroupCreate", { defaultValue: "Create new group" }),
        solarEdgeTitle: t("form.labels.solarEdgeTitle", {
          defaultValue: "SolarEdge Credentials",
        }),
        latitude: t("form.labels.latitude", { defaultValue: "Latitude" }),
        longitude: t("form.labels.longitude", { defaultValue: "Longitude" }),
        addressDetail: t("form.labels.addressDetail", { defaultValue: "Address detail" }),
        zipcode: t("form.labels.zipcode", { defaultValue: "Zipcode (auto-fill)" }),
        province: t("form.labels.province", { defaultValue: "Province" }),
        district: t("form.labels.district", { defaultValue: "District" }),
        subDistrict: t("form.labels.subDistrict", { defaultValue: "Sub-district" }),
        solarEdgeSiteId: t("form.labels.solarEdgeSiteId", {
          defaultValue: "SolarEdge Site ID",
        }),
        solarEdgeApiKey: t("form.labels.solarEdgeApiKey", {
          defaultValue: "SolarEdge API Key",
        }),
      },
      placeholders: {
        siteName: t("form.placeholders.siteName", { defaultValue: "e.g. Bangkok HQ" }),
        siteCode: t("form.placeholders.siteCode", {
          defaultValue: "Leave empty to auto generate",
        }),
        siteGroup: t("form.placeholders.siteGroup", { defaultValue: "Select group" }),
        siteGroupCreate: t("form.placeholders.siteGroupCreate", { defaultValue: "e.g. Chula Hospital" }),
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
        solarEdge: t("form.hints.solarEdgeCreate", {
          defaultValue:
            "Provide Site ID and API Key for this site (or leave blank to use system default).",
        }),
        zipAuto: t("form.hints.zipAuto", {
          defaultValue:
            "Once a 5-digit postal code is entered, province/district/sub-district will be suggested automatically.",
        }),
      },
      logo: {
        empty: t("create.logo.empty", {
          defaultValue:
            "Upload a logo to show on reports (PNG / JPG / WEBP up to 2.5MB).",
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
        codeLength: t("form.errors.codeLength", {
          defaultValue: "Site code should be at least 3 characters",
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
        submit: t("create.buttons.submit", { defaultValue: "Save site" }),
        submitting: t("create.buttons.submitting", { defaultValue: "Saving..." }),
        createGroup: t("form.buttons.createGroup", { defaultValue: "Create group" }),
      },
      group: {
        none: t("form.group.none", { defaultValue: "No group" }),
        loading: t("form.group.loading", { defaultValue: "Loading groups..." }),
      },
    }),
    [t]
  );
  const [form, setForm] = React.useState<CreatePayload>({
    name: "",
    code: "",
    siteGroupId: "",
    solaredgeSiteId: "",
    solaredgeApiKey: "",
  });
  const [newGroupName, setNewGroupName] = React.useState("");
  const { groups, loading: groupsLoading, create: createGroup } = useSiteGroups();
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [districtOptions, setDistrictOptions] = React.useState<string[]>([]);
  const [subDistrictOptions, setSubDistrictOptions] = React.useState<string[]>(
    []
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

  const handleChange = (field: keyof CreatePayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const groupOptions = React.useMemo(
    () => [
      { value: "", label: texts.group.none },
      ...groups.map((g) => ({ value: g.id, label: g.name })),
    ],
    [groups, texts.group.none]
  );

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
    if (form.code && form.code.length < 3)
      nextErrors.code = texts.errors.codeLength;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onCreate({
      name: form.name.trim(),
      code: form.code?.trim() || undefined,
      siteGroupId: form.siteGroupId?.trim() || undefined,
      lat: form.lat,
      lng: form.lng,
      zipcode: form.zipcode?.trim() || undefined,
      addressProvince: form.addressProvince?.trim() || undefined,
      addressDistrict: form.addressDistrict?.trim() || undefined,
      addressSubDistrict: form.addressSubDistrict?.trim() || undefined,
      addressLine: form.addressLine?.trim() || undefined,
      brandingLogoDataUrl: logoDataUrl ?? undefined,
      solaredgeSiteId: form.solaredgeSiteId?.trim() || undefined,
      solaredgeApiKey: form.solaredgeApiKey?.trim() || undefined,
    });
  };

  React.useEffect(() => {
    const zip = form.zipcode?.trim() ?? "";
    if (!zip) {
      setZipStatus("idle");
      setZipMessage("");
      setDistrictOptions([]);
      setSubDistrictOptions([]);
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

  const handleLogoFile = async (file: File | null) => {
    if (!file) {
      setLogoDataUrl(null);
      setLogoPreview(null);
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
      setLogoError(null);
    };
    reader.onerror = () => {
      setLogoError(texts.logo.errors.readFail);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-6 p-6 bg-white rounded-lg">
      <div className="flex items-center gap-3 pb-4 border-b">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700 cursor-pointer"
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
            {texts.labels.brandingLogo}
          </label>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 flex flex-col gap-3">
            {logoPreview ? (
              <img
                src={logoPreview}
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
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => handleLogoFile(null)}
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
          {errors.code && (
            <p className="text-xs text-red-500 mt-1">{errors.code}</p>
          )}
        </div>

        <div>
          <label className="font-semibold text-sm block mb-2">
            {texts.labels.siteGroup}
          </label>
          <Dropdown
            options={groupOptions}
            value={form.siteGroupId ?? ""}
            onChange={(val) => handleChange("siteGroupId", val)}
          >
            {({ open, selected, getButtonProps, getMenuProps, getItemProps, options }) => (
              <div className="relative">
                <button
                  {...getButtonProps({
                    className:
                      "h-[44px] w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 font-semibold flex items-center justify-between gap-2 cursor-pointer",
                  })}
                >
                  <span className="whitespace-nowrap">
                    {selected?.label ?? texts.group.none}
                  </span>
                  <i className="material-icons leading-none">
                    {open ? "arrow_drop_up" : "arrow_drop_down"}
                  </i>
                </button>
                <div
                  {...getMenuProps({
                    className: [
                      "absolute left-0 z-50 mt-1 min-w-full w-max max-w-[92vw] rounded-lg border border-gray-200 bg-white p-1 shadow-lg max-h-64 overflow-y-auto overflow-x-visible",
                      open ? "block" : "hidden",
                    ].join(" "),
                  })}
                >
                  {groupsLoading && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {texts.group.loading}
                    </div>
                  )}
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      {...getItemProps(opt, {
                        className:
                          "w-full text-left rounded-md px-3 py-2 text-[14px] hover:bg-gray-100 cursor-pointer whitespace-nowrap",
                      })}
                      title={opt.label}
                    >
                      <span className="block whitespace-nowrap">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Dropdown>

          <div className="mt-3">
            <label className="text-xs font-semibold block mb-2 text-gray-600">
              {texts.labels.siteGroupCreate}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 h-10 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
                placeholder={texts.placeholders.siteGroupCreate}
              />
              <button
                type="button"
                className="h-10 px-3 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-50 cursor-pointer"
                onClick={async () => {
                  const trimmed = newGroupName.trim();
                  if (!trimmed) return;
                  const created = await createGroup(trimmed);
                  if (created?.id) {
                    handleChange("siteGroupId", created.id);
                  }
                  setNewGroupName("");
                }}
              >
                {texts.buttons.createGroup}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div>
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

        <div className="grid gap-4 md:grid-cols-2">
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
                        className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`}
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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="font-semibold text-sm block mb-2">
              {texts.labels.subDistrict}
            </label>
            <Dropdown
              options={subDistrictDropdownOptions}
              value={form.addressSubDistrict ?? ""}
              onChange={(value) => handleChange("addressSubDistrict", value)}
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
                        className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`}
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
          <div className="flex flex-col justify-end">
            <p className="text-xs text-gray-500">{texts.hints.zipAuto}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
            disabled={loading}
          >
            {texts.buttons.cancel}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-md bg-cyan text-white text-sm font-semibold hover:bg-cyan-400 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? texts.buttons.submitting : texts.buttons.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
