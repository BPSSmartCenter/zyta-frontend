import React from "react";
import { lookupThaiAddress } from "../../api/thaiAddress";

type CreatePayload = {
  name: string;
  code?: string;
  lat?: number;
  lng?: number;
  zipcode?: string;
  addressProvince?: string;
  addressDistrict?: string;
  addressSubDistrict?: string;
  addressLine?: string;
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
  const [form, setForm] = React.useState<CreatePayload>({
    name: "",
    code: "",
  });
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
  const districtListId = React.useId();
  const subDistrictListId = React.useId();

  const handleChange = (field: keyof CreatePayload, value: string) => {
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
    if (!form.name?.trim()) nextErrors.name = "กรุณากรอกชื่อไซต์";
    if (form.code && form.code.length < 3)
      nextErrors.code = "รหัสไซต์ควรมีอย่างน้อย 3 ตัวอักษร";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onCreate({
      name: form.name.trim(),
      code: form.code?.trim() || undefined,
      lat: form.lat,
      lng: form.lng,
      zipcode: form.zipcode?.trim() || undefined,
      addressProvince: form.addressProvince?.trim() || undefined,
      addressDistrict: form.addressDistrict?.trim() || undefined,
      addressSubDistrict: form.addressSubDistrict?.trim() || undefined,
      addressLine: form.addressLine?.trim() || undefined,
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
      setZipMessage("กำลังดึงข้อมูล...");
      lookupThaiAddress(zip)
        .then((resp) => {
          const payload = resp?.data;
          if (!payload) {
            setZipStatus("error");
            setZipMessage("ไม่พบรหัสไปรษณีย์นี้");
            setDistrictOptions([]);
            setSubDistrictOptions([]);
            return;
          }
          setZipStatus("success");
          setZipMessage(
            `พบข้อมูลจังหวัด ${payload.province?.th ?? "-"} จำนวน ${
              payload.combinations.length
            } ตำบล`
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
          setZipMessage("ดึงข้อมูลรหัสไปรษณีย์ไม่สำเร็จ");
          setDistrictOptions([]);
          setSubDistrictOptions([]);
        });
    }
  }, [form.zipcode]);

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
          <h2 className="text-xl font-semibold">Register new site</h2>
          <p className="text-sm text-gray-500">
            กรอกข้อมูลเบื้องต้นเพื่อเพิ่ม Site เข้าระบบ
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="font-semibold text-sm block mb-2">
            Site name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            placeholder="เช่น Bangkok HQ"
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="font-semibold text-sm block mb-2">Site code</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => handleChange("code", e.target.value)}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            placeholder="ระบุรหัสหรือเว้นว่างให้ระบบสร้างอัตโนมัติ"
          />
          {errors.code && (
            <p className="text-xs text-red-500 mt-1">{errors.code}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="font-semibold text-sm block mb-2">Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={form.lat ?? ""}
              onChange={(e) => handleNumber("lat", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
              placeholder="13.7563"
            />
          </div>
          <div>
            <label className="font-semibold text-sm block mb-2">
              Longitude
            </label>
            <input
              type="number"
              step="0.0001"
              value={form.lng ?? ""}
              onChange={(e) => handleNumber("lng", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
              placeholder="100.5018"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-sm block mb-2">
            Address detail
          </label>
          <textarea
            value={form.addressLine ?? ""}
            onChange={(e) => handleChange("addressLine", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            rows={3}
            placeholder="บ้านเลขที่ / อาคาร / ถนน ฯลฯ"
          />
        </div>

        <div>
          <label className="font-semibold text-sm block mb-2">
            Zipcode (ดึงที่อยู่)
          </label>
          <input
            type="text"
            value={form.zipcode ?? ""}
            onChange={(e) => handleChange("zipcode", e.target.value)}
            maxLength={5}
            className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
            placeholder="เช่น 10100"
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
              Province
            </label>
            <input
              type="text"
              value={form.addressProvince ?? ""}
              onChange={(e) => handleChange("addressProvince", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
              placeholder="จังหวัด"
            />
          </div>
          <div>
            <label className="font-semibold text-sm block mb-2">
              District
            </label>
            <input
              type="text"
              list={districtListId}
              value={form.addressDistrict ?? ""}
              onChange={(e) => handleChange("addressDistrict", e.target.value)}
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
              placeholder="อำเภอ"
            />
            <datalist id={districtListId}>
              {districtOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="font-semibold text-sm block mb-2">
              Sub-district
            </label>
            <input
              type="text"
              list={subDistrictListId}
              value={form.addressSubDistrict ?? ""}
              onChange={(e) =>
                handleChange("addressSubDistrict", e.target.value)
              }
              className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
              placeholder="ตำบล"
            />
            <datalist id={subDistrictListId}>
              {subDistrictOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-xs text-gray-500">
              เมื่อกรอกรหัสไปรษณีย์ครบ 5 หลัก ระบบจะเติมจังหวัด/อำเภอ/ตำบลให้อัตโนมัติ
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-md bg-cyan text-white text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save site"}
          </button>
        </div>
      </form>
    </div>
  );
}
