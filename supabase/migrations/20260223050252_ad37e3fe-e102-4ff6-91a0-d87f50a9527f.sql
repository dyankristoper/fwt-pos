
-- Idempotent transaction log: prevents double-deduction
CREATE TABLE public.pos_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  actual_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  api_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pos_transactions"
ON public.pos_transactions FOR ALL
USING (true) WITH CHECK (true);

-- Offline pending queue
CREATE TABLE public.pending_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  actual_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_method TEXT NOT NULL,
  order_total NUMERIC NOT NULL DEFAULT 0,
  order_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pending_transactions"
ON public.pending_transactions FOR ALL
USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_pos_transactions_updated_at
BEFORE UPDATE ON public.pos_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_pending_transactions_updated_at
BEFORE UPDATE ON public.pending_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
