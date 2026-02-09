import { MenuItem } from './types';
import { beverageItems, COMBO_SURCHARGE } from './menuData';

interface ComboPromptProps {
  sandwichName: string;
  onSelectDrink: (drink: MenuItem) => void;
  onDecline: () => void;
}

const ComboPrompt = ({ sandwichName, onSelectDrink, onDecline }: ComboPromptProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onDecline}
    >
      <div
        className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-bold text-foreground text-center mb-1">
          Make it a combo?
        </h2>
        <p className="text-center text-muted-foreground mb-1 text-sm">
          {sandwichName} Sandwich
        </p>
        <p className="text-center font-display font-bold text-lg text-foreground mb-6">
          +₱{COMBO_SURCHARGE}{' '}
          <span className="text-sm font-normal text-muted-foreground">(Fries + Drink)</span>
        </p>

        <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Choose your drink
        </p>
        <div className="space-y-2 mb-6">
          {beverageItems.map(drink => (
            <button
              key={drink.id}
              onClick={() => onSelectDrink(drink)}
              className="w-full h-14 bg-pos-gold text-primary font-display font-bold text-lg rounded-xl active:scale-[0.97] transition-transform"
            >
              {drink.name}
            </button>
          ))}
        </div>

        <button
          onClick={onDecline}
          className="w-full h-12 border-2 border-foreground/15 text-foreground/40 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform"
        >
          No thanks
        </button>
      </div>
    </div>
  );
};

export default ComboPrompt;
