import { useState, useCallback } from 'react';
import { useOrderState } from '@/components/pos/useOrderState';
import { useDailySummary } from '@/components/pos/useDailySummary';
import MenuPanel from '@/components/pos/MenuPanel';
import OrderPanel from '@/components/pos/OrderPanel';
import ComboPrompt from '@/components/pos/ComboPrompt';
import PaymentFlow from '@/components/pos/PaymentFlow';
import DailySummary from '@/components/pos/DailySummary';
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

  const handleProceedToPayment = useCallback(() => {
    if (order.items.length === 0) return;
    setView('payment');
  }, [order.items.length]);

  const handleCompletePayment = useCallback(
    (method: PaymentMethod) => {
      completeOrder(order.items, order.total, method);
      toast.success(`Order #${String(orderNumber).padStart(4, '0')} completed ✓`);
      order.clearOrder();
      setOrderNumber(prev => prev + 1);
      setView('menu');
    },
    [order, completeOrder, orderNumber]
  );

  const handleClearOrder = useCallback(() => {
    const snapshot = [...order.items];
    order.clearOrder();
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
          {/* Left panel — Menu or Payment (65%) */}
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
                total={order.total}
                onComplete={handleCompletePayment}
                onCancel={handleCancelPayment}
              />
            )}
          </div>

          {/* Right panel — Order Summary (35%) */}
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
            />
          </div>
        </div>
      )}

      {/* Combo prompt overlay */}
      {order.pendingComboItem && (
        <ComboPrompt
          sandwichName={order.pendingComboItem.menuItem.name}
          onSelectDrink={(drink: MenuItem) =>
            order.makeCombo(order.pendingComboItem!.instanceId, drink)
          }
          onDecline={order.declineCombo}
        />
      )}
    </div>
  );
};

export default POS;
