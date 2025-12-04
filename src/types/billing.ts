export type BillingType = "electric" | "water";

export type SiteBillingAccess = {
  allowElectricBilling: boolean;
  allowWaterBilling: boolean;
  billingOnPeakRate: number | null;
  billingOffPeakRate: number | null;
  billingDiscountRate: number | null;
};
