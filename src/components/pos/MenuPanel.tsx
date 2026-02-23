import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, MenuItem } from './types';
import { Flame, Loader2 } from 'lucide-react';

// Legacy images for backward compat
import sandwichImg from '@/assets/pos/sandwich.jpg';
import chickenImg from '@/assets/pos/chicken-box.jpg';
import sidesImg from '@/assets/pos/sides.jpg';
import addonsImg from '@/assets/pos/addons.jpg';
import drinksImg from '@/assets/pos/drinks.jpg';

interface PosCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface DbMenuItem {
  id: string;
  sku: string;
  product_name: string;
  srp: number;
  kcal: number | null;
  display_size: string | null;
  is_active: boolean;
  is_combo_eligible: boolean;
  pos_category_id: string | null;
  gross_margin_percent: number;
  combo_sku: string | null;
}

// Map category names to hero images
const categoryImageMap: Record<string, string> = {
  'Signature Sandwiches': sandwichImg,
  'Chicken Boxes': chickenImg,
  'Sides': sidesImg,
  'Add-ons': addonsImg,
  'Beverages': drinksImg,
};

interface MenuPanelProps {
  activeCategory: MenuCategory | string;
  onCategoryChange: (category: any) => void;
  onItemTap: (item: MenuItem) => void;
}

// Map DB category name to legacy MenuCategory type for backward compat
function toLegacyCategory(name: string): MenuCategory {
  const map: Record<string, MenuCategory> = {
    'Signature Sandwiches': 'sandwiches',
    'Chicken Boxes': 'chicken',
    'Sides': 'sides',
    'Add-ons': 'addons',
    'Beverages': 'beverages',
  };
  return map[name] || 'sides';
}

const MenuPanel = ({ activeCategory, onCategoryChange, onItemTap }: MenuPanelProps) => {
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [dbItems, setDbItems] = useState<DbMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCatId, setActiveCatId] = useState<string>('');

  const fetchData = useCallback(async () => {
    const [catRes, itemRes] = await Promise.all([
      supabase.from('pos_categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('menu_items').select('id, sku, product_name, srp, kcal, display_size, is_active, is_combo_eligible, pos_category_id, gross_margin_percent, combo_sku').eq('is_active', true),
    ]);
    const cats = (catRes.data as unknown as PosCategory[]) || [];
    const items = (itemRes.data as unknown as DbMenuItem[]) || [];
    setCategories(cats);
    setDbItems(items);
    
    // Set initial active category
    if (cats.length > 0 && !activeCatId) {
      setActiveCatId(cats[0].id);
    }
    setLoading(false);
  }, [activeCatId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeCat = categories.find(c => c.id === activeCatId);
  const filteredItems = dbItems.filter(i => i.pos_category_id === activeCatId);
  const categoryImage = activeCat ? (categoryImageMap[activeCat.name] || sandwichImg) : sandwichImg;

  const handleCategoryChange = (catId: string) => {
    setActiveCatId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      onCategoryChange(toLegacyCategory(cat.name));
    }
  };

  const toMenuItem = (db: DbMenuItem): MenuItem => ({
    id: db.id,
    sku_code: db.sku,
    name: db.product_name,
    price: Number(db.srp),
    category: activeCat ? toLegacyCategory(activeCat.name) : 'sides',
    kcal: db.kcal,
    grossMarginPercent: Number(db.gross_margin_percent),
    combo_sku: db.combo_sku,
    is_combo_eligible: db.is_combo_eligible,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-foreground/30" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-3 lg:p-4">
      {/* Category tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 shrink-0">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`h-14 px-5 rounded-xl font-display font-bold text-sm whitespace-nowrap active:scale-[0.97] transition-all shrink-0 ${
              activeCatId === cat.id
                ? 'bg-pos-gold text-primary shadow-lg'
                : 'bg-card text-foreground/60 border-2 border-foreground/10'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Category hero image */}
      <div className="relative h-28 lg:h-32 rounded-xl overflow-hidden mb-3 shrink-0">
        <img
          src={categoryImage}
          alt={activeCat?.name || ''}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" />
        <div className="absolute inset-0 flex items-center px-6">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-primary-foreground drop-shadow-lg">
            {activeCat?.name || 'Menu'}
          </h2>
        </div>
      </div>

      {/* Menu items grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 flex-1 content-start auto-rows-min">
        {filteredItems.map(dbItem => {
          const item = toMenuItem(dbItem);
          return (
            <button
              key={item.id}
              onClick={() => onItemTap(item)}
              className="bg-card border-2 border-foreground/10 rounded-xl p-5 flex flex-col items-start justify-between min-h-[110px] active:scale-[0.96] active:border-pos-gold active:shadow-lg transition-all shadow-sm text-left"
            >
              <div className="flex items-start justify-between w-full">
                <span className="font-display font-bold text-lg lg:text-xl text-foreground leading-tight">
                  {item.name}
                </span>
                {dbItem.display_size && (
                  <span className="text-[10px] font-body text-foreground/40 ml-2 shrink-0 bg-foreground/5 px-1.5 py-0.5 rounded">
                    {dbItem.display_size}
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between w-full mt-3">
                <span className="font-display font-bold text-2xl text-pos-gold-dark">
                  ₱{item.price.toFixed(2)}
                </span>
                <div className="flex items-center gap-2">
                  {item.kcal != null && (
                    <span className="text-[10px] font-body text-foreground/40">
                      {item.kcal} kcal
                    </span>
                  )}
                  {item.grossMarginPercent != null && (
                    <span
                      className={`h-3 w-3 rounded-full shrink-0 ${
                        item.grossMarginPercent >= 60
                          ? 'bg-green-500'
                          : item.grossMarginPercent >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      title={`Margin: ${item.grossMarginPercent}%`}
                    />
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="col-span-full text-center py-12 text-foreground/30">
            <p className="font-display font-semibold">No items in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuPanel;
