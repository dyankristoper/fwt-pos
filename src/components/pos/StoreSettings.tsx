import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Store, ImageOff } from "lucide-react";

export interface StoreIdentity {
  display_name: string;
  logo_url: string;
  document_title: string;
}

const DEFAULT_IDENTITY: StoreIdentity = {
  display_name: "",
  logo_url: "",
  document_title: "",
};

const StoreSettings = () => {
  const [identity, setIdentity] = useState<StoreIdentity>(DEFAULT_IDENTITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pos_settings")
        .select("setting_value")
        .eq("setting_key", "store_identity")
        .single();
      if (data?.setting_value) {
        const saved = data.setting_value as unknown as StoreIdentity;
        setIdentity(saved);
        if (saved.document_title) document.title = saved.document_title;
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!identity.display_name.trim()) {
      toast.error("Store display name is required");
      return;
    }
    setSaving(true);
    try {
      const value = {
        display_name: identity.display_name.trim(),
        logo_url: identity.logo_url.trim(),
        document_title: identity.document_title.trim(),
      };
      if (value.document_title) document.title = value.document_title;
      const { data: existing } = await supabase
        .from("pos_settings")
        .select("id")
        .eq("setting_key", "store_identity")
        .single();
      if (existing) {
        await supabase
          .from("pos_settings")
          .update({ setting_value: value as any })
          .eq("setting_key", "store_identity");
      } else {
        await supabase
          .from("pos_settings")
          .insert({ setting_key: "store_identity", setting_value: value as any });
      }
      toast.success("Store identity saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const inputClass =
    "w-full h-10 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-lg font-body text-sm text-foreground focus:border-accent focus:outline-none transition-colors";
  const labelClass =
    "font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide";

  return (
    <div className="bg-foreground/[0.03] rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Store size={16} className="text-foreground/40" />
        <h3 className="font-display text-sm font-bold text-foreground/60 uppercase tracking-wider">
          Store Identity
        </h3>
      </div>

      <div>
        <label className={labelClass}>Display Name *</label>
        <input
          type="text"
          value={identity.display_name}
          onChange={(e) => setIdentity({ ...identity, display_name: e.target.value })}
          maxLength={40}
          className={inputClass}
          placeholder="e.g. Fifth D"
        />
        <p className="text-[11px] text-foreground/40 mt-1">
          Shown in the POS header
        </p>
      </div>

      <div>
        <label className={labelClass}>Document Title</label>
        <input
          type="text"
          value={identity.document_title}
          onChange={(e) => setIdentity({ ...identity, document_title: e.target.value })}
          maxLength={80}
          className={inputClass}
          placeholder="e.g. Fifth D POS"
        />
        <p className="text-[11px] text-foreground/40 mt-1">
          Browser tab / window title — leave blank to keep current
        </p>
      </div>

      <div>
        <label className={labelClass}>Logo URL</label>
        <input
          type="url"
          value={identity.logo_url}
          onChange={(e) => {
            setIdentity({ ...identity, logo_url: e.target.value });
            setLogoError(false);
          }}
          className={inputClass}
          placeholder="https://example.com/logo.png"
        />
        <p className="text-[11px] text-foreground/40 mt-1">
          Link to a hosted image — leave blank to use the default logo
        </p>
      </div>

      {/* Logo preview */}
      {identity.logo_url && (
        <div className="flex items-center gap-3 pt-1">
          <span className="font-display text-[11px] font-semibold text-foreground/40 uppercase tracking-wide">
            Preview
          </span>
          {logoError ? (
            <div className="h-10 w-10 rounded-full bg-foreground/10 flex items-center justify-center">
              <ImageOff size={16} className="text-foreground/30" />
            </div>
          ) : (
            <img
              src={identity.logo_url}
              alt="Logo preview"
              className="h-10 w-10 rounded-full object-cover border-2 border-foreground/10"
              onError={() => setLogoError(true)}
            />
          )}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !identity.display_name.trim()}
        className="w-full h-11 bg-pos-gold text-primary rounded-xl font-display font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-30"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
};

export default StoreSettings;
