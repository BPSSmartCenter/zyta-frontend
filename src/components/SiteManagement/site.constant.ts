export type SiteRow = {
  id: string;
  name: string;
  code: string;
  groupId?: string | null;
  groupLabel?: string | null;
  provinceLabel: string;
  lat: number | null;
  lng: number | null;
  zipcode?: string | null;
  addressProvince?: string | null;
  addressDistrict?: string | null;
  addressSubDistrict?: string | null;
  addressLine?: string | null;
  brandingLogoUrl?: string | null;
  devicesTotal: number;
  usersCount: number;
  updatedAt?: string | null;
  allowElectricBilling?: boolean;
  allowWaterBilling?: boolean;
  billingOnPeakRate?: number | null;
  billingOffPeakRate?: number | null;
  billingDiscountRate?: number | null;
  solaredgeSiteId?: string | null;
  solaredgeApiKey?: string | null;
};

export const SITE_ROWS: SiteRow[] = [];
