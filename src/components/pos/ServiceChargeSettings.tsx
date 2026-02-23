import { useState, useEffect } from 'react';
import { useServiceCharge, ServiceChargeConfig } from './useServiceCharge';
import { toast } from 'sonner';
import { Settings, ToggleLeft, ToggleRight } from 'lucide-react';

const ServiceChargeSettings = () => {
  const { config, loading, updateConfig } = useServiceCharge();
  const [enabled, setEnabled] = useState(config.enabled);
  const [percent, setPercent] = useState(String(config.percent));

  useEffect(() => {
    setEnabled(config.enabled);
    setPercent(String(config.percent));
  }, [config]);

  const handleSave = async () => {
    const p = parseFloat(percent);
    if (isNaN(p) || p < 0 || p > 100) {
      toast.error('Enter a valid percentage (0-100)');
      return;
    }
    const newConfig: ServiceChargeConfig = { enabled, percent: p };
    await updateConfig(newConfig);
    toast.success(`Service charge ${enabled ? `set to ${p}%` : 'disabled'}`);
  };

  if (loading) return null;

  return (
    <div className="bg-foreground/[0.03] rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Settings size={16} className="text-foreground/40" />
        <h3 className="font-display text-sm font-bold text-foreground/60 uppercase tracking-wider">Service Charge</h3>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/70">Enable Service Charge</span>
        <button onClick={() => setEnabled(!enabled)} className="text-foreground active:scale-[0.97] transition-transform">
          {enabled ? <ToggleRight size={28} className="text-pos-gold-dark" /> : <ToggleLeft size={28} className="text-foreground/30" />}
        </button>
      </div>

      {enabled && (
        <div>
          <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">
            Percentage (%)
          </label>
          <input
            type="number"
            value={percent}
            onChange={e => setPercent(e.target.value)}
            min="0"
            max="100"
            step="0.5"
            className="w-full h-12 mt-1 px-4 bg-background border-2 border-foreground/10 rounded-xl font-display text-xl text-foreground focus:border-accent focus:outline-none transition-colors text-center"
          />
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full h-11 bg-pos-gold text-primary rounded-xl font-display font-bold text-sm active:scale-[0.97] transition-transform"
      >
        Save
      </button>
    </div>
  );
};

export default ServiceChargeSettings;
