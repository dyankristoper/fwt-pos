import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceChargeConfig {
  enabled: boolean;
  percent: number;
}

const DEFAULT_CONFIG: ServiceChargeConfig = { enabled: true, percent: 8 };

export function useServiceCharge() {
  const [config, setConfig] = useState<ServiceChargeConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase
      .from('pos_settings')
      .select('setting_value')
      .eq('setting_key', 'service_charge')
      .limit(1)
      .single();

    if (data?.setting_value) {
      const val = data.setting_value as unknown as ServiceChargeConfig;
      setConfig({ enabled: val.enabled ?? true, percent: val.percent ?? 8 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateConfig = useCallback(async (newConfig: ServiceChargeConfig) => {
    setConfig(newConfig);
    await supabase
      .from('pos_settings')
      .update({ setting_value: newConfig as unknown as import('@/integrations/supabase/types').Json })
      .eq('setting_key', 'service_charge');
  }, []);

  const calculateServiceCharge = useCallback((subtotal: number): number => {
    if (!config.enabled) return 0;
    return Math.round((subtotal * config.percent) / 100 * 100) / 100;
  }, [config]);

  return { config, loading, updateConfig, calculateServiceCharge, refetch: fetchConfig };
}
