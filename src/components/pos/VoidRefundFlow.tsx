import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, AlertTriangle, RotateCcw, XCircle, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CompletedOrder, OrderItem } from './types';
import { calculateItemTotal } from './useOrderState';
import { updateSlipStatus } from './useSalesEngine';

interface VoidRefundFlowProps {
  order?: CompletedOrder | null;
  onComplete: (order: CompletedOrder, type: 'void' | 'refund') => void;
  onCancel: () => void;
}

type Step = 'search' | 'select' | 'reason' | 'pin' | 'confirm';
type ActionType = 'void' | 'refund';

interface SaleRecord {
  id: string;
  order_slip_number: string;
  total_amount_due: number;
  payment_method: string;
  order_items: any;
  created_at: string;
}

const VOID_REASONS = [
  'Customer Cancelled',
  'Wrong Item',
  'Duplicate Order',
  'System Error',
  'Supervisor Override',
];

function buildDeductionItemsFromOrder(items: OrderItem[]): { sku_code: string; quantity: number }[] {
  const skuMap = new Map<string, number>();
  for (const item of items) {
    if (item.isCombo) {
      const comboSku = item.menuItem.combo_sku;
      if (comboSku) {
        skuMap.set(comboSku, (skuMap.get(comboSku) || 0) + item.quantity);
      } else {
        const sku = item.menuItem.sku_code;
        if (sku) skuMap.set(sku, (skuMap.get(sku) || 0) + item.quantity);
        if (item.comboDrink?.sku_code) {
          skuMap.set(item.comboDrink.sku_code, (skuMap.get(item.comboDrink.sku_code) || 0) + item.quantity);
        }
      }
    } else {
      const sku = item.menuItem.sku_code;
      if (sku) skuMap.set(sku, (skuMap.get(sku) || 0) + item.quantity);
    }
    for (const addon of item.addOns) {
      if (addon.sku_code) skuMap.set(addon.sku_code, (skuMap.get(addon.sku_code) || 0) + item.quantity);
    }
  }
  return Array.from(skuMap.entries()).map(([sku_code, quantity]) => ({ sku_code, quantity }));
}

function saleToCompletedOrder(sale: SaleRecord): CompletedOrder {
  // Reconstruct a CompletedOrder from DB record
  // order_items from DB may not have full MenuItem shape, but we preserve what we have
  const items: OrderItem[] = Array.isArray(sale.order_items)
    ? sale.order_items.map((item: any, idx: number) => ({
        instanceId: `db-${sale.id}-${idx}`,
        menuItem: {
          id: item.menuItem?.id || `item-${idx}`,
          sku_code: item.menuItem?.sku_code || '',
          name: item.menuItem?.name || item.name || 'Unknown',
          price: item.menuItem?.price || item.price || 0,
          category: item.menuItem?.category || 'sandwiches',
        },
        quantity: item.quantity || 1,
        isCombo: item.isCombo || false,
        comboDrink: item.comboDrink || undefined,
        addOns: item.addOns || [],
        discount: item.discount || undefined,
      }))
    : [];

  return {
    id: sale.id,
    orderSlipNumber: sale.order_slip_number,
    items,
    total: sale.total_amount_due,
    paymentMethod: sale.payment_method as any,
    timestamp: new Date(sale.created_at),
  };
}

const VoidRefundFlow = ({ order: initialOrder, onComplete, onCancel }: VoidRefundFlowProps) => {
  const [step, setStep] = useState<Step>(initialOrder ? 'select' : 'search');
  const [resolvedOrder, setResolvedOrder] = useState<CompletedOrder | null>(initialOrder || null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [voidNote, setVoidNote] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [approverName, setApproverName] = useState('');
  const [saving, setSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SaleRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const order = resolvedOrder!;
  const finalReason = reason === 'Other' ? customReason.trim() : reason;

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);

    // Search by order_slip_number (partial match) — today only by default, or all if full slip provided
    const { data, error } = await supabase
      .from('completed_sales')
      .select('id, order_slip_number, total_amount_due, payment_method, order_items, created_at')
      .ilike('order_slip_number', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      toast.error('Search failed');
      console.error(error);
    }
    setSearchResults((data as unknown as SaleRecord[]) || []);
    setSearching(false);
  };

  const handleSelectSale = (sale: SaleRecord) => {
    setResolvedOrder(saleToCompletedOrder(sale));
    setStep('select');
  };

  const handleSelectType = (type: ActionType) => {
    setActionType(type);
    setStep('reason');
  };

  const handleReasonSubmit = () => {
    if (!finalReason) {
      toast.error('Please select or enter a reason');
      return;
    }
    setStep('pin');
  };

  const handlePinSubmit = async () => {
    const { data } = await supabase
      .from('supervisors')
      .select('name')
      .eq('pin', pin)
      .eq('is_active', true)
      .limit(1);

    const supervisors = data as unknown as { name: string }[] | null;

    if (supervisors && supervisors.length > 0) {
      setPinError(false);
      setApproverName(supervisors[0].name);
      setStep('confirm');
    } else {
      setPinError(true);
      setPin('');
    }
  };

  const handleConfirm = async () => {
    if (!actionType || !resolvedOrder) return;
    setSaving(true);

    try {
      const itemsJson = order.items.map(item => ({
        name: item.menuItem.name,
        qty: item.quantity,
        price: item.menuItem.price,
        total: calculateItemTotal(item),
        isCombo: item.isCombo,
      }));

      await supabase.from('void_refund_log').insert({
        original_sale_id: order.orderSlipNumber,
        type: actionType,
        reason: finalReason,
        items_json: itemsJson,
        original_amount: order.total,
        refund_amount: actionType === 'refund' ? order.total : 0,
        approved_by: approverName,
        processed_by: 'CASHIER',
      });

      // Update order_slips status if void
      if (actionType === 'void') {
        await updateSlipStatus(order.orderSlipNumber, {
          reason: finalReason,
          note: voidNote.trim() || undefined,
          approvedBy: approverName,
        });
      }

      const deductionItems = buildDeductionItemsFromOrder(order.items);
      if (deductionItems.length > 0) {
        const { error } = await supabase.functions.invoke('pos-refund', {
          body: {
            original_order_id: order.orderSlipNumber,
            refund_type: actionType,
            location_id: 'DEFAULT',
            items: deductionItems,
            reason: finalReason,
            approved_by: approverName,
            user_id: 'POS',
          },
        });
        if (error) {
          console.error('Inventory reversal failed:', error);
          toast.warning('Sale reversed but inventory reversal queued for retry');
        }
      }

      toast.success(
        actionType === 'void'
          ? `Order ${order.orderSlipNumber} voided successfully`
          : `Refund ₱${order.total.toFixed(2)} processed for ${order.orderSlipNumber}`
      );
      onComplete(order, actionType);
    } catch {
      toast.error('Failed to process — try again');
    } finally {
      setSaving(false);
    }
  };

  const actionLabel = actionType === 'void' ? 'Void' : 'Refund';
  const actionIcon = actionType === 'void' ? <XCircle size={20} /> : <RotateCcw size={20} />;

  // Step: Search for order
  if (step === 'search') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <Search size={22} className="text-accent" />
            <h2 className="font-display text-xl font-bold text-foreground">Find Order</h2>
          </div>

          <p className="text-muted-foreground text-sm mb-4">
            Search by order slip number (e.g. 022326-0001-QC01)
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 h-12 px-4 bg-background border-2 border-foreground/10 rounded-xl font-display text-sm text-foreground focus:border-accent focus:outline-none transition-colors"
              placeholder="Order slip number..."
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searching}
              className="h-12 px-5 bg-pos-gold text-primary rounded-xl font-display font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-30 flex items-center gap-2"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </div>

          {/* Results */}
          {searched && !searching && searchResults.length === 0 && (
            <div className="text-center py-6 text-foreground/30">
              <Search size={32} className="mx-auto mb-2" />
              <p className="font-display font-semibold text-sm">No orders found</p>
              <p className="text-xs mt-1">Try a different order slip number</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map(sale => (
                <button
                  key={sale.id}
                  onClick={() => handleSelectSale(sale)}
                  className="w-full bg-background rounded-xl border-2 border-foreground/10 p-3 text-left active:scale-[0.98] transition-transform hover:border-accent/40"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-display font-bold text-sm text-foreground">{sale.order_slip_number}</span>
                    <span className="font-display font-bold text-foreground">₱{Number(sale.total_amount_due).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-foreground/50">
                    <span className="capitalize">{sale.payment_method}</span>
                    <span>{new Date(sale.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button onClick={onCancel} className="w-full mt-4 h-11 text-foreground/40 font-display font-semibold active:scale-[0.97] transition-transform">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Step: Select void or refund
  if (step === 'select') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            {!initialOrder && (
              <button onClick={() => setStep('search')} className="text-foreground/40 active:text-foreground p-1"><ArrowLeft size={20} /></button>
            )}
            <AlertTriangle size={22} className="text-accent" />
            <h2 className="font-display text-xl font-bold text-foreground">Void / Refund</h2>
          </div>

          <div className="bg-foreground/5 rounded-xl p-4 mb-6">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-foreground/50 uppercase">Order</span>
              <span className="font-display font-bold text-sm text-foreground">{order.orderSlipNumber}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-foreground/50 uppercase">Amount</span>
              <span className="font-display font-bold text-foreground">₱{order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-foreground/50 uppercase">Payment</span>
              <span className="font-display font-semibold text-sm text-foreground capitalize">{order.paymentMethod}</span>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <button onClick={() => handleSelectType('void')}
              className="w-full h-16 bg-accent text-accent-foreground rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform flex items-center justify-center gap-3">
              <XCircle size={22} />
              Void Transaction
            </button>
            <button onClick={() => handleSelectType('refund')}
              className="w-full h-16 bg-primary text-primary-foreground rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform flex items-center justify-center gap-3">
              <RotateCcw size={22} />
              Process Refund
            </button>
          </div>

          <button onClick={onCancel} className="w-full h-11 text-foreground/40 font-display font-semibold active:scale-[0.97] transition-transform">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Step: Select reason
  if (step === 'reason') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setStep('select')} className="text-foreground/40 active:text-foreground p-1"><ArrowLeft size={20} /></button>
            <h2 className="font-display text-xl font-bold text-foreground">{actionLabel} Reason</h2>
          </div>

          <div className="space-y-2 mb-4">
            {VOID_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`w-full h-12 px-4 rounded-xl font-display font-semibold text-sm text-left active:scale-[0.97] transition-all border-2 ${
                  reason === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground border-foreground/10'
                }`}>
                {r}
              </button>
            ))}
          </div>

          <textarea value={voidNote} onChange={e => setVoidNote(e.target.value)} maxLength={200} rows={2}
            className="w-full px-4 py-3 bg-background border-2 border-foreground/10 rounded-xl font-body text-foreground text-sm focus:border-accent focus:outline-none transition-colors mb-4 resize-none"
            placeholder="Optional note..." />

          <button onClick={handleReasonSubmit} disabled={!finalReason}
            className="w-full h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
            Next — Supervisor Approval
          </button>
        </div>
      </div>
    );
  }

  // Step: Supervisor PIN
  if (step === 'pin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setStep('reason')} className="text-foreground/40 active:text-foreground p-1"><ArrowLeft size={20} /></button>
            <h2 className="font-display text-xl font-bold text-foreground">Supervisor Approval</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Enter supervisor PIN to authorize <span className="font-semibold text-foreground">{actionLabel.toLowerCase()}</span> of {order.orderSlipNumber}
          </p>
          <input type="password" value={pin} onChange={e => { setPin(e.target.value); setPinError(false); }} maxLength={8}
            className={`w-full h-14 px-4 bg-background border-2 rounded-xl font-display text-2xl text-center tracking-[0.5em] text-foreground focus:outline-none transition-colors ${
              pinError ? 'border-accent' : 'border-foreground/10 focus:border-pos-gold'
            }`}
            placeholder="••••" autoFocus />
          {pinError && <p className="text-accent text-xs font-display font-semibold mt-2 text-center">Invalid supervisor PIN</p>}
          <button onClick={handlePinSubmit} disabled={!pin.trim()}
            className="w-full mt-6 h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
            Authorize
          </button>
        </div>
      </div>
    );
  }

  // Step: Confirm
  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          <h2 className="font-display text-xl font-bold text-foreground text-center mb-1 flex items-center justify-center gap-2">
            {actionIcon}
            Confirm {actionLabel}
          </h2>
          <p className="text-center text-muted-foreground text-xs mb-5">This action will be permanently logged</p>

          <div className="bg-background rounded-xl border-2 border-foreground/10 p-5 mb-4 font-mono text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-foreground/60">Order</span>
              <span className="font-bold text-foreground">{order.orderSlipNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Action</span>
              <span className="font-bold text-accent uppercase">{actionType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Amount</span>
              <span className="font-bold text-foreground">₱{order.total.toFixed(2)}</span>
            </div>
            {actionType === 'refund' && (
              <div className="flex justify-between border-t-2 border-dashed border-foreground/15 pt-2">
                <span className="font-bold text-foreground">Refund Amount</span>
                <span className="font-bold text-2xl text-accent">₱{order.total.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="bg-foreground/5 rounded-lg p-3 mb-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-foreground/50">Reason</span>
              <span className="font-display font-semibold text-foreground text-right max-w-[60%]">{finalReason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/50">Approved by</span>
              <span className="font-display font-semibold text-foreground">{approverName}</span>
            </div>
          </div>

          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-5 text-[11px] text-accent leading-relaxed text-center">
            <AlertTriangle size={14} className="inline mr-1" />
            This record cannot be deleted or modified after confirmation.
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 h-14 border-2 border-foreground/15 text-foreground/40 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform">
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={saving}
              className={`flex-[2] h-14 rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-50 ${
                actionType === 'void' ? 'bg-accent text-accent-foreground' : 'bg-pos-gold text-primary'
              }`}>
              {saving ? 'Processing...' : `Confirm ${actionLabel}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default VoidRefundFlow;
