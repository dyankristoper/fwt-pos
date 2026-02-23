
-- 1. Create pos_categories table for dynamic category management
CREATE TABLE public.pos_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pos_categories"
  ON public.pos_categories FOR ALL
  USING (true) WITH CHECK (true);

-- Seed default categories
INSERT INTO public.pos_categories (name, sort_order) VALUES
  ('Signature Sandwiches', 1),
  ('Chicken Boxes', 2),
  ('Sides', 3),
  ('Add-ons', 4),
  ('Beverages', 5);

-- 2. Add display_size column to menu_items (display-only UoM like "Regular", "85g", "500ml")
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS display_size text;

-- 3. Add pos_category_id to menu_items referencing the new table
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS pos_category_id uuid REFERENCES public.pos_categories(id);

-- 4. Backfill pos_category_id from the existing enum category values
UPDATE public.menu_items SET pos_category_id = pc.id
FROM public.pos_categories pc
WHERE (menu_items.category::text = pc.name)
  OR (menu_items.category::text = 'Combo Upgrade' AND pc.name = 'Sides')
  OR (menu_items.category::text = 'Sides and Add-Ons' AND pc.name = 'Sides')
  OR (menu_items.category::text = 'Incidentals' AND pc.name = 'Add-ons');

-- Trigger for updated_at on pos_categories
CREATE TRIGGER update_pos_categories_updated_at
  BEFORE UPDATE ON public.pos_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
