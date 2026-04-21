// src/features/siteSelection/siteSelectionSlice.ts
//
// Redux slice for site selection — the single source of truth for
// "which site is the user currently looking at" across the whole app.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  SelectedGroupSite,
  SelectedUtility,
  SiteCatalogStatus,
  SiteOption,
  SitePickerReason,
} from "./siteSelectionTypes";
import {
  hydrateSelection,
  loadSiteCatalog,
  type LoadSiteCatalogError,
} from "./siteSelectionThunks";
import { writeStoredSite } from "./siteSelectionStorage";

type SiteSelectionState = {
  // Catalog
  catalogStatus: SiteCatalogStatus;
  catalogError: LoadSiteCatalogError | null;
  sites: SiteOption[];
  isAdmin: boolean;
  /** uid จาก apiMe ตอนโหลด catalog — ใช้เป็น key persist */
  catalogUid: string | null;

  // Current selection (null = ยังไม่เลือก)
  selectedSite: string | null;
  selectedGroup: SelectedGroupSite;
  selectedUtility: SelectedUtility;

  // Hydration flow
  /** true หลัง hydrateSelection fulfilled แล้ว (ไม่ว่าผลลัพธ์คืออะไร) */
  hasHydrated: boolean;

  // Modal
  isPickerOpen: boolean;
  pickerReason: SitePickerReason | null;
};

const initialState: SiteSelectionState = {
  catalogStatus: "idle",
  catalogError: null,
  sites: [],
  isAdmin: false,
  catalogUid: null,
  selectedSite: null,
  selectedGroup: null,
  selectedUtility: null,
  hasHydrated: false,
  isPickerOpen: false,
  pickerReason: null,
};

const slice = createSlice({
  name: "siteSelection",
  initialState,
  reducers: {
    /** เลือก site (persist ด้วย) */
    selectSite(state, action: PayloadAction<string>) {
      state.selectedSite = action.payload;
      state.selectedGroup = null;
      state.selectedUtility = null;
      // ปิด modal อัตโนมัติหลังเลือก
      state.isPickerOpen = false;
      state.pickerReason = null;
      if (state.catalogUid) writeStoredSite(state.catalogUid, action.payload);
    },

    /** เลือก site โดยไม่ปิด modal (ใช้กับ manual picker ที่ผู้ใช้เปิดเอง) */
    selectSiteWithoutClosingPicker(state, action: PayloadAction<string>) {
      state.selectedSite = action.payload;
      state.selectedGroup = null;
      state.selectedUtility = null;
      if (state.catalogUid) writeStoredSite(state.catalogUid, action.payload);
    },

    /** select group (ภายใน utility) — ไม่กระทบ selectedSite */
    selectGroup(state, action: PayloadAction<SelectedGroupSite>) {
      state.selectedGroup = action.payload;
    },

    /** select utility — ล้าง group ที่เลือก */
    selectUtility(state, action: PayloadAction<SelectedUtility>) {
      state.selectedUtility = action.payload;
      state.selectedGroup = null;
    },

    /** เปิด modal เลือก site */
    openPicker(state, action: PayloadAction<{ reason: SitePickerReason }>) {
      state.isPickerOpen = true;
      state.pickerReason = action.payload.reason;
    },

    /** ปิด modal — ใช้ได้เฉพาะเมื่อ reason = "manual" (กัน forced ปิดเอง) */
    closePicker(state) {
      if (state.pickerReason === "manual") {
        state.isPickerOpen = false;
        state.pickerReason = null;
      }
    },

    /** Force close — ใช้ internal เท่านั้น (เช่น หลังเลือก) */
    forceClosePicker(state) {
      state.isPickerOpen = false;
      state.pickerReason = null;
    },

    /** Reset ทั้ง slice (ใช้ตอน logout) */
    resetSiteSelection() {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      // loadSiteCatalog
      .addCase(loadSiteCatalog.pending, (state) => {
        state.catalogStatus = "loading";
        state.catalogError = null;
      })
      .addCase(loadSiteCatalog.fulfilled, (state, action) => {
        state.catalogStatus = "ready";
        state.catalogError = null;
        state.sites = action.payload.sites;
        state.isAdmin = action.payload.isAdmin;
        state.catalogUid = action.payload.uid;
      })
      .addCase(loadSiteCatalog.rejected, (state, action) => {
        state.catalogStatus = "failed";
        state.catalogError =
          action.payload ?? {
            code: "UNKNOWN",
            message: "Failed to load site catalog",
          };
        state.sites = [];
      })

      // hydrateSelection — set selectedSite ตามผลลัพธ์
      .addCase(hydrateSelection.fulfilled, (state, action) => {
        state.hasHydrated = true;
        const result = action.payload;
        if (result.kind === "resolved") {
          state.selectedSite = result.value;
          state.isPickerOpen = false;
          state.pickerReason = null;
        } else if (result.kind === "needs-picker") {
          state.selectedSite = null;
          state.isPickerOpen = true;
          state.pickerReason = "forced";
        } else {
          // no-access
          state.selectedSite = null;
          state.isPickerOpen = false;
          state.pickerReason = null;
        }
      });
  },
});

export const siteSelectionActions = slice.actions;
export default slice.reducer;

// re-export state type สำหรับ selectors
export type { SiteSelectionState };
