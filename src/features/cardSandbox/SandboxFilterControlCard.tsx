import React from "react";
import DatePicker from "../../components/DateInput";
import SiteDropdownGrouped from "../../components/Shared/SiteDropdownGrouped";
import { useFilters } from "../../context/FiltersContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectSandboxFilterGroupForCard } from "./cardSandboxSelectors";
import { cardSandboxActions } from "./cardSandboxSlice";

type Props = {
  cardId: string;
};

export default function SandboxFilterControlCard({ cardId }: Props) {
  const dispatch = useAppDispatch();
  const { siteOptions } = useFilters();
  const filterGroup = useAppSelector((state) =>
    selectSandboxFilterGroupForCard(state, cardId)
  );

  const onChangeSite = React.useCallback(
    (value: string) => {
      if (!filterGroup) return;
      dispatch(
        cardSandboxActions.setFilterGroupSite({
          id: filterGroup.id,
          selectedSite: value,
        })
      );
    },
    [dispatch, filterGroup]
  );

  const onSelectGroup = React.useCallback(
    (group: { id: string; label: string }) => {
      if (!filterGroup) return;
      dispatch(
        cardSandboxActions.setFilterGroupGroup({
          id: filterGroup.id,
          group,
        })
      );
    },
    [dispatch, filterGroup]
  );

  const onSelectUtility = React.useCallback(
    (utility: { id: string; label: string }) => {
      if (!filterGroup) return;
      dispatch(
        cardSandboxActions.setFilterGroupUtility({
          id: filterGroup.id,
          utility,
        })
      );
    },
    [dispatch, filterGroup]
  );

  const onChangeDate = React.useCallback(
    (date: { y: number; m: number; d: number }) => {
      if (!filterGroup) return;
      dispatch(cardSandboxActions.setFilterGroupDate({ id: filterGroup.id, date }));
    },
    [dispatch, filterGroup]
  );

  if (!filterGroup) return null;

  return (
    <div className="flex h-full flex-col gap-5 bg-white p-4">
      <div className="flex items-center gap-3">
        <span
          className="h-4 w-4 rounded-full border border-slate-300"
          style={{ backgroundColor: filterGroup.color }}
        />
        <div className="min-w-0">
          <div className="truncate text-xs font-bold uppercase text-slate-500">
            {filterGroup.label}
          </div>
          <div className="truncate text-sm font-semibold text-slate-950">
            {filterGroup.selectedSite === "all"
              ? filterGroup.selectedGroupSite?.label ??
                filterGroup.selectedUtility?.label ??
                "All sites"
              : siteOptions.find((site) => site.value === filterGroup.selectedSite)
                  ?.label ?? filterGroup.selectedSite}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase text-slate-500">
            Site
          </label>
          <SiteDropdownGrouped
            options={siteOptions}
            value={filterGroup.selectedSite}
            onChange={onChangeSite}
            selectedGroup={filterGroup.selectedGroupSite}
            onSelectGroup={onSelectGroup}
            selectedUtility={filterGroup.selectedUtility}
            onSelectUtility={onSelectUtility}
            showUngrouped
            showUngroupedHeader={false}
            rootClassName="w-full"
            buttonClassName="inline-flex h-11 w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:bg-slate-50"
            menuClassName="absolute left-0 top-full z-[1500] mt-2 min-w-full max-w-[480px] max-h-[420px] overflow-auto whitespace-nowrap rounded-md border border-gray-200 bg-white p-1 shadow-xl"
          />
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase text-slate-500">
            Period
          </label>
          <DatePicker
            value={filterGroup.date}
            onChange={onChangeDate}
            align="full"
            textAlign="left"
            className="!h-11 !rounded-md !border-slate-200 !bg-white !pl-3 !pr-10 !text-sm !font-semibold !shadow-sm hover:!bg-slate-50"
            popoverAlign="left"
          />
        </div>
      </div>
    </div>
  );
}
