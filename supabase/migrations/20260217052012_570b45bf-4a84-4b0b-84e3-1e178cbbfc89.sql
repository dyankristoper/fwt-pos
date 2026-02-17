
-- Fix remaining immutable functions with search_path
CREATE OR REPLACE FUNCTION public.inventory_category_code(cat inventory_category)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE cat
    WHEN 'Meat' THEN 'MEA' WHEN 'Buns' THEN 'BUN' WHEN 'Sauces' THEN 'SAU'
    WHEN 'Dry Mix' THEN 'DRM' WHEN 'Vegetables' THEN 'VEG' WHEN 'Beverages' THEN 'BEV'
    WHEN 'Packaging' THEN 'PKG' WHEN 'Others' THEN 'OTH'
  END;
$$;

CREATE OR REPLACE FUNCTION public.menu_category_code(cat menu_category)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE cat
    WHEN 'Signature Sandwiches' THEN 'SAN' WHEN 'Chicken Boxes' THEN 'CHK'
    WHEN 'Combo Upgrade' THEN 'CMB' WHEN 'Sides and Add-Ons' THEN 'SID'
    WHEN 'Beverages' THEN 'BEV' WHEN 'Incidentals' THEN 'INC'
  END;
$$;
