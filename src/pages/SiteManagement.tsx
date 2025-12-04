// src/pages/SiteManagement.tsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/SiteManagement/Navbar";
import Content from "../components/SiteManagement/Content";
import ContentCreate from "../components/SiteManagement/Content_Create";
import ContentEdit from "../components/SiteManagement/Content_Edit";
import ContentDetail from "../components/SiteManagement/Content_Detail";
import { ToastProvider, useToast } from "../hook/toastProvider";
import { listSites, registerSite, updateSite, deleteSite } from "../api/sites";
import type { SiteRow } from "../components/SiteManagement/site.constant";

export default function SiteManagement() {
  return (
    <Sidebar>
      <ToastProvider>
        <SiteManagementGuarded />
      </ToastProvider>
    </Sidebar>
  );
}

function SiteManagementGuarded() {
  const [allowed, setAllowed] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const me = await (await import("../api/user")).me();
        setAllowed(String(me.role).toLowerCase() === "admin");
      } catch {
        setAllowed(false);
      }
    })();
  }, []);

  if (allowed === null) {
    return <div className="p-6">Loading…</div>;
  }
  if (!allowed) {
    if (typeof window !== "undefined") {
      window.location.replace("/dashboard");
    }
    return null;
  }
  return <SiteManagementInner />;
}

function SiteManagementInner() {
  const { show } = useToast();
  const [rows, setRows] = React.useState<SiteRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<SiteRow | null>(null);
  const [viewing, setViewing] = React.useState<SiteRow | null>(null);

  const mapSiteRow = React.useCallback((site: any): SiteRow => {
    const province =
      site?.address_province ??
      site?.province_label ??
      site?.province ??
      site?.province_code ??
      site?.provinceCode ??
      "-";
    const lat = typeof site.lat === "number" ? site.lat : null;
    const lng = typeof site.lng === "number" ? site.lng : null;
    return {
      id: site.id ?? site.code ?? site.name,
      name: site.name ?? site.code ?? "-",
      code: site.code ?? "-",
      provinceLabel: String(province || "-"),
      lat,
      lng,
      zipcode: site.zipcode ?? site.postcode ?? null,
      addressProvince: site.address_province ?? null,
      addressDistrict: site.address_district ?? null,
      addressSubDistrict: site.address_sub ?? null,
      addressLine: site.address_line ?? null,
      brandingLogoUrl:
        site.brandingLogoUrl ??
        site.brand_logo_url ??
        site.branding_logo_url ??
        null,
      devicesTotal: site.devices_total ?? site.devicesTotal ?? 0,
      usersCount: site.users_count ?? site.usersCount ?? 0,
      updatedAt: site.updated_at ?? site.updatedAt ?? null,
      allowElectricBilling: Boolean(
        site.allowElectricBilling ?? site.allow_electric_billing
      ),
      allowWaterBilling: Boolean(
        site.allowWaterBilling ?? site.allow_water_billing
      ),
    };
  }, []);

  const refresh = React.useCallback(async (): Promise<SiteRow[]> => {
    setLoading(true);
    try {
      const resp = await listSites();
      const items = Array.isArray(resp?.items)
        ? resp.items
        : Array.isArray(resp)
        ? resp
        : [];
      const mapped = items.map(mapSiteRow);
      setRows(mapped);
      return mapped;
    } catch (e) {
      console.error("listSites failed", e);
      setRows([]);
      show({
        variant: "error",
        message: (
          <span className="text-white font-semibold">
            โหลดรายการไซต์ไม่สำเร็จ
          </span>
        ),
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [mapSiteRow, show]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = React.useCallback(
    async (payload: {
      name: string;
      code?: string;
      lat?: number;
      lng?: number;
      zipcode?: string;
      addressProvince?: string;
      addressDistrict?: string;
      addressSubDistrict?: string;
      addressLine?: string;
      brandingLogoDataUrl?: string;
    }) => {
      try {
        setLoading(true);
        const createdResp = await registerSite(payload);
        const mapped = await refresh();
        const createdRaw =
          (createdResp as any)?.site ?? (createdResp as any)?.data?.site ?? null;
        const createdMapped = createdRaw ? mapSiteRow(createdRaw) : null;
        if (createdMapped) {
          const match =
            mapped.find((r) => r.id === createdMapped.id) ?? createdMapped;
          setViewing(match);
        }
        setCreating(false);
        show({
          variant: "success",
          message: (
            <span className="text-white font-semibold">สร้าง Site สำเร็จ</span>
          ),
        });
      } catch (e) {
        console.error("registerSite failed", e);
        show({
          variant: "error",
          message: (
            <span className="text-white font-semibold">สร้าง Site ไม่สำเร็จ</span>
          ),
        });
      } finally {
        setLoading(false);
      }
    },
    [refresh, show, mapSiteRow]
  );

  const handleUpdate = React.useCallback(
    async (payload: {
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
    }) => {
      if (!editing) return;
      try {
        setLoading(true);
        await updateSite(editing.id, payload);
        const mapped = await refresh();
        const updated =
          mapped.find((r) => r.id === editing.id) ?? editing;
        setViewing((prev) => (prev && prev.id === editing.id ? updated : prev));
        setEditing(null);
        show({
          variant: "success",
          message: (
            <span className="text-white font-semibold">บันทึกข้อมูลไซต์แล้ว</span>
          ),
        });
      } catch (e) {
        console.error("updateSite failed", e);
        show({
          variant: "error",
          message: (
            <span className="text-white font-semibold">แก้ไข Site ไม่สำเร็จ</span>
          ),
        });
      } finally {
        setLoading(false);
      }
    },
    [editing, refresh, show]
  );

  const handleDelete = React.useCallback(
    async (row: SiteRow) => {
      const confirmed =
        typeof window === "undefined"
          ? true
          : window.confirm(`ยืนยันลบไซต์ ${row.name}?`);
      if (!confirmed) return;
      try {
        setLoading(true);
        await deleteSite(row.id);
        await refresh();
        setViewing((prev) => (prev && prev.id === row.id ? null : prev));
        show({
          variant: "success",
          message: (
            <span className="text-white font-semibold">ลบ Site แล้ว</span>
          ),
        });
      } catch (e) {
        console.error("deleteSite failed", e);
        show({
          variant: "error",
          message: (
            <span className="text-white font-semibold">ลบ Site ไม่สำเร็จ</span>
          ),
        });
      } finally {
        setLoading(false);
      }
    },
    [refresh, show]
  );

  return (
    <div className="p-4 bg-[#F8FBFE] min-h-screen">
      <Navbar title="Site management" />
      {creating ? (
        <ContentCreate
          loading={loading}
          onCancel={() => setCreating(false)}
          onCreate={handleCreate}
        />
      ) : editing ? (
        <ContentEdit
          loading={loading}
          site={editing}
          onCancel={() => setEditing(null)}
          onSave={handleUpdate}
        />
      ) : viewing ? (
        <ContentDetail
          site={viewing}
          onBack={() => setViewing(null)}
          onEdit={(row) => setEditing(row)}
          onDelete={handleDelete}
        />
      ) : (
        <Content
          rows={rows}
          loading={loading}
          onRefresh={refresh}
          onCreateClick={() => setCreating(true)}
          onDetail={(row) => setViewing(row)}
        />
      )}
    </div>
  );
}
