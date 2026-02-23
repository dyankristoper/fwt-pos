import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, Tag, ShieldCheck, Users, Percent, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface DiscountType {
  id: string;
  discount_code: string;
  discount_name: string;
  discount_percent: number;
  scope: string;
  discount_type: string;
  is_vat_exempt: boolean;
  requires_id_number: boolean;
  id_type: string | null;
  requires_customer_name: boolean;
  requires_signature: boolean;
  requires_promo_code: boolean;
  promo_code_value: string | null;
  requires_note: boolean;
  is_active: boolean;
}

type View = 'list' | 'form';

const DiscountManagement = () => {
  const [view, setView] = useState<View>('list');
  const [discounts, setDiscounts] = useState<DiscountType[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formPercent, setFormPercent] = useState('');
  const [formScope, setFormScope] = useState<'LINE_ITEM' | 'GLOBAL_ORDER'>('LINE_ITEM');
  const [formDiscType, setFormDiscType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [formVatExempt, setFormVatExempt] = useState(false);
  const [formRequiresId, setFormRequiresId] = useState(false);
  const [formIdType, setFormIdType] = useState('');
  const [formRequiresName, setFormRequiresName] = useState(false);
  const [formRequiresSignature, setFormRequiresSignature] = useState(false);
  const [formRequiresPromo, setFormRequiresPromo] = useState(false);
  const [formPromoCode, setFormPromoCode] = useState('');
  const [formRequiresNote, setFormRequiresNote] = useState(false);

  const fetchDiscounts = useCallback(async () => {
    const { data } = await supabase
      .from('discount_types')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setDiscounts(data as unknown as DiscountType[]);
  }, []);

  useEffect(() => { fetchDiscounts(); }, [fetchDiscounts]);

  const resetForm = () => {
    setEditId(null);
    setFormCode('');
    setFormName('');
    setFormPercent('');
    setFormScope('LINE_ITEM');
    setFormDiscType('PERCENT');
    setFormVatExempt(false);
    setFormRequiresId(false);
    setFormIdType('');
    setFormRequiresName(false);
    setFormRequiresSignature(false);
    setFormRequiresPromo(false);
    setFormPromoCode('');
    setFormRequiresNote(false);
  };

  const handleAdd = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (d: DiscountType) => {
    setEditId(d.id);
    setFormCode(d.discount_code);
    setFormName(d.discount_name);
    setFormPercent(String(d.discount_percent));
    setFormScope(d.scope as 'LINE_ITEM' | 'GLOBAL_ORDER');
    setFormDiscType(d.discount_type as 'PERCENT' | 'FIXED');
    setFormVatExempt(d.is_vat_exempt);
    setFormRequiresId(d.requires_id_number);
    setFormIdType(d.id_type || '');
    setFormRequiresName(d.requires_customer_name);
    setFormRequiresSignature(d.requires_signature);
    setFormRequiresPromo(d.requires_promo_code);
    setFormPromoCode(d.promo_code_value || '');
    setFormRequiresNote(d.requires_note);
    setView('form');
  };

  const handleSave = async () => {
    if (!formCode.trim() || !formName.trim()) {
      toast.error('Code and name are required');
      return;
    }
    const pct = parseFloat(formPercent);
    if (isNaN(pct) || pct < 0) {
      toast.error('Enter a valid discount value');
      return;
    }
    if (formRequiresPromo && !formPromoCode.trim()) {
      toast.error('Promo code value is required when promo code is enabled');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        discount_code: formCode.trim().toUpperCase(),
        discount_name: formName.trim(),
        discount_percent: pct,
        scope: formScope,
        discount_type: formDiscType,
        is_vat_exempt: formVatExempt,
        requires_id_number: formRequiresId,
        id_type: formRequiresId ? formIdType.trim() || null : null,
        requires_customer_name: formRequiresName,
        requires_signature: formRequiresSignature,
        requires_promo_code: formRequiresPromo,
        promo_code_value: formRequiresPromo ? formPromoCode.trim() : null,
        requires_note: formRequiresNote,
      };

      if (editId) {
        await supabase.from('discount_types').update(payload).eq('id', editId);
        toast.success('Discount updated');
      } else {
        await supabase.from('discount_types').insert(payload);
        toast.success('Discount created');
      }
      await fetchDiscounts();
      setView('list');
      resetForm();
    } catch {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (d: DiscountType) => {
    await supabase.from('discount_types').update({ is_active: !d.is_active }).eq('id', d.id);
    toast.success(d.is_active ? `${d.discount_name} deactivated` : `${d.discount_name} activated`);
    fetchDiscounts();
  };

  const scopeIcon = (scope: string) => scope === 'GLOBAL_ORDER' ? <Users size={14} /> : <Tag size={14} />;
  const typeIcon = (type: string) => type === 'PERCENT' ? <Percent size={14} /> : <Hash size={14} />;

  if (view === 'form') {
    return (
      <div className="bg-card rounded-xl border-2 border-foreground/10 p-5">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => { setView('list'); resetForm(); }} className="text-foreground/40 active:text-foreground p-1">
            <ArrowLeft size={18} />
          </button>
          <h3 className="font-display text-lg font-bold text-foreground">
            {editId ? 'Edit Discount' : 'Add Discount'}
          </h3>
        </div>

        <div className="space-y-4">
          {/* Code + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Code *</label>
              <input type="text" value={formCode} onChange={e => setFormCode(e.target.value)} maxLength={20}
                className="w-full h-10 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-lg font-display text-sm text-foreground focus:border-accent focus:outline-none transition-colors uppercase"
                placeholder="SC" />
            </div>
            <div>
              <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Name *</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} maxLength={100}
                className="w-full h-10 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-lg font-body text-sm text-foreground focus:border-accent focus:outline-none transition-colors"
                placeholder="Senior Citizen" />
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Scope</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setFormScope('LINE_ITEM')}
                className={`flex-1 h-10 rounded-lg font-display font-semibold text-xs flex items-center justify-center gap-1.5 border-2 transition-colors ${
                  formScope === 'LINE_ITEM' ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground/60 border-foreground/10'
                }`}>
                <Tag size={14} /> Line Item
              </button>
              <button onClick={() => setFormScope('GLOBAL_ORDER')}
                className={`flex-1 h-10 rounded-lg font-display font-semibold text-xs flex items-center justify-center gap-1.5 border-2 transition-colors ${
                  formScope === 'GLOBAL_ORDER' ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground/60 border-foreground/10'
                }`}>
                <Users size={14} /> Global Order
              </button>
            </div>
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Type</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setFormDiscType('PERCENT')}
                  className={`flex-1 h-10 rounded-lg font-display font-semibold text-xs flex items-center justify-center gap-1 border-2 transition-colors ${
                    formDiscType === 'PERCENT' ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground/60 border-foreground/10'
                  }`}>
                  <Percent size={12} /> %
                </button>
                <button onClick={() => setFormDiscType('FIXED')}
                  className={`flex-1 h-10 rounded-lg font-display font-semibold text-xs flex items-center justify-center gap-1 border-2 transition-colors ${
                    formDiscType === 'FIXED' ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground/60 border-foreground/10'
                  }`}>
                  <Hash size={12} /> ₱
                </button>
              </div>
            </div>
            <div>
              <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">
                Value {formDiscType === 'PERCENT' ? '(%)' : '(₱)'}
              </label>
              <input type="number" value={formPercent} onChange={e => setFormPercent(e.target.value)} min="0" max={formDiscType === 'PERCENT' ? '100' : undefined}
                className="w-full h-10 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-lg font-display text-sm text-foreground focus:border-accent focus:outline-none transition-colors text-center"
                placeholder="20" />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2.5 bg-foreground/5 rounded-xl p-3">
            <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Requirements</label>

            <ToggleRow label="VAT Exempt" checked={formVatExempt} onChange={setFormVatExempt} />
            <ToggleRow label="Requires ID Number" checked={formRequiresId} onChange={setFormRequiresId} />

            {formRequiresId && (
              <div className="pl-6">
                <label className="font-display text-[10px] font-semibold text-foreground/50 uppercase">ID Type</label>
                <input type="text" value={formIdType} onChange={e => setFormIdType(e.target.value)} maxLength={50}
                  className="w-full h-9 mt-0.5 px-3 bg-background border border-foreground/10 rounded-lg font-body text-xs text-foreground focus:border-accent focus:outline-none transition-colors"
                  placeholder="e.g. Senior Citizen ID" />
              </div>
            )}

            <ToggleRow label="Requires Customer Name" checked={formRequiresName} onChange={setFormRequiresName} />
            <ToggleRow label="Requires Signature" checked={formRequiresSignature} onChange={setFormRequiresSignature} />
            <ToggleRow label="Requires Promo Code" checked={formRequiresPromo} onChange={setFormRequiresPromo} />

            {formRequiresPromo && (
              <div className="pl-6">
                <label className="font-display text-[10px] font-semibold text-foreground/50 uppercase">Promo Code Value</label>
                <input type="text" value={formPromoCode} onChange={e => setFormPromoCode(e.target.value)} maxLength={50}
                  className="w-full h-9 mt-0.5 px-3 bg-background border border-foreground/10 rounded-lg font-display text-xs text-foreground focus:border-accent focus:outline-none transition-colors uppercase"
                  placeholder="FWTEAM2025" />
              </div>
            )}

            <ToggleRow label="Requires Note" checked={formRequiresNote} onChange={setFormRequiresNote} />
          </div>
        </div>

        <button onClick={handleSave} disabled={loading || !formCode.trim() || !formName.trim()}
          className="w-full mt-5 h-12 bg-pos-gold text-primary rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform disabled:opacity-30">
          {loading ? 'Saving...' : editId ? 'Save Changes' : 'Create Discount'}
        </button>
      </div>
    );
  }

  // List view
  return (
    <div className="bg-card rounded-xl border-2 border-foreground/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <ShieldCheck size={18} className="text-accent" />
          Discount Types
        </h3>
        <button onClick={handleAdd}
          className="h-9 px-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold text-xs flex items-center gap-1.5 active:scale-[0.97] transition-transform">
          <Plus size={14} /> Add
        </button>
      </div>

      {discounts.length === 0 ? (
        <div className="text-center py-8 text-foreground/30">
          <Tag size={36} className="mx-auto mb-2" />
          <p className="font-display font-semibold text-sm">No discounts configured</p>
        </div>
      ) : (
        <div className="space-y-2">
          {discounts.map(d => (
            <div key={d.id} className={`bg-background rounded-lg border p-3 flex items-center justify-between ${d.is_active ? 'border-foreground/10' : 'border-foreground/5 opacity-50'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-sm text-foreground">{d.discount_name}</span>
                  <span className="bg-foreground/10 text-foreground/60 text-[10px] font-display font-bold px-1.5 py-0.5 rounded uppercase">{d.discount_code}</span>
                  {d.is_vat_exempt && (
                    <span className="bg-accent/10 text-accent text-[10px] font-display font-bold px-1.5 py-0.5 rounded">VAT-EXEMPT</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-foreground/45">
                  <span className="flex items-center gap-0.5">{scopeIcon(d.scope)} {d.scope === 'GLOBAL_ORDER' ? 'Global' : 'Line Item'}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">{typeIcon(d.discount_type)} {d.discount_percent}{d.discount_type === 'PERCENT' ? '%' : '₱'}</span>
                  {d.requires_id_number && <><span>·</span><span>ID: {d.id_type || 'Required'}</span></>}
                  {d.requires_promo_code && <><span>·</span><span>Promo Code</span></>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleEdit(d)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-foreground/30 active:text-foreground active:bg-foreground/5 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => toggleActive(d)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-foreground/30 active:text-foreground active:bg-foreground/5 transition-colors">
                  {d.is_active ? <ToggleRight size={18} className="text-pos-gold-dark" /> : <ToggleLeft size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Toggle row helper
const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <span className="font-display text-xs text-foreground/70">{label}</span>
    <button onClick={() => onChange(!checked)} className="p-0.5">
      {checked ? <ToggleRight size={22} className="text-pos-gold-dark" /> : <ToggleLeft size={22} className="text-foreground/30" />}
    </button>
  </div>
);

export default DiscountManagement;
