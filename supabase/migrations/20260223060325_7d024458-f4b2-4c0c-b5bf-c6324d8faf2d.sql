
-- Add new columns to discount_types for the revised discount system
ALTER TABLE public.discount_types
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'LINE_ITEM' CHECK (scope IN ('LINE_ITEM', 'GLOBAL_ORDER')),
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'PERCENT' CHECK (discount_type IN ('PERCENT', 'FIXED')),
  ADD COLUMN IF NOT EXISTS id_type text NULL,
  ADD COLUMN IF NOT EXISTS requires_promo_code boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_code_value text NULL,
  ADD COLUMN IF NOT EXISTS requires_note boolean NOT NULL DEFAULT false;

-- Update existing preloaded discounts with proper config
UPDATE public.discount_types SET
  scope = 'LINE_ITEM',
  discount_type = 'PERCENT',
  id_type = 'Senior Citizen ID',
  requires_promo_code = false,
  requires_note = false
WHERE discount_code = 'SC';

UPDATE public.discount_types SET
  scope = 'LINE_ITEM',
  discount_type = 'PERCENT',
  id_type = 'PWD ID',
  requires_promo_code = false,
  requires_note = false
WHERE discount_code = 'PWD';

UPDATE public.discount_types SET
  scope = 'LINE_ITEM',
  discount_type = 'PERCENT',
  id_type = 'National Athlete ID',
  requires_promo_code = false,
  requires_note = false
WHERE discount_code = 'NATL_ATH';

-- Insert Employee Discount if not exists
INSERT INTO public.discount_types (discount_code, discount_name, discount_percent, scope, discount_type, is_vat_exempt, requires_id_number, requires_customer_name, requires_signature, requires_promo_code, promo_code_value, requires_note, id_type)
VALUES ('EMP', 'Employee Discount', 20, 'GLOBAL_ORDER', 'PERCENT', false, false, true, false, true, 'FWTEAM2025', false, NULL)
ON CONFLICT DO NOTHING;
