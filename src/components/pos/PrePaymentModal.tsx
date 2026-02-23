import { OrderItem } from './types';
import { calculateItemTotal, calculateItemDiscount, calculateItemFinal } from './useOrderState';
import { VatBreakdown } from './useSalesEngine';
import { X, ArrowLeft, CreditCard, FileText, Tag } from 'lucide-react';

interface PrePaymentModalProps {
  items: OrderItem[];
  subtotal: number;
  serviceCharge: { enabled: boolean; percent: number; amount: number } | undefined;
  vatBreakdown: VatBreakdown;
  totalAmountDue: number;
  onContinueToPayment: () => void;
  onEditOrder: () => void;
}

const PrePaymentModal = ({
  items,
  subtotal,
  serviceCharge,
  vatBreakdown,
  totalAmountDue,
  onContinueToPayment,
  onEditOrder,
}: PrePaymentModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-foreground/10 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <FileText size={22} className="text-pos-gold-dark" />
              Order Summary
            </h2>
            <button onClick={onEditOrder} className="text-foreground/30 active:text-foreground p-1">
              <X size={20} />
            </button>
          </div>
          <p className="text-muted-foreground text-xs mt-1">Review before proceeding to payment</p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Items */}
          <div>
            <h3 className="font-display text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-2">Items</h3>
            <div className="space-y-1.5">
              {items.map(item => {
                const lineTotal = calculateItemTotal(item);
                const discAmt = calculateItemDiscount(item);
                const finalAmt = calculateItemFinal(item);
                return (
                  <div key={item.instanceId} className="flex items-start justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-semibold text-foreground">
                          {item.quantity}× {item.menuItem.name}
                        </span>
                        {item.isCombo && (
                          <span className="bg-pos-gold/20 text-pos-gold-dark text-[9px] font-display font-bold px-1 py-0.5 rounded">COMBO</span>
                        )}
                      </div>
                      {item.addOns.length > 0 && (
                        <p className="text-[11px] text-foreground/40 mt-0.5">
                          + {item.addOns.map(a => a.name).join(', ')}
                        </p>
                      )}
                      {item.discount && (
                        <div className="flex items-center gap-1 mt-0.5 text-[11px]">
                          <Tag size={9} className="text-accent" />
                          <span className="text-accent font-semibold">
                            {item.discount.discount_name || item.discount.reason}
                            {' '}-₱{discAmt.toFixed(2)}
                          </span>
                          {item.discount.id_number && (
                            <span className="text-foreground/35">ID: {item.discount.id_number}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      {item.discount ? (
                        <>
                          <span className="font-display text-xs text-foreground/35 line-through block">₱{lineTotal.toFixed(2)}</span>
                          <span className="font-display font-bold text-sm text-accent">₱{finalAmt.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="font-display font-bold text-sm text-foreground">₱{lineTotal.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial breakdown */}
          <div className="bg-background rounded-xl border-2 border-foreground/10 p-4 font-mono text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-foreground/60">Gross Sales</span>
              <span className="font-bold text-foreground">₱{vatBreakdown.grossSales.toFixed(2)}</span>
            </div>
            {vatBreakdown.discountTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-foreground/60">Less: Discounts</span>
                <span className="font-bold text-accent">-₱{vatBreakdown.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-foreground/60">Net Sales</span>
              <span className="font-bold text-foreground">₱{vatBreakdown.netSales.toFixed(2)}</span>
            </div>

            <div className="border-t border-dashed border-foreground/10 pt-1.5 mt-1.5" />

            <div className="flex justify-between text-xs">
              <span className="text-foreground/50">VATable Sales</span>
              <span className="text-foreground/70">₱{vatBreakdown.vatableSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foreground/50">VAT (12%)</span>
              <span className="text-foreground/70">₱{vatBreakdown.vatAmount.toFixed(2)}</span>
            </div>
            {vatBreakdown.vatExemptSales > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-foreground/50">VAT-Exempt Sales</span>
                <span className="text-foreground/70">₱{vatBreakdown.vatExemptSales.toFixed(2)}</span>
              </div>
            )}

            {serviceCharge && serviceCharge.enabled && serviceCharge.amount > 0 && (
              <>
                <div className="border-t border-dashed border-foreground/10 pt-1.5 mt-1.5" />
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/50">Service Charge ({serviceCharge.percent}%)</span>
                  <span className="text-foreground/70">₱{serviceCharge.amount.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="border-t-2 border-foreground/15 pt-2 mt-2 flex justify-between">
              <span className="font-bold text-foreground">TOTAL AMOUNT DUE</span>
              <span className="font-bold text-2xl text-foreground">₱{totalAmountDue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-foreground/10 shrink-0 flex gap-3">
          <button
            onClick={onEditOrder}
            className="flex-1 h-14 border-2 border-foreground/15 text-foreground/50 rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform"
          >
            Edit Order
          </button>
          <button
            onClick={onContinueToPayment}
            className="flex-[2] h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <CreditCard size={20} />
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrePaymentModal;
