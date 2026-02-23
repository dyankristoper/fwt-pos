import { useState } from 'react';
import { MenuItem } from './types';
import { Package } from 'lucide-react';

const INCIDENTALS: MenuItem[] = [
  { id: 'cutlery', sku_code: 'FW-MENU-INC-0001', name: 'Extra Cutlery', price: 0, category: 'sides' },
  { id: 'tissue', sku_code: 'FW-MENU-INC-0002', name: 'Tissue', price: 0, category: 'sides' },
  { id: 'ketchup', sku_code: 'FW-MENU-INC-0003', name: 'Ketchup', price: 0, category: 'sides' },
  { id: 'mustard-inc', sku_code: 'FW-MENU-INC-0004', name: 'Mustard', price: 0, category: 'sides' },
  { id: 'mayo', sku_code: 'FW-MENU-INC-0005', name: 'Mayo', price: 0, category: 'sides' },
];

interface IncidentalsPopoverProps {
  onAddItem: (item: MenuItem) => void;
}

const IncidentalsPopover = ({ onAddItem }: IncidentalsPopoverProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-10 px-3 bg-foreground/5 border border-foreground/10 rounded-lg font-display font-semibold text-xs text-foreground/50 flex items-center gap-1.5 active:scale-[0.97] transition-transform"
      >
        <Package size={14} />
        Extras
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 z-50 bg-card border-2 border-foreground/10 rounded-xl shadow-2xl p-2 w-48">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display font-semibold px-2 py-1">
              Incidentals
            </p>
            {INCIDENTALS.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onAddItem(item);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg font-display text-sm font-semibold text-foreground hover:bg-foreground/5 active:bg-foreground/10 transition-colors"
              >
                {item.name}
                {item.price > 0 && (
                  <span className="text-pos-gold-dark ml-1">+₱{item.price.toFixed(2)}</span>
                )}
                {item.price === 0 && (
                  <span className="text-muted-foreground ml-1 text-xs">Free</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default IncidentalsPopover;
