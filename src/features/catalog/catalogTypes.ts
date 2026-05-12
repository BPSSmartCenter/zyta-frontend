// src/features/catalog/catalogTypes.ts
import type { FeKey, NotiType, Severity } from "../notifications/notificationsTypes";

export type CatalogEntry = {
  type: NotiType;
  severity: Severity;
  feKey: FeKey;
  icon: string;
  labelTh: string;
  labelEn: string;
};

export type CatalogMap = Record<string, CatalogEntry>;

export type CatalogResponse = {
  data: CatalogMap;
};
