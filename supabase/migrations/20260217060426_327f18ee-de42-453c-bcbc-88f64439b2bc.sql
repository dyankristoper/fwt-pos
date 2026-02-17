
-- Supervisors table for configurable PINs
CREATE TABLE public.supervisors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'supervisor' CHECK (role IN ('supervisor', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to supervisors"
  ON public.supervisors FOR ALL
  USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_supervisors_updated_at
  BEFORE UPDATE ON public.supervisors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Seed default supervisor (PIN: 1234)
INSERT INTO public.supervisors (name, pin, role)
VALUES ('Default Supervisor', '1234', 'admin');

-- Void/Refund log table
CREATE TABLE public.void_refund_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_sale_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('void', 'refund')),
  reason TEXT NOT NULL,
  items_json JSONB NOT NULL DEFAULT '[]',
  original_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  approved_by TEXT,
  processed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.void_refund_log ENABLE ROW LEVEL SECURITY;

-- Insert-only + select (no delete/update for audit integrity)
CREATE POLICY "Allow insert on void_refund_log"
  ON public.void_refund_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow select on void_refund_log"
  ON public.void_refund_log FOR SELECT
  USING (true);
