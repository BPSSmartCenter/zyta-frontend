// src/pages/SiteManagementPage/index.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/SiteManagement/Navbar";
import Content from "../../components/SiteManagement/Content";
import ContentCreate from "../../components/SiteManagement/Content_Create";
import ContentEdit from "../../components/SiteManagement/Content_Edit";
import ContentDetail from "../../components/SiteManagement/Content_Detail";
import { ToastProvider, useToast } from "../../hook/toastProvider";
import { listSites, registerSite, updateSite, deleteSite } from "../../api/sites";
import { PROVINCE_CODE_TO_TH } from "../../data/Dashboard/data";
import type { SiteRow } from "../../components/SiteManagement/site.constant";
import Modal from "../../components/Modal";

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
  const { t } = useTranslation("siteManagement");
  const [allowed, setAllowed] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const me = await (await import("../../api/user")).me();
        setAllowed(String(me.role).toLowerCase() === "admin");
      } catch {
        setAllowed(false);
      }
    })();
  }, []);

  if (allowed === null) {
    return (
      <div className="p-6">
        {t("page.loading", { defaultValue: "Loading..." })}
      </div>
    );
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
  const { t } = useTranslation("siteManagement");
  const { show } = useToast();
  const texts = React.useMemo(
    () => ({
      title: t("page.title", { defaultValue: "Site management" }),
      toasts: {
        listFailed: t("toasts.listFailed", {
          defaultValue: "Unable to load sites",
        }),
        createSuccess: t("toasts.createSuccess", { defaultValue: "Site created" }),
        createFailed: t("toasts.createFailed", { defaultValue: "Unable to create site" }),
        updateSuccess: t("toasts.updateSuccess", {
          defaultValue: "Site updated",
        }),
        updateFailed: t("toasts.updateFailed", {
          defaultValue: "Unable to update site",
        }),
        deleteSuccess: t("toasts.deleteSuccess", { defaultValue: "Site deleted" }),
        deleteFailed: t("toasts.deleteFailed", { defaultValue: "Unable to delete site" }),
      },
      confirmDelete: t("confirm.deleteSite", {
        name: "{{name}}",
        defaultValue: "Delete site {{name}}?",
      }),
    }),
    [t]
  );
  const toastNode = React.useCallback(
    (key: keyof typeof texts.toasts) => (
      <span className="text-white font-semibold">{texts.toasts[key]}</span>
    ),
    [texts.toasts]
  );
  const [rows, setRows] = React.useState<SiteRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<SiteRow | null>(null);
  const [viewing, setViewing] = React.useState<SiteRow | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<SiteRow | null>(null);

  const mapSiteRow = React.useCallback((site: any): SiteRow => {
    const province =
      site?.address_province ??
      site?.province_label ??
      site?.province ??
      site?.province_code ??
      site?.provinceCode ??
      "-";
    const provinceKey = String(province ?? "").trim();
    const normalizedProvince =
      provinceKey === "0"
        ? "-"
        : PROVINCE_CODE_TO_TH[provinceKey] ?? (provinceKey || "-");
    const lat = typeof site.lat === "number" ? site.lat : null;
    const lng = typeof site.lng === "number" ? site.lng : null;
    const groupFromApi =
      site?.site_group ??
      site?.site_groups ??
      site?.siteGroup ??
      site?.group ??
      null;
    const groupLabel = groupFromApi?.name ?? null;
    const groupId =
      groupFromApi?.id ??
      site?.site_group_id ??
      site?.siteGroupId ??
      null;
    /* Utility: check direct site.utility first, then fall back to group.utility */
    const directUtility =
      site?.utility ?? null;
    const groupUtility =
      groupFromApi?.utility ??
      groupFromApi?.utilities ??
      null;
    const utilityFromApi = directUtility ?? groupUtility;
    const utilityId =
      utilityFromApi?.id ??
      site?.utility_id ??
      site?.utilityId ??
      null;
    const utilityLabel = utilityFromApi?.name ?? null;
    return {
      id: site.id ?? site.code ?? site.name,
      name: site.name ?? site.code ?? "-",
      code: site.code ?? "-",
      groupId: groupId ?? null,
      groupLabel: groupLabel ?? null,
      utilityId: utilityId ?? null,
      utilityLabel: utilityLabel ?? null,
      provinceLabel: normalizedProvince,
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
      inverterApiType:
        site.inverterApiType ??
        site.inverter_api_type ??
        "solaredge",
      solaredgeSiteId:
        site.solaredgeSiteId ??
        site.se_site_id ??
        site.seSiteId ??
        null,
      solaredgeApiKey:
        site.solaredgeApiKey ??
        site.se_api_key ??
        site.seApiKey ??
        null,
      solisKeyId:
        site.solisKeyId ??
        site.solis_key_id ??
        null,
      solisKeySecret:
        site.solisKeySecret ??
        site.solis_key_secret ??
        null,
      solisStationId:
        site.solisStationId ??
        site.solis_station_id ??
        null,
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
      show({ variant: "error", message: toastNode("listFailed") });
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
      utilityId?: string;
      siteGroupId?: string;
      lat?: number;
      lng?: number;
      zipcode?: string;
      addressProvince?: string;
      addressDistrict?: string;
      addressSubDistrict?: string;
      addressLine?: string;
      brandingLogoDataUrl?: string;
      inverterApiType?: string;
      solaredgeSiteId?: string;
      solaredgeApiKey?: string;
      solisKeyId?: string;
      solisKeySecret?: string;
      solisStationId?: string;
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
        show({ variant: "success", message: toastNode("createSuccess") });
      } catch (e) {
        console.error("registerSite failed", e);
        show({ variant: "error", message: toastNode("createFailed") });
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
      utilityId?: string;
      removeUtility?: boolean;
      siteGroupId?: string;
      removeSiteGroup?: boolean;
      lat?: number;
      lng?: number;
      zipcode?: string;
      addressProvince?: string;
      addressDistrict?: string;
      addressSubDistrict?: string;
      addressLine?: string;
      brandingLogoDataUrl?: string;
      removeBrandingLogo?: boolean;
      inverterApiType?: string;
      solaredgeSiteId?: string;
      solaredgeApiKey?: string;
      solisKeyId?: string;
      solisKeySecret?: string;
      solisStationId?: string;
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
        show({ variant: "success", message: toastNode("updateSuccess") });
      } catch (e) {
        console.error("updateSite failed", e);
        show({ variant: "error", message: toastNode("updateFailed") });
      } finally {
        setLoading(false);
      }
    },
    [editing, refresh, show]
  );

  const requestDelete = React.useCallback((row: SiteRow) => {
    setPendingDelete(row);
  }, []);

  const confirmDelete = React.useCallback(async () => {
    if (!pendingDelete) return;
    try {
      setLoading(true);
      await deleteSite(pendingDelete.id);
      await refresh();
      setViewing((prev) => (prev && prev.id === pendingDelete.id ? null : prev));
      show({ variant: "success", message: toastNode("deleteSuccess") });
    } catch (e) {
      console.error("deleteSite failed", e);
      show({ variant: "error", message: toastNode("deleteFailed") });
    } finally {
      setLoading(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, refresh, show]);

  return (
    <div className="p-4 bg-[#F8FBFE] min-h-screen">
      <Navbar title={texts.title} />
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
          onDelete={requestDelete}
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
      <Modal
        open={Boolean(pendingDelete)}
        id="site-delete-confirm"
        icon="warning"
        title={t("confirm.deleteTitle", {
          defaultValue: "Confirm deletion",
        })}
        message={
          pendingDelete
            ? t("confirm.deleteSite", {
                name: pendingDelete.name,
                defaultValue: "Delete site {{name}}?",
              })
            : ""
        }
        confirmLabel={t("form.buttons.delete", { defaultValue: "Delete" })}
        cancelLabel={t("form.buttons.cancel", { defaultValue: "Cancel" })}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
