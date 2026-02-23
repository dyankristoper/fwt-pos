
-- Create pos_settings table for admin-configurable settings (service charge, etc.)
CREATE TABLE public.pos_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;

-- Allow all access (no auth in POS)
CREATE POLICY "Allow all access to pos_settings"
  ON public.pos_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_pos_settings_updated_at
  BEFORE UPDATE ON public.pos_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Seed default service charge setting
INSERT INTO public.pos_settings (setting_key, setting_value)
VALUES ('service_charge', '{"enabled": true, "percent": 8}'::jsonb);
