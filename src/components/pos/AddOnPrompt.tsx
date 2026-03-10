import { MenuItem } from './types';
import { addOnItems } from './menuData';

interface AddOnPromptProps {
  itemName: string;
  onSelectAddOn: (addOn: MenuItem) => void;
  onDone: () => void;
}

const AddOnPrompt = ({ itemName, onSelectAddOn, onDone }: AddOnPromptProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onDone}
    >
      <div
        className="bg-card rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-bold text-foreground text-center mb-1">
          Any add-ons?
        </h2>
        <p className="text-center text-muted-foreground mb-5 text-sm">
          For: <span className="font-semibold text-foreground">{itemName}</span>
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {addOnItems.map(addon => (
            <button
              key={addon.id}
              onClick={() => onSelectAddOn(addon)}
              className="h-14 bg-background border-2 border-foreground/10 rounded-xl font-display font-bold text-sm active:scale-[0.96] active:border-pos-gold transition-all flex items-center justify-between px-4"
            >
              <span className="truncate">{addon.name}</span>
              <span className="text-pos-gold-dark shrink-0 ml-2">+₱{addon.price.toFixed(2)}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onDone}
          className="w-full h-12 border-2 border-foreground/15 text-foreground/40 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform"
        >
          Proceed?
        </button>
      </div>
    </div>
  );
};

export default AddOnPrompt;
