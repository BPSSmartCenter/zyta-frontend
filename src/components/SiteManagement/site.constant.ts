export type SiteRow = {
  id: string;
  name: string;
  code: string;
  provinceLabel: string;
  lat: number | null;
  lng: number | null;
  zipcode?: string | null;
  addressProvince?: string | null;
  addressDistrict?: string | null;
  addressSubDistrict?: string | null;
  addressLine?: string | null;
  devicesTotal: number;
  usersCount: number;
  updatedAt?: string | null;
  allowElectricBilling?: boolean;
  allowWaterBilling?: boolean;
};

export const SITE_ROWS: SiteRow[] = [];
