import { useState, useCallback } from 'react';
import { useOrderState } from '@/components/pos/useOrderState';
import { useDailySummary } from '@/components/pos/useDailySummary';
import MenuPanel from '@/components/pos/MenuPanel';
import OrderPanel from '@/components/pos/OrderPanel';
import ComboPrompt from '@/components/pos/ComboPrompt';
import AddOnPrompt from '@/components/pos/AddOnPrompt';
import PaymentFlow from '@/components/pos/PaymentFlow';
import DailySummary from '@/components/pos/DailySummary';
import DiscountFlow, { DiscountResult } from '@/components/pos/DiscountFlow';
import { MenuCategory, PaymentMethod, MenuItem } from '@/components/pos/types';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import logoEmblem from '@/assets/logo-emblem.jpg';

type POSView = 'menu' | 'payment' | 'summary';

const POS = () => {
  const order = useOrderState();
  const { summary, completeOrder } = useDailySummary();
  const [view, setView] = useState<POSView>('menu');
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('sandwiches');
  const [orderNumber, setOrderNumber] = useState(1);
  const [addOnPromptItemId, setAddOnPromptItemId] = useState<string | null>(null);
  const [showDiscountFlow, setShowDiscountFlow] = useState(false);
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);

  const saleId = `ORD-${String(orderNumber).padStart(4, '0')}`;

  // After combo prompt resolves (accept or decline), show add-on prompt
  const handleComboAccept = useCallback(() => {
    const itemId = order.pendingComboItem?.instanceId;
    if (itemId) {
      order.makeCombo(itemId);
      setAddOnPromptItemId(itemId);
    }
  }, [order]);

  const handleComboDecline = useCallback(() => {
    const itemId = order.pendingComboItem?.instanceId;
    order.declineCombo();
    if (itemId) {
      setAddOnPromptItemId(itemId);
    }
  }, [order]);

  const handleAddOn = useCallback((addOn: MenuItem) => {
    if (addOnPromptItemId) {
      order.addItem(addOn);
    }
  }, [addOnPromptItemId, order]);

  const handleAddOnDone = useCallback(() => {
    setAddOnPromptItemId(null);
  }, []);

  const addOnPromptItem = addOnPromptItemId
    ? order.items.find(i => i.instanceId === addOnPromptItemId)
    : null;

  const handleProceedToPayment = useCallback(() => {
    if (order.items.length === 0) return;
    setView('payment');
  }, [order.items.length]);

  const handleCompletePayment = useCallback(
    (method: PaymentMethod) => {
      const finalTotal = discountResult ? discountResult.finalAmount : order.total;
      completeOrder(order.items, finalTotal, method);
      toast.success(`Order #${String(orderNumber).padStart(4, '0')} completed ✓`);
      order.clearOrder();
      setOrderNumber(prev => prev + 1);
      setDiscountResult(null);
      setView('menu');
    },
    [order, completeOrder, orderNumber, discountResult]
  );

  const handleClearOrder = useCallback(() => {
    const snapshot = [...order.items];
    order.clearOrder();
    setDiscountResult(null);
    toast('Order cleared', {
      action: {
        label: 'Undo',
        onClick: () => order.restoreOrder(snapshot),
      },
    });
  }, [order]);

  const handleCancelPayment = useCallback(() => {
    setView('menu');
  }, []);

  const handleAddIncidental = useCallback((item: MenuItem) => {
    order.addItem(item);
  }, [order]);

  const handleApplyDiscount = useCallback(() => {
    if (discountResult) {
      toast.error('Discount already applied to this order');
      return;
    }
    setShowDiscountFlow(true);
  }, [discountResult]);

  const handleDiscountApplied = useCallback((result: DiscountResult) => {
    setDiscountResult(result);
    setShowDiscountFlow(false);
    toast.success(`${result.discountType} discount applied — Final: ₱${result.finalAmount.toFixed(2)}`);
  }, []);

  const payableTotal = discountResult ? discountResult.finalAmount : order.total;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-background touch-manipulation select-none"
      onContextMenu={e => e.preventDefault()}
    >
      {/* Header */}
      <header className="h-14 shrink-0 bg-primary flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img
            src={logoEmblem}
            alt="FWT"
            className="h-9 w-9 rounded-full object-cover border-2 border-primary-foreground/20"
          />
          <span className="font-display text-xl font-bold text-primary-foreground">
            Featherweight Chicken
          </span>
          <span className="font-display text-xs text-primary-foreground/40 hidden sm:block uppercase tracking-widest">
            POS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-body text-sm text-primary-foreground/50">
            {new Date().toLocaleDateString('en-PH', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <button
            onClick={() => setView(view === 'summary' ? 'menu' : 'summary')}
            className="h-10 px-4 bg-primary-foreground/10 text-primary-foreground rounded-lg font-display font-semibold text-sm flex items-center gap-2 active:scale-[0.97] transition-transform"
          >
            <BarChart3 size={18} />
            {view === 'summary' ? 'Back' : 'Summary'}
          </button>
        </div>
      </header>

      {/* Main content */}
      {view === 'summary' ? (
        <DailySummary summary={summary} onBack={() => setView('menu')} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[65%] overflow-y-auto bg-background">
            {view === 'menu' && (
              <MenuPanel
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                onItemTap={order.addItem}
              />
            )}
            {view === 'payment' && (
              <PaymentFlow
                total={payableTotal}
                onComplete={handleCompletePayment}
                onCancel={handleCancelPayment}
              />
            )}
          </div>
          <div className="w-[35%] flex flex-col border-l-2 border-foreground/10 bg-card">
            <OrderPanel
              items={order.items}
              total={order.total}
              orderNumber={orderNumber}
              readOnly={view === 'payment'}
              onIncrement={order.incrementQuantity}
              onDecrement={order.decrementQuantity}
              onRemoveItem={order.removeItem}
              onRemoveAddOn={order.removeAddOn}
              onClearOrder={handleClearOrder}
              onProceedToPayment={handleProceedToPayment}
              onAddIncidental={handleAddIncidental}
              onApplyDiscount={handleApplyDiscount}
              discountApplied={discountResult ? { discountType: discountResult.discountType, finalAmount: discountResult.finalAmount } : null}
            />
          </div>
        </div>
      )}

      {/* Combo prompt overlay */}
      {order.pendingComboItem && (
        <ComboPrompt
          sandwichName={order.pendingComboItem.menuItem.name}
          onAcceptCombo={handleComboAccept}
          onDecline={handleComboDecline}
        />
      )}

      {/* Add-on prompt overlay */}
      {addOnPromptItem && !order.pendingComboItem && (
        <AddOnPrompt
          itemName={addOnPromptItem.menuItem.name}
          onSelectAddOn={handleAddOn}
          onDone={handleAddOnDone}
        />
      )}

      {/* Discount flow overlay */}
      {showDiscountFlow && (
        <DiscountFlow
          total={order.total}
          saleId={saleId}
          onApplyDiscount={handleDiscountApplied}
          onCancel={() => setShowDiscountFlow(false)}
        />
      )}
    </div>
  );
};

export default POS;
