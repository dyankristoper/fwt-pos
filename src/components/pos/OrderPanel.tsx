import { OrderItem } from './types';
import { calculateItemTotal, calculateItemDiscount, calculateItemFinal } from './useOrderState';
import { X, Plus, Minus, ShoppingCart, CreditCard, Tag } from 'lucide-react';
import IncidentalsPopover from './IncidentalsPopover';
import { MenuItem } from './types';

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
  onAddIncidental: (item: MenuItem) => void;
  onItemDiscount: (item: OrderItem) => void;
  serviceCharge?: { enabled: boolean; percent: number; amount: number };
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
  onAddIncidental,
  onItemDiscount,
  serviceCharge,
}: OrderPanelProps) => {
  const payableTotal = total + (serviceCharge?.amount ?? 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 shrink-0 bg-primary">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-primary-foreground">
            Order #{String(orderNumber).padStart(4, '0')}
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-primary-foreground/15 text-primary-foreground/70 text-xs font-display font-semibold px-2 py-1 rounded-md">
              {items.reduce((sum, i) => sum + i.quantity, 0)} items
            </span>
          </div>
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
            {items.map(item => {
              const lineTotal = calculateItemTotal(item);
              const discAmt = calculateItemDiscount(item);
              const finalAmt = calculateItemFinal(item);
              return (
                <div key={item.instanceId} className="bg-background rounded-xl p-3 border border-foreground/5">
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
                          w/ Fries + FWTea
                        </p>
                      )}
                      {item.addOns.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.addOns.map((addon, i) => (
                            <div key={i} className="flex items-center gap-1 text-[11px] text-foreground/55">
                              <span>+ {addon.name} {addon.price > 0 ? `(+₱${addon.price.toFixed(2)})` : '(Free)'}</span>
                              {!readOnly && (
                                <button
                                  onClick={() => onRemoveAddOn(item.instanceId, i)}
                                  className="text-accent/50 active:text-accent ml-0.5 p-1"
                                >
                                  <X size={10} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Item discount badge */}
                      {item.discount && (
                        <div className="mt-1 flex items-center gap-1 text-[11px]">
                          <Tag size={10} className="text-accent" />
                          <span className="text-accent font-display font-semibold">
                            {item.discount.discount_name || (item.discount.type === 'percent' ? `${item.discount.value}%` : `₱${item.discount.value.toFixed(2)}`)}
                          </span>
                          {item.discount.id_number && (
                            <span className="text-foreground/35 truncate max-w-[100px]">ID: {item.discount.id_number}</span>
                          )}
                          {!item.discount.id_number && item.discount.reason && (
                            <span className="text-foreground/35 truncate max-w-[120px]">({item.discount.reason})</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-1 shrink-0">
                      <div className="text-right">
                        {item.discount ? (
                          <>
                            <span className="font-display text-xs text-foreground/35 line-through block">
                              ₱{lineTotal.toFixed(2)}
                            </span>
                            <span className="font-display font-bold text-sm text-accent">
                              ₱{finalAmt.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="font-display font-bold text-sm text-foreground">
                            ₱{lineTotal.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {!readOnly && (
                        <button
                          onClick={() => onRemoveItem(item.instanceId)}
                          className="text-foreground/25 active:text-accent p-1 -mr-1"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quantity controls + item discount button */}
                  {!readOnly && (
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => onDecrement(item.instanceId)}
                        className="h-10 w-10 rounded-lg bg-foreground/5 flex items-center justify-center active:bg-foreground/15 transition-colors border border-foreground/10"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-display font-bold text-lg w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onIncrement(item.instanceId)}
                        className="h-10 w-10 rounded-lg bg-foreground/5 flex items-center justify-center active:bg-foreground/15 transition-colors border border-foreground/10"
                      >
                        <Plus size={16} />
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => onItemDiscount(item)}
                        className={`h-8 px-2.5 rounded-lg font-display font-semibold text-[11px] flex items-center gap-1 active:scale-[0.97] transition-transform border ${
                          item.discount
                            ? 'bg-accent/10 text-accent border-accent/20'
                            : 'bg-foreground/5 text-foreground/40 border-foreground/10'
                        }`}
                      >
                        <Tag size={12} />
                        {item.discount ? 'Edit' : 'Disc'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-foreground/10 p-4 shrink-0 bg-card">
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm text-foreground/50 uppercase tracking-wide">Subtotal</span>
            <span className="font-display text-lg font-semibold text-foreground">₱{total.toFixed(2)}</span>
          </div>
          {serviceCharge && serviceCharge.enabled && serviceCharge.amount > 0 && (
            <div className="flex items-center justify-between">
              <span className="font-display text-sm text-foreground/50 uppercase tracking-wide">
                Service Charge ({serviceCharge.percent}%)
              </span>
              <span className="font-display text-sm font-semibold text-foreground">
                ₱{serviceCharge.amount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-foreground/5">
            <span className="font-display text-base font-semibold text-foreground/60 uppercase tracking-wide">Total</span>
            <span className="font-display text-3xl font-bold text-foreground">
              ₱{payableTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {!readOnly && (
          <div className="space-y-2">
            {/* Incidentals row */}
            <div className="flex gap-2 items-center">
              <IncidentalsPopover onAddItem={onAddIncidental} />
              <div className="flex-1" />
            </div>

            {/* Main action buttons */}
            <div className="flex gap-2">
              <button
                onClick={onClearOrder}
                disabled={items.length === 0}
                className="flex-1 h-14 border-2 border-foreground/15 text-foreground/40 rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform disabled:opacity-30"
              >
                Clear
              </button>
              <button
                onClick={onProceedToPayment}
                disabled={items.length === 0}
                className="flex-[2] h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-30 disabled:active:scale-100"
              >
                <CreditCard size={20} />
                Pay ₱{payableTotal.toFixed(2)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderPanel;
