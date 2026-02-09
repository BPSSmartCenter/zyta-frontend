export type BillingType = "electric" | "water";

export type SiteBillingAccess = {
  allowElectricBilling: boolean;
  allowWaterBilling: boolean;
  billingOnPeakRate: number | null;
  billingOffPeakRate: number | null;
  billingDiscountRate: number | null;
  billingFtRate: number | null;
  billingCo2Factor: number | null;
  billingTreeFactor: number | null;
};
