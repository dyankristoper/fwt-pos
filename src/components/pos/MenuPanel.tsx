import { MenuCategory, MenuItem } from './types';
import { menuItems, categoryLabels, categoryOrder, categoryImages } from './menuData';
import { Flame } from 'lucide-react';

interface MenuPanelProps {
  activeCategory: MenuCategory;
  onCategoryChange: (category: MenuCategory) => void;
  onItemTap: (item: MenuItem) => void;
}

const MenuPanel = ({ activeCategory, onCategoryChange, onItemTap }: MenuPanelProps) => {
  const filteredItems = menuItems.filter(item => item.category === activeCategory);
  const categoryImage = categoryImages[activeCategory];

  return (
    <div className="flex flex-col h-full p-3 lg:p-4">
      {/* Category tabs — fat, scrollable */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 shrink-0">
        {categoryOrder.map(cat => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`h-14 px-5 rounded-xl font-display font-bold text-sm whitespace-nowrap active:scale-[0.97] transition-all shrink-0 ${
              activeCategory === cat
                ? 'bg-pos-gold text-primary shadow-lg'
                : 'bg-card text-foreground/60 border-2 border-foreground/10'
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Category hero image */}
      <div className="relative h-28 lg:h-32 rounded-xl overflow-hidden mb-3 shrink-0">
        <img
          src={categoryImage}
          alt={categoryLabels[activeCategory]}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" />
        <div className="absolute inset-0 flex items-center px-6">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-primary-foreground drop-shadow-lg">
            {categoryLabels[activeCategory]}
          </h2>
        </div>
      </div>

      {/* Menu items grid — optimized for iPad landscape */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 flex-1 content-start auto-rows-min">
        {filteredItems.map(item => (
          <button
            key={item.id}
            onClick={() => onItemTap(item)}
            className="bg-card border-2 border-foreground/10 rounded-xl p-5 flex flex-col items-start justify-between min-h-[110px] active:scale-[0.96] active:border-pos-gold active:shadow-lg transition-all shadow-sm text-left"
          >
            <div className="flex items-start justify-between w-full">
              <span className="font-display font-bold text-lg lg:text-xl text-foreground leading-tight">
                {item.name}
              </span>
              {item.spicy && (
                <span className="text-accent ml-2 shrink-0 bg-accent/10 p-1 rounded-md">
                  <Flame size={22} />
                </span>
              )}
            </div>
            <span className="font-display font-bold text-2xl text-pos-gold-dark mt-3">
              ₱{item.price}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuPanel;
