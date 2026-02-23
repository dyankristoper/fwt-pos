import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, Package, Loader2, Search, GripVertical, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PosCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface MenuItemRow {
  id: string;
  sku: string;
  product_name: string;
  srp: number;
  kcal: number | null;
  display_size: string | null;
  is_active: boolean;
  is_combo_eligible: boolean;
  pos_category_id: string | null;
  category: string;
  pos_categories?: { name: string } | null;
}

type View = 'list' | 'form' | 'categories';

interface AdminMenuManagementProps {
  onBack: () => void;
}

const AdminMenuManagement = ({ onBack }: AdminMenuManagementProps) => {
  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formKcal, setFormKcal] = useState('');
  const [formSize, setFormSize] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formComboEligible, setFormComboEligible] = useState(false);
  const [skuValidating, setSkuValidating] = useState(false);
  const [skuValid, setSkuValid] = useState<boolean | null>(null);

  // Category form
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('');

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('id, sku, product_name, srp, kcal, display_size, is_active, is_combo_eligible, pos_category_id, category, pos_categories(name)')
      .order('product_name', { ascending: true }) as any;
    if (data) setItems(data);
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('pos_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setCategories(data as unknown as PosCategory[]);
  }, []);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [fetchItems, fetchCategories]);

  const resetForm = () => {
    setEditId(null);
    setFormName('');
    setFormSku('');
    setFormPrice('');
    setFormKcal('');
    setFormSize('');
    setFormCategoryId('');
    setFormComboEligible(false);
    setSkuValid(null);
  };

  const handleAdd = () => { resetForm(); setView('form'); };

  const handleEdit = (item: MenuItemRow) => {
    setEditId(item.id);
    setFormName(item.product_name);
    setFormSku(item.sku);
    setFormPrice(String(item.srp));
    setFormKcal(item.kcal != null ? String(item.kcal) : '');
    setFormSize(item.display_size || '');
    setFormCategoryId(item.pos_category_id || '');
    setFormComboEligible(item.is_combo_eligible);
    setSkuValid(true); // Existing item assumed valid
    setView('form');
  };

  const validateSku = async () => {
    if (!formSku.trim()) return;
    setSkuValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('sku-lookup', {
        body: { sku_code: formSku.trim() },
      });
      if (error) throw error;
      setSkuValid(data?.valid === true);
      if (data?.valid) {
        toast.success(`SKU ${formSku} validated ✓`);
      } else {
        toast.error(`SKU ${formSku} not found in FWTeam inventory`);
      }
    } catch {
      toast.error('Could not validate SKU — check connectivity');
      setSkuValid(null);
    } finally {
      setSkuValidating(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Item name is required'); return; }
    if (!formSku.trim()) { toast.error('SKU is required — every sellable item must have a valid SKU'); return; }
    const price = parseFloat(formPrice);
    if (isNaN(price) || price < 0) { toast.error('Enter a valid price'); return; }
    if (!formCategoryId) { toast.error('Select a category'); return; }

    // Block save if SKU not validated
    if (skuValid === false) {
      toast.error('Cannot save — SKU is invalid. No SKU → No Sale.');
      return;
    }

    // Check for duplicate SKU mapping (1:1 policy)
    const existing = items.find(i => i.sku === formSku.trim() && i.id !== editId);
    if (existing) {
      toast.error(`SKU ${formSku} is already mapped to "${existing.product_name}"`);
      return;
    }

    setSaving(true);
    try {
      const cat = categories.find(c => c.id === formCategoryId);
      const enumCategory = mapToDbEnum(cat?.name || 'Sides and Add-Ons');

      const payload: any = {
        product_name: formName.trim(),
        sku: formSku.trim(),
        srp: price,
        kcal: formKcal ? parseInt(formKcal) : null,
        display_size: formSize.trim() || null,
        pos_category_id: formCategoryId,
        is_combo_eligible: formComboEligible,
        category: enumCategory,
      };

      if (editId) {
        await supabase.from('menu_items').update(payload).eq('id', editId);
        toast.success('Item updated');
      } else {
        await supabase.from('menu_items').insert(payload);
        toast.success('Item created');
      }
      await fetchItems();
      setView('list');
      resetForm();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: MenuItemRow) => {
    await supabase.from('menu_items').update({ is_active: !item.is_active }).eq('id', item.id);
    toast.success(item.is_active ? `${item.product_name} deactivated` : `${item.product_name} activated`);
    fetchItems();
  };

  // Category CRUD
  const handleCatSave = async () => {
    if (!catName.trim()) { toast.error('Category name required'); return; }
    const order = parseInt(catSortOrder) || 0;
    
    if (catEditId) {
      await supabase.from('pos_categories').update({ name: catName.trim(), sort_order: order }).eq('id', catEditId);
      toast.success('Category updated');
    } else {
      await supabase.from('pos_categories').insert({ name: catName.trim(), sort_order: order } as any);
      toast.success('Category added');
    }
    setCatEditId(null);
    setCatName('');
    setCatSortOrder('');
    fetchCategories();
  };

  const toggleCatActive = async (cat: PosCategory) => {
    await supabase.from('pos_categories').update({ is_active: !cat.is_active } as any).eq('id', cat.id);
    toast.success(cat.is_active ? `${cat.name} hidden` : `${cat.name} shown`);
    fetchCategories();
  };

  const filtered = items.filter(i => {
    if (searchFilter && !i.product_name.toLowerCase().includes(searchFilter.toLowerCase()) && !i.sku.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (categoryFilter !== 'all' && i.pos_category_id !== categoryFilter) return false;
    return true;
  });

  const inputClass = 'w-full h-11 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-lg font-body text-sm text-foreground focus:border-accent focus:outline-none transition-colors';
  const labelClass = 'font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide';

  // Form view
  if (view === 'form') {
    return (
      <div className="h-full overflow-y-auto p-6 bg-background">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => { setView('list'); resetForm(); }} className="text-foreground/40 active:text-foreground p-1">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {editId ? 'Edit Item' : 'Add Item'}
            </h1>
          </div>

          <div className="bg-card rounded-xl border-2 border-foreground/10 p-5 space-y-4">
            <div>
              <label className={labelClass}>Item Name *</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} maxLength={200}
                className={inputClass} placeholder="Classic Chicken Sandwich" autoFocus />
            </div>

            {/* SKU with validation */}
            <div>
              <label className={labelClass}>Inventory SKU (FWTeam) *</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={formSku}
                  onChange={e => { setFormSku(e.target.value); setSkuValid(null); }}
                  maxLength={50}
                  className={`flex-1 h-11 px-3 bg-background border-2 rounded-lg font-display text-sm text-foreground focus:outline-none transition-colors ${
                    skuValid === true ? 'border-green-500/50' : skuValid === false ? 'border-accent' : 'border-foreground/10 focus:border-accent'
                  }`}
                  placeholder="FW-MENU-SAN-0001"
                />
                <button
                  onClick={validateSku}
                  disabled={!formSku.trim() || skuValidating}
                  className="h-11 px-4 bg-foreground/10 text-foreground rounded-lg font-display font-semibold text-xs active:scale-[0.97] disabled:opacity-30 flex items-center gap-1.5"
                >
                  {skuValidating ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Validate
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {skuValid === true && (
                  <span className="flex items-center gap-1 text-green-500 text-xs font-display font-semibold">
                    <CheckCircle size={12} /> Valid SKU
                  </span>
                )}
                {skuValid === false && (
                  <span className="flex items-center gap-1 text-accent text-xs font-display font-semibold">
                    <XCircle size={12} /> SKU not found — No SKU → No Sale
                  </span>
                )}
                {skuValid === null && formSku && (
                  <span className="text-foreground/40 text-[10px]">Click Validate to check SKU against FWTeam</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Price (₱) *</label>
                <input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} min="0" step="0.01"
                  className={`${inputClass} text-center`} placeholder="220" />
              </div>
              <div>
                <label className={labelClass}>kCal (optional)</label>
                <input type="number" value={formKcal} onChange={e => setFormKcal(e.target.value)} min="0"
                  className={`${inputClass} text-center`} placeholder="720" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Size / UoM (display)</label>
                <input type="text" value={formSize} onChange={e => setFormSize(e.target.value)} maxLength={50}
                  className={inputClass} placeholder="Regular, 85g, 500ml" />
              </div>
              <div>
                <label className={labelClass}>Category *</label>
                <select value={formCategoryId} onChange={e => setFormCategoryId(e.target.value)}
                  className={`${inputClass} appearance-none`}>
                  <option value="">— Select —</option>
                  {categories.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between bg-foreground/5 rounded-lg p-3">
              <span className="font-display text-xs font-semibold text-foreground/70">Combo Eligible</span>
              <button onClick={() => setFormComboEligible(!formComboEligible)}>
                {formComboEligible ? <ToggleRight size={24} className="text-pos-gold-dark" /> : <ToggleLeft size={24} className="text-foreground/30" />}
              </button>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !formName.trim() || !formSku.trim() || !formPrice || skuValid === false}
            className="w-full mt-5 h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
            {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Item'}
          </button>
        </div>
      </div>
    );
  }

  // Categories view
  if (view === 'categories') {
    return (
      <div className="h-full overflow-y-auto p-6 bg-background">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setView('list')} className="text-foreground/40 active:text-foreground p-1">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">Categories</h1>
          </div>

          <div className="bg-card rounded-xl border-2 border-foreground/10 p-4 mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <input type="text" value={catName} onChange={e => setCatName(e.target.value)} maxLength={50}
                  className={inputClass} placeholder="Category name" />
              </div>
              <div>
                <input type="number" value={catSortOrder} onChange={e => setCatSortOrder(e.target.value)} min="0"
                  className={`${inputClass} text-center`} placeholder="Order" />
              </div>
            </div>
            <div className="flex gap-2">
              {catEditId && (
                <button onClick={() => { setCatEditId(null); setCatName(''); setCatSortOrder(''); }}
                  className="flex-1 h-10 border-2 border-foreground/10 text-foreground/50 rounded-lg font-display font-semibold text-sm">
                  Cancel
                </button>
              )}
              <button onClick={handleCatSave} disabled={!catName.trim()}
                className="flex-1 h-10 bg-pos-gold text-primary rounded-lg font-display font-bold text-sm active:scale-[0.97] disabled:opacity-30">
                {catEditId ? 'Update' : 'Add Category'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className={`bg-card rounded-xl border-2 p-3 flex items-center justify-between ${cat.is_active ? 'border-foreground/10' : 'border-foreground/5 opacity-50'}`}>
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-foreground/20" />
                  <div>
                    <p className="font-display font-bold text-sm text-foreground">{cat.name}</p>
                    <p className="text-[11px] text-foreground/40">Sort: {cat.sort_order}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setCatEditId(cat.id); setCatName(cat.name); setCatSortOrder(String(cat.sort_order)); }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-foreground/30 active:text-foreground">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => toggleCatActive(cat)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-foreground/30 active:text-foreground">
                    {cat.is_active ? <ToggleRight size={18} className="text-pos-gold-dark" /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full overflow-y-auto p-6 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-foreground/40 active:text-foreground p-1">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">Menu Items</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('categories')}
              className="h-10 px-3 bg-foreground/10 text-foreground rounded-lg font-display font-semibold text-xs flex items-center gap-1.5 active:scale-[0.97]">
              Categories
            </button>
            <button onClick={handleAdd}
              className="h-10 px-4 bg-primary text-primary-foreground rounded-lg font-display font-semibold text-sm flex items-center gap-2 active:scale-[0.97]">
              <Plus size={16} /> Add Item
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
            <input type="text" value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-card border-2 border-foreground/10 rounded-lg font-body text-sm text-foreground focus:border-accent focus:outline-none"
              placeholder="Search items or SKU..." />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="h-10 px-3 bg-card border-2 border-foreground/10 rounded-lg font-display text-xs text-foreground appearance-none">
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-foreground/30">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-foreground/30">
            <Package size={48} className="mx-auto mb-3" />
            <p className="font-display font-semibold">No items found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => (
              <div key={item.id} className={`bg-card rounded-xl border-2 p-4 flex items-center justify-between ${item.is_active ? 'border-foreground/10' : 'border-foreground/5 opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-sm text-foreground">{item.product_name}</span>
                    {item.display_size && (
                      <span className="bg-foreground/10 text-foreground/60 text-[10px] font-display font-bold px-1.5 py-0.5 rounded">{item.display_size}</span>
                    )}
                    {item.is_combo_eligible && (
                      <span className="bg-accent/10 text-accent text-[10px] font-display font-bold px-1.5 py-0.5 rounded">COMBO</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-foreground/45">
                    <span className="font-display font-semibold">₱{Number(item.srp).toFixed(2)}</span>
                    <span>·</span>
                    <span>{item.sku}</span>
                    <span>·</span>
                    <span>{(item.pos_categories as any)?.name || item.category}</span>
                    {item.kcal != null && <><span>·</span><span>{item.kcal} kcal</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleEdit(item)}
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-foreground/30 active:text-foreground active:bg-foreground/5">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => toggleActive(item)}
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-foreground/30 active:text-foreground active:bg-foreground/5">
                    {item.is_active ? <ToggleRight size={20} className="text-pos-gold-dark" /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-foreground/30 mt-4">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
};

function mapToDbEnum(catName: string): string {
  const map: Record<string, string> = {
    'Signature Sandwiches': 'Signature Sandwiches',
    'Chicken Boxes': 'Chicken Boxes',
    'Sides': 'Sides and Add-Ons',
    'Add-ons': 'Sides and Add-Ons',
    'Beverages': 'Beverages',
  };
  return map[catName] || 'Sides and Add-Ons';
}

export default AdminMenuManagement;
