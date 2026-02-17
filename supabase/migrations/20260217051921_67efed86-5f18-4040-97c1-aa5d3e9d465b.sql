
-- Fix views: use security_invoker instead of security_definer
DROP VIEW IF EXISTS public.vw_menu_profitability;
DROP VIEW IF EXISTS public.vw_inventory_usage;

CREATE OR REPLACE VIEW public.vw_menu_profitability
WITH (security_invoker = on) AS
SELECT product_name, srp, computed_food_cost, gross_margin_value, gross_margin_percent
FROM public.menu_items WHERE is_active = true ORDER BY gross_margin_percent DESC;

CREATE OR REPLACE VIEW public.vw_inventory_usage
WITH (security_invoker = on) AS
SELECT i.item_name AS inventory_item_name,
  COALESCE(SUM(mii.quantity_used), 0) AS total_quantity_used,
  COALESCE(SUM(mii.computed_cost), 0) AS total_cost_consumed
FROM public.inventory_items i
LEFT JOIN public.menu_item_ingredients mii ON mii.inventory_item_id = i.id
GROUP BY i.id, i.item_name ORDER BY total_cost_consumed DESC;

-- Fix functions: set search_path
CREATE OR REPLACE FUNCTION public.validate_inventory_item()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.cost_per_unit < 0 THEN RAISE EXCEPTION 'cost_per_unit cannot be negative'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_inventory_sku()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cat_code TEXT; seq_num INT;
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    cat_code := public.inventory_category_code(NEW.category);
    SELECT COALESCE(MAX(CAST(SUBSTRING(sku FROM 8) AS INT)), 0) + 1 INTO seq_num
    FROM public.inventory_items WHERE category = NEW.category;
    NEW.sku := 'FW-' || cat_code || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.validate_menu_item()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.srp < 0 THEN RAISE EXCEPTION 'srp cannot be negative'; END IF;
  IF NEW.kcal IS NOT NULL AND NEW.kcal < 0 THEN RAISE EXCEPTION 'kcal cannot be negative'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_menu_sku()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cat_code TEXT; seq_num INT;
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    cat_code := public.menu_category_code(NEW.category);
    SELECT COALESCE(MAX(CAST(SUBSTRING(sku FROM 13) AS INT)), 0) + 1 INTO seq_num
    FROM public.menu_items WHERE category = NEW.category;
    NEW.sku := 'FW-MENU-' || cat_code || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_menu_ingredient()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.quantity_used < 0 THEN RAISE EXCEPTION 'quantity_used cannot be negative'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_ingredient_cost()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE unit_cost DECIMAL(10,4);
BEGIN
  SELECT cost_per_unit INTO unit_cost FROM public.inventory_items WHERE id = NEW.inventory_item_id;
  NEW.computed_cost := NEW.quantity_used * COALESCE(unit_cost, 0);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_menu_item_cost()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE target_menu_id UUID; total_cost DECIMAL(10,2); item_srp DECIMAL(10,2);
BEGIN
  target_menu_id := COALESCE(NEW.menu_item_id, OLD.menu_item_id);
  SELECT COALESCE(SUM(computed_cost), 0) INTO total_cost FROM public.menu_item_ingredients WHERE menu_item_id = target_menu_id;
  SELECT srp INTO item_srp FROM public.menu_items WHERE id = target_menu_id;
  UPDATE public.menu_items SET computed_food_cost = total_cost, gross_margin_value = item_srp - total_cost,
    gross_margin_percent = CASE WHEN item_srp > 0 THEN ROUND(((item_srp - total_cost) / item_srp) * 100, 2) ELSE 0 END
  WHERE id = target_menu_id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.cascade_inventory_cost_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.cost_per_unit IS DISTINCT FROM NEW.cost_per_unit THEN
    UPDATE public.menu_item_ingredients SET computed_cost = quantity_used * NEW.cost_per_unit, updated_at = now() WHERE inventory_item_id = NEW.id;
    UPDATE public.menu_items m SET computed_food_cost = sub.total_cost, gross_margin_value = m.srp - sub.total_cost,
      gross_margin_percent = CASE WHEN m.srp > 0 THEN ROUND(((m.srp - sub.total_cost) / m.srp) * 100, 2) ELSE 0 END
    FROM (SELECT menu_item_id, COALESCE(SUM(computed_cost), 0) AS total_cost FROM public.menu_item_ingredients WHERE inventory_item_id = NEW.id GROUP BY menu_item_id) sub
    WHERE m.id = sub.menu_item_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_cost_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.cost_per_unit IS DISTINCT FROM NEW.cost_per_unit THEN
    INSERT INTO public.inventory_cost_audit (inventory_item_id, old_cost, new_cost) VALUES (NEW.id, OLD.cost_per_unit, NEW.cost_per_unit);
  END IF;
  RETURN NULL;
END;
$$;
