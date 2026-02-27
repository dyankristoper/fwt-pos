

## Plan: Align Mismatched SKU Codes in Database

### Problem
Two menu items in the database have non-standard SKUs (`FEATHERW` and `test`) that don't match the `FW-MENU-XXX-NNNN` convention used by the FWTeam inventory system. This causes "SKU not found" errors during inventory deduction.

### Changes

**Database update (2 rows):**
1. Update `menu_items` where id = `55fb1b81-4ddc-4d12-97e8-d7bf39c1f0ad` (Featherweight): set `sku` to `FW-MENU-SAN-0002`
2. Update `menu_items` where id = `5992efc6-4af5-4311-af3a-611cfe06f81f` (FWTea): set `sku` to `FW-MENU-BEV-0001`

No code changes needed — `menuData.ts` already uses the correct format as the hardcoded fallback.

