import React from "react";
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
  const [search, setSearch] = React.useState("");
  const [provinceFilter, setProvinceFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const provinces = React.useMemo(() => {
    const list = new Set<string>();
    rows.forEach((row) => {
      if (row.provinceLabel) list.add(row.provinceLabel);
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
        row.provinceLabel.toLowerCase().includes(q);
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
            Site Management
          </h1>
          <p className="text-sm text-gray-500">
            รายการไซต์ทั้งหมดที่ SuperAdmin ดูแล
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
            disabled={loading}
          >
            <i className="material-icons-outlined text-base">refresh</i>
            Refresh
          </button>
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 bg-cyan text-white p-2 px-3 rounded-lg cursor-pointer hover:bg-cyan-400"
          >
            <i className="material-icons-outlined">add_circle</i>
            <span className="hidden md:block">Register site</span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <label className="text-sm font-semibold block mb-2">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="ค้นหาด้วยชื่อหรือรหัสไซต์"
            className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-cyan focus:outline-hidden"
          />
        </div>
        <div>
          <label className="text-sm font-semibold block mb-2">Province</label>
          <Dropdown
            options={provinces.map((value) => ({
              value,
              label: value === "all" ? "ทุกจังหวัด" : value,
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
                    {selected?.label ?? "ทุกจังหวัด"}
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
              <th className="pb-3">Site</th>
              <th className="pb-3">Code</th>
              <th className="pb-3">Address</th>
              <th className="pb-3 text-center">Devices</th>
              <th className="pb-3 text-center">Users</th>
              <th className="pb-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : rowsPage.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  ไม่พบข้อมูลไซต์
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
                    <button
                      type="button"
                      onClick={() => onDetail(row)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      <i className="material-icons-outlined text-sm">
                        visibility
                      </i>
                      Detail
                    </button>
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
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-40"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <div className="px-3 py-1 text-sm font-semibold">
            หน้า {page} / {pageCount}
          </div>
          <button
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-40"
            disabled={page === pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
