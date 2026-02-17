
-- Add unique constraint on product_name, indexes on category & is_active
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_product_name_unique UNIQUE (product_name);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items (category);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_active ON public.menu_items (is_active);

-- ===== DISCOUNT TYPES TABLE =====
CREATE TABLE public.discount_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_name TEXT NOT NULL UNIQUE,
  discount_code TEXT NOT NULL UNIQUE,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_vat_exempt BOOLEAN NOT NULL DEFAULT false,
  requires_id_number BOOLEAN NOT NULL DEFAULT false,
  requires_customer_name BOOLEAN NOT NULL DEFAULT false,
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to discount_types" ON public.discount_types FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_discount_types_updated_at BEFORE UPDATE ON public.discount_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===== SALES DISCOUNTS TABLE =====
CREATE TABLE public.sales_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id TEXT NOT NULL,
  discount_type_id UUID NOT NULL REFERENCES public.discount_types(id),
  customer_name TEXT,
  id_number TEXT,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_removed_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sales_discounts" ON public.sales_discounts FOR ALL USING (true) WITH CHECK (true);

-- ===== SC/PWD LOG TABLE (no deletes) =====
CREATE TABLE public.sc_pwd_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_removed DECIMAL(10,2) NOT NULL DEFAULT 0,
  approved_by TEXT,
  processed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sc_pwd_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert and select on sc_pwd_log" ON public.sc_pwd_log FOR SELECT USING (true);
CREATE POLICY "Allow insert on sc_pwd_log" ON public.sc_pwd_log FOR INSERT WITH CHECK (true);
-- No UPDATE or DELETE policies = no deletion allowed

-- ===== SEED DISCOUNT TYPES =====
INSERT INTO public.discount_types (discount_name, discount_code, discount_percent, is_vat_exempt, requires_id_number, requires_customer_name, requires_signature) VALUES
  ('Senior Citizen', 'SC', 20.00, true, true, true, true),
  ('PWD', 'PWD', 20.00, true, true, true, true),
  ('Promotional Discount', 'PROMO', 0.00, false, false, false, false),
  ('Employee Discount', 'EMP', 0.00, false, false, false, false);
