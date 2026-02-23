import { useState } from 'react';
import { OrderItem, ItemDiscount } from './types';
import { calculateItemTotal } from './useOrderState';
import { ArrowLeft, Percent, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface ItemDiscountFlowProps {
  item: OrderItem;
  onApply: (instanceId: string, discount: ItemDiscount) => void;
  onRemove: (instanceId: string) => void;
  onClose: () => void;
}

const ItemDiscountFlow = ({ item, onApply, onRemove, onClose }: ItemDiscountFlowProps) => {
  const [type, setType] = useState<'percent' | 'fixed'>(item.discount?.type ?? 'percent');
  const [value, setValue] = useState(item.discount?.value?.toString() ?? '');
  const [reason, setReason] = useState(item.discount?.reason ?? '');

  const itemTotal = calculateItemTotal(item);
  const numValue = parseFloat(value) || 0;

  const discountAmount = type === 'percent'
    ? Math.round(itemTotal * Math.min(numValue, 100) / 100 * 100) / 100
    : Math.min(numValue, itemTotal);

  const finalAmount = Math.max(0, itemTotal - discountAmount);

  const handleApply = () => {
    if (!reason.trim()) {
      toast.error('Discount reason is required');
      return;
    }
    if (numValue <= 0) {
      toast.error('Enter a valid discount value');
      return;
    }
    if (type === 'percent' && numValue > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }
    if (type === 'fixed' && numValue > itemTotal) {
      toast.error('Discount cannot exceed item total');
      return;
    }
    onApply(item.instanceId, { type, value: numValue, reason: reason.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onClose} className="text-foreground/40 active:text-foreground p-1">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-display text-lg font-bold text-foreground">Item Discount</h2>
        </div>

        {/* Item info */}
        <div className="bg-foreground/5 rounded-xl p-3 mb-4">
          <p className="font-display font-bold text-sm text-foreground">{item.menuItem.name}</p>
          <p className="font-body text-xs text-foreground/50">
            Qty: {item.quantity} · Line total: ₱{itemTotal.toFixed(2)}
          </p>
        </div>

        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setType('percent')}
            className={`flex-1 h-11 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2 border-2 transition-colors ${
              type === 'percent' ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground/60 border-foreground/10'
            }`}
          >
            <Percent size={16} /> Percentage
          </button>
          <button
            onClick={() => setType('fixed')}
            className={`flex-1 h-11 rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2 border-2 transition-colors ${
              type === 'fixed' ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground/60 border-foreground/10'
            }`}
          >
            <Hash size={16} /> Fixed ₱
          </button>
        </div>

        {/* Value input */}
        <div className="mb-4">
          <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">
            {type === 'percent' ? 'Discount %' : 'Discount Amount (₱)'}
          </label>
          <input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            min="0"
            max={type === 'percent' ? '100' : String(itemTotal)}
            step={type === 'percent' ? '1' : '0.01'}
            className="w-full h-12 mt-1 px-4 bg-background border-2 border-foreground/10 rounded-xl font-display text-xl text-foreground focus:border-accent focus:outline-none transition-colors text-center"
            placeholder={type === 'percent' ? '10' : '50.00'}
            autoFocus
          />
        </div>

        {/* Reason */}
        <div className="mb-4">
          <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">
            Reason / Note *
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={200}
            rows={2}
            className="w-full mt-1 px-3 py-2 bg-background border-2 border-foreground/10 rounded-xl font-body text-sm text-foreground focus:border-accent focus:outline-none transition-colors resize-none"
            placeholder="e.g. Manager approved, damaged item..."
          />
        </div>

        {/* Preview */}
        {numValue > 0 && (
          <div className="bg-foreground/5 rounded-xl p-3 mb-4 text-center">
            <p className="text-xs text-foreground/50 uppercase tracking-wide">After Discount</p>
            <p className="font-display text-2xl font-bold text-foreground">₱{finalAmount.toFixed(2)}</p>
            <p className="text-xs text-accent font-display font-semibold">-₱{discountAmount.toFixed(2)}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {item.discount && (
            <button
              onClick={() => onRemove(item.instanceId)}
              className="h-12 px-4 border-2 border-accent/30 text-accent rounded-xl font-display font-semibold text-sm active:scale-[0.97] transition-transform"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 h-12 border-2 border-foreground/15 text-foreground/50 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={numValue <= 0 || !reason.trim()}
            className="flex-[2] h-12 bg-pos-gold text-primary rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform disabled:opacity-30"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDiscountFlow;
