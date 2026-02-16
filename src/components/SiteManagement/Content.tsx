import React from "react";
import { useTranslation } from "react-i18next";
import type { SiteRow } from "./site.constant";
import Dropdown from "../Dropdown";

type Props = {
  rows: SiteRow[];
  loading?: boolean;
  onRefresh: () => Promise<any> | void;
  onCreateClick: () => void;
  onDetail: (row: SiteRow) => void;
};

const PAGE_SIZE = 10;

export default function Content({
  rows,
  loading = false,
  onRefresh,
  onCreateClick,
  onDetail,
}: Props) {
  const { t } = useTranslation("siteManagement");
  const texts = React.useMemo(
    () => ({
      title: t("content.title", { defaultValue: "Site Management" }),
      subtitle: t("content.subtitle", {
        defaultValue: "All sites managed by SuperAdmin",
      }),
      buttons: {
        refresh: t("content.buttons.refresh", { defaultValue: "Refresh" }),
        create: t("content.buttons.create", { defaultValue: "Register site" }),
      },
      search: {
        label: t("content.search.label", { defaultValue: "Search" }),
        placeholder: t("content.search.placeholder", {
          defaultValue: "Search by site name or code",
        }),
      },
      province: {
        label: t("content.province.label", { defaultValue: "Province" }),
        all: t("content.province.all", { defaultValue: "All provinces" }),
      },
      table: {
        site: t("content.table.site", { defaultValue: "Site" }),
        group: t("content.table.group", { defaultValue: "Group" }),
        code: t("content.table.code", { defaultValue: "Code" }),
        address: t("content.table.address", { defaultValue: "Address" }),
        devices: t("content.table.devices", { defaultValue: "Devices" }),
        users: t("content.table.users", { defaultValue: "Users" }),
        actions: t("content.table.actions", { defaultValue: "Actions" }),
      },
      status: {
        loading: t("content.loading", { defaultValue: "Loading sites..." }),
        empty: t("content.empty", { defaultValue: "No sites found" }),
      },
      detail: t("content.detail", { defaultValue: "Detail" }),
      copyUuid: t("content.copyUuid", { defaultValue: "Copy UUID" }),
      copied: t("content.copied", { defaultValue: "Copied" }),
      pagination: {
        prev: t("content.pagination.prev", { defaultValue: "Prev" }),
        next: t("content.pagination.next", { defaultValue: "Next" }),
        label: (page: number, total: number) =>
          t("content.pagination.label", {
            page,
            total,
            defaultValue: "Page {{page}} / {{total}}",
          }),
      },
    }),
    [t]
  );
  const [search, setSearch] = React.useState("");
  const [provinceFilter, setProvinceFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [copiedSiteId, setCopiedSiteId] = React.useState<string | null>(null);

  const copyToClipboard = React.useCallback(async (value: string) => {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }, []);

  const onCopyUuid = React.useCallback(
    async (siteId: string) => {
      try {
        await copyToClipboard(siteId);
        setCopiedSiteId(siteId);
        window.setTimeout(() => {
          setCopiedSiteId((prev) => (prev === siteId ? null : prev));
        }, 1500);
      } catch (err) {
        console.error("Failed to copy site UUID", err);
      }
    },
    [copyToClipboard]
  );

  const provinces = React.useMemo(() => {
    const list = new Set<string>();
    rows.forEach((row) => {
      const label = (row.provinceLabel || "").trim();
      if (!label || label === "-" || label === "0") return;
      list.add(label);
    });
    return ["all", ...Array.from(list).sort((a, b) => a.localeCompare(b, "th"))];
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchProvince =
        provinceFilter === "all" || row.provinceLabel === provinceFilter;
      const matchSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.provinceLabel.toLowerCase().includes(q) ||
        (row.groupLabel ?? "").toLowerCase().includes(q);
      return matchProvince && matchSearch;
    });
  }, [rows, search, provinceFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  React.useEffect(() => {
    setPage((p) => (p > pageCount ? pageCount : p < 1 ? 1 : p));
  }, [pageCount]);
  const start = (page - 1) * PAGE_SIZE;
  const rowsPage = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="mt-6 p-6 bg-white rounded-lg">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-4 border-b">
        <div>
          <h1 className="font-bold text-[22px] md:text-[24px]">
            {texts.title}
          </h1>
          <p className="text-sm text-gray-500">{texts.subtitle}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
            disabled={loading}
          >
            <i className="material-icons-outlined text-base">refresh</i>
            {texts.buttons.refresh}
          </button>
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 bg-cyan text-white p-2 px-3 rounded-lg cursor-pointer hover:bg-cyan-400"
          >
            <i className="material-icons-outlined">add_circle</i>
            <span className="hidden md:block">{texts.buttons.create}</span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <label className="text-sm font-semibold block mb-2">
            {texts.search.label}
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder={texts.search.placeholder}
            className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
          />
        </div>
        <div>
          <label className="text-sm font-semibold block mb-2">
            {texts.province.label}
          </label>
          <Dropdown
            options={provinces.map((value) => ({
              value,
              label: value === "all" ? texts.province.all : value,
            }))}
            value={provinceFilter}
            onChange={(val) => {
              setPage(1);
              setProvinceFilter(val);
            }}
          >
            {({
              open,
              selected,
              getButtonProps,
              getMenuProps,
              getItemProps,
              options,
            }) => (
              <div className="relative">
                <button
                  {...getButtonProps({
                    className:
                      "h-[40px] w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 font-semibold flex items-center justify-between gap-2 cursor-pointer",
                  })}
                >
                  <span className="truncate">
                    {selected?.label ?? texts.province.all}
                  </span>
                  <i className="material-icons leading-none">
                    {open ? "arrow_drop_up" : "arrow_drop_down"}
                  </i>
                </button>

                <div
                  {...getMenuProps({
                    className: [
                      "absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg max-h-64 overflow-y-auto",
                      open ? "block" : "hidden",
                    ].join(" "),
                  })}
                >
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      {...getItemProps(opt, {
                        className:
                          "w-full text-left rounded-md px-3 py-2 text-[14px] hover:bg-gray-100 cursor-pointer",
                      })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Dropdown>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="pb-3">{texts.table.site}</th>
              <th className="pb-3">{texts.table.group}</th>
              <th className="pb-3">{texts.table.code}</th>
              <th className="pb-3">{texts.table.address}</th>
              <th className="pb-3 text-center">{texts.table.devices}</th>
              <th className="pb-3 text-center">{texts.table.users}</th>
              <th className="pb-3 text-center">{texts.table.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-500">
                  {texts.status.loading}
                </td>
              </tr>
            ) : rowsPage.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-500">
                  {texts.status.empty}
                </td>
              </tr>
            ) : (
              rowsPage.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="py-4">
                    <div className="font-semibold text-gray-900">
                      {row.name || "-"}
                    </div>
                  </td>
                  <td className="py-4 text-gray-700">
                    {row.groupLabel || "-"}
                  </td>
                  <td className="py-4 text-gray-700">{row.code || "-"}</td>
                  <td className="py-4 text-gray-700 max-w-[220px]">
                    <div className="text-sm text-gray-800">
                      {row.addressLine || "-"}
                    </div>
                  </td>
                  <td className="py-4 text-center font-semibold">
                    {row.devicesTotal}
                  </td>
                  <td className="py-4 text-center font-semibold">
                    {row.usersCount}
                  </td>
                  <td className="py-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDetail(row)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      >
                        <i className="material-icons-outlined text-sm">
                          visibility
                        </i>
                        {texts.detail}
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopyUuid(row.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        title={row.id}
                      >
                        <i className="material-icons-outlined text-sm">
                          content_copy
                        </i>
                        {copiedSiteId === row.id ? texts.copied : texts.copyUuid}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {texts.pagination.prev}
          </button>
          <div className="px-3 py-1 text-sm font-semibold">
            {texts.pagination.label(page, pageCount)}
          </div>
          <button
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            disabled={page === pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            {texts.pagination.next}
          </button>
        </div>
      )}
    </div>
  );
}
