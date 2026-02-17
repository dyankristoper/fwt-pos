
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.inventory_category AS ENUM (
  'Meat', 'Buns', 'Sauces', 'Dry Mix', 'Vegetables', 'Beverages', 'Packaging', 'Others'
);

CREATE TYPE public.unit_of_measure AS ENUM ('g', 'ml', 'pc', 'set');

CREATE TYPE public.menu_category AS ENUM (
  'Signature Sandwiches', 'Chicken Boxes', 'Combo Upgrade', 'Sides and Add-Ons', 'Beverages', 'Incidentals'
);

-- =============================================
-- CATEGORY CODE HELPER FUNCTIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.inventory_category_code(cat inventory_category)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE cat
    WHEN 'Meat' THEN 'MEA'
    WHEN 'Buns' THEN 'BUN'
    WHEN 'Sauces' THEN 'SAU'
    WHEN 'Dry Mix' THEN 'DRM'
    WHEN 'Vegetables' THEN 'VEG'
    WHEN 'Beverages' THEN 'BEV'
    WHEN 'Packaging' THEN 'PKG'
    WHEN 'Others' THEN 'OTH'
  END;
$$;

CREATE OR REPLACE FUNCTION public.menu_category_code(cat menu_category)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE cat
    WHEN 'Signature Sandwiches' THEN 'SAN'
    WHEN 'Chicken Boxes' THEN 'CHK'
    WHEN 'Combo Upgrade' THEN 'CMB'
    WHEN 'Sides and Add-Ons' THEN 'SID'
    WHEN 'Beverages' THEN 'BEV'
    WHEN 'Incidentals' THEN 'INC'
  END;
$$;

-- =============================================
-- TABLE 1: inventory_items
-- =============================================
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  item_name TEXT UNIQUE NOT NULL,
  category inventory_category NOT NULL,
  unit_of_measure unit_of_measure NOT NULL,
  cost_per_unit DECIMAL(10,4) NOT NULL DEFAULT 0,
  supplier TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger: prevent negative cost
CREATE OR REPLACE FUNCTION public.validate_inventory_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.cost_per_unit < 0 THEN
    RAISE EXCEPTION 'cost_per_unit cannot be negative';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_inventory_item
  BEFORE INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_item();

-- Auto-generate SKU
CREATE OR REPLACE FUNCTION public.generate_inventory_sku()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  cat_code TEXT;
  seq_num INT;
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    cat_code := public.inventory_category_code(NEW.category);
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(sku FROM 8) AS INT)
    ), 0) + 1
    INTO seq_num
    FROM public.inventory_items
    WHERE category = NEW.category;
    NEW.sku := 'FW-' || cat_code || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_inventory_sku
  BEFORE INSERT ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.generate_inventory_sku();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- TABLE 2: menu_items
-- =============================================
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  product_name TEXT UNIQUE NOT NULL,
  category menu_category NOT NULL,
  kcal INTEGER,
  srp DECIMAL(10,2) NOT NULL DEFAULT 0,
  computed_food_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  gross_margin_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  gross_margin_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_combo_eligible BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_packaging BOOLEAN NOT NULL DEFAULT false,
  -- Future-ready fields
  tax_category TEXT,
  branch_id UUID,
  central_kitchen_flag BOOLEAN,
  wastage_percent DECIMAL(5,2),
  yield_adjustment_factor DECIMAL(5,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_category ON public.menu_items(category);
CREATE INDEX idx_menu_items_is_active ON public.menu_items(is_active);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_menu_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.srp < 0 THEN
    RAISE EXCEPTION 'srp cannot be negative';
  END IF;
  IF NEW.kcal IS NOT NULL AND NEW.kcal < 0 THEN
    RAISE EXCEPTION 'kcal cannot be negative';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_menu_item
  BEFORE INSERT OR UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_menu_item();

-- Auto-generate SKU
CREATE OR REPLACE FUNCTION public.generate_menu_sku()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  cat_code TEXT;
  seq_num INT;
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    cat_code := public.menu_category_code(NEW.category);
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(sku FROM 13) AS INT)
    ), 0) + 1
    INTO seq_num
    FROM public.menu_items
    WHERE category = NEW.category;
    NEW.sku := 'FW-MENU-' || cat_code || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_menu_sku
  BEFORE INSERT ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.generate_menu_sku();

CREATE TRIGGER trg_menu_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- TABLE 3: menu_item_ingredients (Junction)
-- =============================================
CREATE TABLE public.menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity_used DECIMAL(10,4) NOT NULL DEFAULT 0,
  unit_of_measure unit_of_measure NOT NULL,
  computed_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mii_menu_item ON public.menu_item_ingredients(menu_item_id);
CREATE INDEX idx_mii_inventory_item ON public.menu_item_ingredients(inventory_item_id);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_menu_ingredient()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quantity_used < 0 THEN
    RAISE EXCEPTION 'quantity_used cannot be negative';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_menu_ingredient
  BEFORE INSERT OR UPDATE ON public.menu_item_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.validate_menu_ingredient();

CREATE TRIGGER trg_mii_updated_at
  BEFORE UPDATE ON public.menu_item_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- AUTO-COMPUTE: ingredient computed_cost
-- =============================================
CREATE OR REPLACE FUNCTION public.compute_ingredient_cost()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  unit_cost DECIMAL(10,4);
BEGIN
  SELECT cost_per_unit INTO unit_cost
  FROM public.inventory_items
  WHERE id = NEW.inventory_item_id;
  
  NEW.computed_cost := NEW.quantity_used * COALESCE(unit_cost, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_ingredient_cost
  BEFORE INSERT OR UPDATE ON public.menu_item_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.compute_ingredient_cost();

-- =============================================
-- AUTO-COMPUTE: menu_items margins on ingredient change
-- =============================================
CREATE OR REPLACE FUNCTION public.recompute_menu_item_cost()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_menu_id UUID;
  total_cost DECIMAL(10,2);
  item_srp DECIMAL(10,2);
BEGIN
  target_menu_id := COALESCE(NEW.menu_item_id, OLD.menu_item_id);
  
  SELECT COALESCE(SUM(computed_cost), 0) INTO total_cost
  FROM public.menu_item_ingredients
  WHERE menu_item_id = target_menu_id;
  
  SELECT srp INTO item_srp
  FROM public.menu_items
  WHERE id = target_menu_id;
  
  UPDATE public.menu_items SET
    computed_food_cost = total_cost,
    gross_margin_value = item_srp - total_cost,
    gross_margin_percent = CASE WHEN item_srp > 0
      THEN ROUND(((item_srp - total_cost) / item_srp) * 100, 2)
      ELSE 0 END
  WHERE id = target_menu_id;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recompute_menu_cost
  AFTER INSERT OR UPDATE OR DELETE ON public.menu_item_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.recompute_menu_item_cost();

-- =============================================
-- CASCADE: when inventory cost_per_unit changes, recompute all
-- =============================================
CREATE OR REPLACE FUNCTION public.cascade_inventory_cost_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.cost_per_unit IS DISTINCT FROM NEW.cost_per_unit THEN
    -- Update all ingredient computed_costs
    UPDATE public.menu_item_ingredients
    SET computed_cost = quantity_used * NEW.cost_per_unit,
        updated_at = now()
    WHERE inventory_item_id = NEW.id;
    
    -- Recompute all affected menu items
    UPDATE public.menu_items m SET
      computed_food_cost = sub.total_cost,
      gross_margin_value = m.srp - sub.total_cost,
      gross_margin_percent = CASE WHEN m.srp > 0
        THEN ROUND(((m.srp - sub.total_cost) / m.srp) * 100, 2)
        ELSE 0 END
    FROM (
      SELECT menu_item_id, COALESCE(SUM(computed_cost), 0) AS total_cost
      FROM public.menu_item_ingredients
      WHERE inventory_item_id = NEW.id
      GROUP BY menu_item_id
    ) sub
    WHERE m.id = sub.menu_item_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_cascade_inventory_cost
  AFTER UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.cascade_inventory_cost_change();

-- =============================================
-- AUDIT LOG for cost changes
-- =============================================
CREATE TABLE public.inventory_cost_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  old_cost DECIMAL(10,4),
  new_cost DECIMAL(10,4),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_audit_item ON public.inventory_cost_audit(inventory_item_id);

CREATE OR REPLACE FUNCTION public.audit_cost_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.cost_per_unit IS DISTINCT FROM NEW.cost_per_unit THEN
    INSERT INTO public.inventory_cost_audit (inventory_item_id, old_cost, new_cost)
    VALUES (NEW.id, OLD.cost_per_unit, NEW.cost_per_unit);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_cost_change
  AFTER UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_cost_change();

-- =============================================
-- VIEWS
-- =============================================
CREATE OR REPLACE VIEW public.vw_menu_profitability AS
SELECT
  product_name,
  srp,
  computed_food_cost,
  gross_margin_value,
  gross_margin_percent
FROM public.menu_items
WHERE is_active = true
ORDER BY gross_margin_percent DESC;

CREATE OR REPLACE VIEW public.vw_inventory_usage AS
SELECT
  i.item_name AS inventory_item_name,
  COALESCE(SUM(mii.quantity_used), 0) AS total_quantity_used,
  COALESCE(SUM(mii.computed_cost), 0) AS total_cost_consumed
FROM public.inventory_items i
LEFT JOIN public.menu_item_ingredients mii ON mii.inventory_item_id = i.id
GROUP BY i.id, i.item_name
ORDER BY total_cost_consumed DESC;

-- =============================================
-- RLS: Single-terminal POS, no auth required
-- =============================================
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_cost_audit ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon (single terminal, no login)
CREATE POLICY "Allow all access to inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to menu_item_ingredients" ON public.menu_item_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read access to cost audit" ON public.inventory_cost_audit FOR SELECT USING (true);
