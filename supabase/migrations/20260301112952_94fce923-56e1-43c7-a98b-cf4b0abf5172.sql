ALTER TABLE public.completed_sales ADD COLUMN cash_received numeric DEFAULT NULL;
ALTER TABLE public.completed_sales ADD COLUMN change_amount numeric DEFAULT NULL;