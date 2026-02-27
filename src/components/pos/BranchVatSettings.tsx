import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, ToggleLeft, ToggleRight } from "lucide-react";

interface BranchConfig {
  code: string;
  name: string;
  legal_name: string;
  address: string;
  tin: string;
}

const DEFAULT_BRANCH: BranchConfig = {
  code: "QC01",
  name: "Main Branch",
  legal_name: "Fifth D Fried Chicken Kiosk.",
  address: "1610 Quezon Avenue, Quezon City",
  tin: "000-000-000-000",
};

const BranchVatSettings = () => {
  const [branch, setBranch] = useState<BranchConfig>(DEFAULT_BRANCH);
  const [vatInclusive, setVatInclusive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [branchRes, vatRes] = await Promise.all([
        supabase.from("pos_settings").select("setting_value").eq("setting_key", "branch_config").single(),
        supabase.from("pos_settings").select("setting_value").eq("setting_key", "vat_mode").single(),
      ]);
      if (branchRes.data?.setting_value) {
        setBranch(branchRes.data.setting_value as unknown as BranchConfig);
      }
      if (vatRes.data?.setting_value) {
        setVatInclusive((vatRes.data.setting_value as any).mode !== "exclusive");
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!branch.code.trim() || !branch.legal_name.trim() || !branch.tin.trim()) {
      toast.error("Branch code, legal name, and TIN are required");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        supabase
          .from("pos_settings")
          .update({
            setting_value: branch as any,
          })
          .eq("setting_key", "branch_config"),
        supabase
          .from("pos_settings")
          .update({
            setting_value: { mode: vatInclusive ? "inclusive" : "exclusive" } as any,
          })
          .eq("setting_key", "vat_mode"),
      ]);
      toast.success("Branch & VAT settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const inputClass =
    "w-full h-10 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-lg font-body text-sm text-foreground focus:border-accent focus:outline-none transition-colors";
  const labelClass = "font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide";

  return (
    <div className="bg-foreground/[0.03] rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Building2 size={16} className="text-foreground/40" />
        <h3 className="font-display text-sm font-bold text-foreground/60 uppercase tracking-wider">Branch & VAT</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Branch Code *</label>
          <input
            type="text"
            value={branch.code}
            onChange={(e) => setBranch({ ...branch, code: e.target.value })}
            maxLength={10}
            className={inputClass}
            placeholder="QC01"
          />
        </div>
        <div>
          <label className={labelClass}>Branch Name</label>
          <input
            type="text"
            value={branch.name}
            onChange={(e) => setBranch({ ...branch, name: e.target.value })}
            maxLength={100}
            className={inputClass}
            placeholder="Main Branch"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Legal Name *</label>
        <input
          type="text"
          value={branch.legal_name}
          onChange={(e) => setBranch({ ...branch, legal_name: e.target.value })}
          maxLength={200}
          className={inputClass}
          placeholder="Featherweight Chicken Inc."
        />
      </div>

      <div>
        <label className={labelClass}>Address</label>
        <input
          type="text"
          value={branch.address}
          onChange={(e) => setBranch({ ...branch, address: e.target.value })}
          maxLength={300}
          className={inputClass}
          placeholder="1610 Quezon Avenue, Quezon City"
        />
      </div>

      <div>
        <label className={labelClass}>TIN *</label>
        <input
          type="text"
          value={branch.tin}
          onChange={(e) => setBranch({ ...branch, tin: e.target.value })}
          maxLength={20}
          className={inputClass}
          placeholder="000-000-000-000"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-sm text-foreground/70">VAT Mode</span>
          <p className="text-[11px] text-foreground/40">{vatInclusive ? "Prices include VAT" : "VAT added on top"}</p>
        </div>
        <button
          onClick={() => setVatInclusive(!vatInclusive)}
          className="flex items-center gap-2 active:scale-[0.97] transition-transform"
        >
          <span className="font-display text-xs font-bold text-foreground/60">
            {vatInclusive ? "Inclusive" : "Exclusive"}
          </span>
          {vatInclusive ? (
            <ToggleRight size={28} className="text-pos-gold-dark" />
          ) : (
            <ToggleLeft size={28} className="text-foreground/30" />
          )}
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-11 bg-pos-gold text-primary rounded-xl font-display font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-30"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
};

export default BranchVatSettings;
