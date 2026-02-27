
-- 1. Update order slip number format to OS-{BRANCH}-{YYMMDD}-{0001}
CREATE OR REPLACE FUNCTION public.next_order_slip_number(p_branch_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  today_str text;
  seq_num integer;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYMMDD');
  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.completed_sales
  WHERE branch_code = p_branch_code
    AND created_at::date = CURRENT_DATE;
  RETURN 'OS-' || p_branch_code || '-' || today_str || '-' || LPAD(seq_num::text, 4, '0');
END;
$function$;

-- 2. Create order_slips table
CREATE TABLE public.order_slips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slip_number text NOT NULL,
  sale_id uuid REFERENCES public.completed_sales(id),
  branch_id text NOT NULL DEFAULT 'QC01',
  device_id text NOT NULL DEFAULT 'TAB-A8-01',
  cashier_name text DEFAULT 'CASHIER',
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  void_reason text,
  void_note text,
  void_by text,
  void_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to order_slips"
  ON public.order_slips FOR ALL
  USING (true) WITH CHECK (true);

-- 3. Create reprint_log table
CREATE TABLE public.reprint_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slip_number text NOT NULL,
  reason text NOT NULL,
  note text,
  supervisor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reprint_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to reprint_log"
  ON public.reprint_log FOR ALL
  USING (true) WITH CHECK (true);

-- 4. Create day_close_log table
CREATE TABLE public.day_close_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id text NOT NULL DEFAULT 'QC01',
  closed_by text NOT NULL,
  close_date date NOT NULL DEFAULT CURRENT_DATE,
  is_reopened boolean NOT NULL DEFAULT false,
  reopened_by text,
  reopened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.day_close_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to day_close_log"
  ON public.day_close_log FOR ALL
  USING (true) WITH CHECK (true);
