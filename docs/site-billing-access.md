# Site Billing Access Flow & Backend Plan

## Frontend Flow (FN)
- `src/components/SiteManagement/Content_Detail.tsx` loads device groups with `listSiteDevices` and exposes a toggle per electric/water section (lines 189-234 & 274-300). The toggle currently calls `handleBillingToggle`, which only updates React state and persists to `localStorage` through `setBillingPreference`.
- `src/utils/billingPreference.ts` (lines 1-41) shows there is no backend calls: preferences are keyed by `siteId` inside an object saved under `siteBillingPreference` in `localStorage`.
- Because site billing access lives purely on the client, a new staff browser or device does not inherit the setting; it is also impossible to enforce billing-level RBAC from the backend.

## Prisma Schema Update (BN)
Add two boolean columns directly on the `Site` model so the information travels with the rest of the master data. Suggested Prisma diff:

```prisma
model Site {
  id                  String   @id @default(cuid())
  name                String
  code                String?  @unique
  // ... existing fields ...
  allowElectricBilling Boolean  @default(false)
  allowWaterBilling    Boolean  @default(false)
  updatedAt           DateTime @updatedAt
}
```

Migration plan:
1. `npx prisma migrate dev --name add_site_billing_access` to create the columns with default `false`. The default keeps historical rows consistent without backfilling.
2. If some sites already run billing today, run a follow-up SQL (or Prisma script) that sets `allowElectricBilling = true` (and/or `allowWaterBilling`) for those rows.

Expose the flags whenever a site is fetched by updating any Prisma `select` or `include`. For example, `getSiteDetails` should return `{ allowElectricBilling, allowWaterBilling }` so the React view can preload the toggle state.

## Update Route
Create a dedicated endpoint so the UI can set the permissions explicitly instead of piggybacking on the general site update:

```ts
// routes/siteBillingAccess.ts
import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma";

const router = Router();
const payloadSchema = z.object({
  allowElectricBilling: z.boolean().optional(),
  allowWaterBilling: z.boolean().optional(),
});

router.patch("/site/:siteId/billing-access", async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const payload = payloadSchema.parse(req.body);
    if (!Object.keys(payload).length) {
      return res.status(400).json({ ok: false, message: "Missing payload" });
    }

    const site = await prisma.site.update({
      where: { id: siteId },
      data: payload,
      select: {
        id: true,
        name: true,
        allowElectricBilling: true,
        allowWaterBilling: true,
      },
    });

    return res.json({ ok: true, site });
  } catch (err) {
    return next(err);
  }
});

export default router;
```

Wire the router in your API bootstrap (`app.use(router)`) and protect it with whatever auth middleware is already guarding site admin features.

## FN <-> BN Integration Notes
1. Extend `getSiteDetails` (and `listSites` if needed) to surface the two booleans.
2. Replace `utils/billingPreference` with API calls:
   - `GET /site/:id/billing-access` (or reuse `/site/:id/details`) to hydrate state.
   - `PATCH /site/:id/billing-access` to persist toggle changes. Debounce updates so toggling twice does not spam the backend.
3. Remove the `localStorage` helper once the API integration is done; the toggle state should be derived from server data plus optimistic UI updates.

This flow gives us a single source of truth in the database and a simple, auditable API surface for both device categories.
