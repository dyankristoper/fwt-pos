
-- Completed sales table for all finalized orders
CREATE TABLE public.completed_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_slip_number text NOT NULL UNIQUE,
  control_number integer NOT NULL,
  order_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  line_discounts jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  service_charge_percent numeric(5,2) DEFAULT 0,
  service_charge_amount numeric(12,2) DEFAULT 0,
  gross_sales numeric(12,2) NOT NULL DEFAULT 0,
  discount_total numeric(12,2) DEFAULT 0,
  net_sales numeric(12,2) NOT NULL DEFAULT 0,
  vatable_sales numeric(12,2) DEFAULT 0,
  vat_amount numeric(12,2) DEFAULT 0,
  vat_exempt_sales numeric(12,2) DEFAULT 0,
  zero_rated_sales numeric(12,2) DEFAULT 0,
  total_amount_due numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  cashier_name text DEFAULT 'CASHIER',
  branch_code text NOT NULL DEFAULT 'QC01',
  transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.completed_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to completed_sales" ON public.completed_sales FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_completed_sales_date ON public.completed_sales (created_at);
CREATE INDEX idx_completed_sales_branch ON public.completed_sales (branch_code);
CREATE INDEX idx_completed_sales_slip ON public.completed_sales (order_slip_number);

-- Atomic order slip number generator (MMDDYY-XXXX-BRANCHCODE, daily reset)
CREATE OR REPLACE FUNCTION public.next_order_slip_number(p_branch_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_str text;
  seq_num integer;
BEGIN
  today_str := to_char(CURRENT_DATE, 'MMDDYY');
  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.completed_sales
  WHERE branch_code = p_branch_code
    AND created_at::date = CURRENT_DATE;
  RETURN today_str || '-' || LPAD(seq_num::text, 4, '0') || '-' || p_branch_code;
END;
$$;

-- Atomic control number generator (persistent, never resets)
CREATE OR REPLACE FUNCTION public.next_control_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_val integer;
  new_val integer;
BEGIN
  SELECT (setting_value->>'current')::integer INTO current_val
  FROM public.pos_settings
  WHERE setting_key = 'control_number'
  FOR UPDATE;

  new_val := COALESCE(current_val, 0) + 1;

  UPDATE public.pos_settings
  SET setting_value = jsonb_build_object('current', new_val),
      updated_at = now()
  WHERE setting_key = 'control_number';

  RETURN new_val;
END;
$$;

-- Seed branch config, VAT mode, and control number settings
INSERT INTO public.pos_settings (setting_key, setting_value)
VALUES
  ('branch_config', '{"code": "QC01", "name": "Quezon City Branch", "legal_name": "Fifth D Fried Chicken Kiosk", "address": "1610 Quezon Avenue, Quezon City", "tin": "000-000-000-000"}'::jsonb),
  ('vat_mode', '{"mode": "inclusive"}'::jsonb),
  ('control_number', '{"current": 0}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
