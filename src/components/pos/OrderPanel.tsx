import { OrderItem } from './types';
import { calculateItemTotal } from './useOrderState';
import { X, Plus, Minus, ShoppingCart, CreditCard } from 'lucide-react';

interface OrderPanelProps {
  items: OrderItem[];
  total: number;
  orderNumber: number;
  readOnly: boolean;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onRemoveAddOn: (id: string, index: number) => void;
  onClearOrder: () => void;
  onProceedToPayment: () => void;
}

const OrderPanel = ({
  items,
  total,
  orderNumber,
  readOnly,
  onIncrement,
  onDecrement,
  onRemoveItem,
  onRemoveAddOn,
  onClearOrder,
  onProceedToPayment,
}: OrderPanelProps) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-2 border-foreground/10 shrink-0 bg-primary">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-primary-foreground">
            Order #{String(orderNumber).padStart(4, '0')}
          </h2>
          <ShoppingCart size={20} className="text-primary-foreground/50" />
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-foreground/25">
            <ShoppingCart size={48} className="mb-3" />
            <p className="font-display text-sm font-semibold">No items yet</p>
            <p className="font-body text-xs mt-1">Tap menu items to add</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.instanceId} className="bg-background rounded-lg p-3 border border-foreground/5">
                {/* Main item row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-sm text-foreground">
                        {item.menuItem.name}
                      </span>
                      {item.isCombo && (
                        <span className="bg-pos-gold text-primary text-[10px] font-display font-bold px-1.5 py-0.5 rounded uppercase shrink-0">
                          Combo
                        </span>
                      )}
                    </div>
                    {item.isCombo && item.comboDrink && (
                      <p className="text-[11px] text-foreground/45 mt-0.5">
                        w/ Fries + {item.comboDrink.name}
                      </p>
                    )}
                    {item.addOns.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.addOns.map((addon, i) => (
                          <div key={i} className="flex items-center gap-1 text-[11px] text-foreground/55">
                            <span>+ {addon.name} (+₱{addon.price})</span>
                            {!readOnly && (
                              <button
                                onClick={() => onRemoveAddOn(item.instanceId, i)}
                                className="text-accent/50 active:text-accent ml-0.5"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    <span className="font-display font-bold text-sm text-foreground">
                      ₱{calculateItemTotal(item)}
                    </span>
                    {!readOnly && (
                      <button
                        onClick={() => onRemoveItem(item.instanceId)}
                        className="text-foreground/25 active:text-accent p-0.5"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quantity controls */}
                {!readOnly && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onDecrement(item.instanceId)}
                      className="h-8 w-8 rounded-md bg-foreground/5 flex items-center justify-center active:bg-foreground/15 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-display font-bold text-base w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onIncrement(item.instanceId)}
                      className="h-8 w-8 rounded-md bg-foreground/5 flex items-center justify-center active:bg-foreground/15 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-foreground/10 p-4 shrink-0 bg-card">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-base font-semibold text-foreground/60 uppercase tracking-wide">Total</span>
          <span className="font-display text-3xl font-bold text-foreground">
            ₱{total.toLocaleString()}
          </span>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={onClearOrder}
              disabled={items.length === 0}
              className="flex-1 h-12 border-2 border-foreground/15 text-foreground/40 rounded-lg font-display font-semibold active:scale-[0.97] transition-transform disabled:opacity-30"
            >
              Clear
            </button>
            <button
              onClick={onProceedToPayment}
              disabled={items.length === 0}
              className="flex-[2] h-12 bg-pos-gold text-primary rounded-lg font-display font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-30 disabled:active:scale-100"
            >
              <CreditCard size={18} />
              Pay ₱{total.toLocaleString()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderPanel;
