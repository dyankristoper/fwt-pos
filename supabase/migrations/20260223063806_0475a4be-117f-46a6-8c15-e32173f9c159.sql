
-- Add combo_sku column to menu_items for DB-driven combo SKU mapping
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS combo_sku text DEFAULT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.menu_items.combo_sku IS 'Combo SKU code used for inventory deduction when item is ordered as a combo. Only relevant when is_combo_eligible = true.';
