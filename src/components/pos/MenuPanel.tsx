import { MenuCategory, MenuItem } from './types';
import { menuItems, categoryLabels, categoryOrder } from './menuData';
import { Flame } from 'lucide-react';

interface MenuPanelProps {
  activeCategory: MenuCategory;
  onCategoryChange: (category: MenuCategory) => void;
  onItemTap: (item: MenuItem) => void;
}

const MenuPanel = ({ activeCategory, onCategoryChange, onItemTap }: MenuPanelProps) => {
  const filteredItems = menuItems.filter(item => item.category === activeCategory);

  return (
    <div className="flex flex-col h-full p-4">
      {/* Category tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 shrink-0">
        {categoryOrder.map(cat => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`h-12 px-5 rounded-lg font-display font-semibold text-sm whitespace-nowrap active:scale-[0.97] transition-all ${
              activeCategory === cat
                ? 'bg-pos-gold text-primary shadow-md'
                : 'bg-card text-foreground/70 border-2 border-foreground/10'
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Menu items grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1 content-start">
        {filteredItems.map(item => (
          <button
            key={item.id}
            onClick={() => onItemTap(item)}
            className="bg-card border-2 border-foreground/10 rounded-xl p-4 flex flex-col items-start justify-between min-h-[100px] active:scale-[0.96] active:border-pos-gold transition-all shadow-sm text-left"
          >
            <div className="flex items-start justify-between w-full">
              <span className="font-display font-bold text-lg text-foreground leading-tight">
                {item.name}
              </span>
              {item.spicy && (
                <span className="text-accent ml-2 shrink-0">
                  <Flame size={20} />
                </span>
              )}
            </div>
            <span className="font-display font-bold text-xl text-pos-gold-dark mt-2">
              ₱{item.price}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuPanel;
