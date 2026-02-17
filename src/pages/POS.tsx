import { useState, useCallback } from 'react';
import { useOrderState } from '@/components/pos/useOrderState';
import { useDailySummary } from '@/components/pos/useDailySummary';
import { usePrinter } from '@/components/pos/print/usePrinter';
import { ReceiptData } from '@/components/pos/print/escpos';
import { calculateItemTotal } from '@/components/pos/useOrderState';
import MenuPanel from '@/components/pos/MenuPanel';
import OrderPanel from '@/components/pos/OrderPanel';
import ComboPrompt from '@/components/pos/ComboPrompt';
import AddOnPrompt from '@/components/pos/AddOnPrompt';
import PaymentFlow from '@/components/pos/PaymentFlow';
import DailySummary from '@/components/pos/DailySummary';
import ZReadingReport from '@/components/pos/ZReadingReport';
import DiscountFlow, { DiscountResult } from '@/components/pos/DiscountFlow';
import PrinterSettings from '@/components/pos/PrinterSettings';
import SupervisorManagement from '@/components/pos/SupervisorManagement';
import VoidRefundFlow from '@/components/pos/VoidRefundFlow';
import { MenuCategory, PaymentMethod, MenuItem, CompletedOrder } from '@/components/pos/types';
import { BarChart3, Printer, Shield } from 'lucide-react';
import { toast } from 'sonner';
import logoEmblem from '@/assets/logo-emblem.jpg';

type POSView = 'menu' | 'payment' | 'summary' | 'z-reading' | 'printer-settings' | 'supervisors';

const POS = () => {
  const order = useOrderState();
  const { summary, completeOrder, addDiscount, addVoidRefund } = useDailySummary();
  const printer = usePrinter();
  const [view, setView] = useState<POSView>('menu');
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('sandwiches');
  const [orderNumber, setOrderNumber] = useState(1);
  const [addOnPromptItemId, setAddOnPromptItemId] = useState<string | null>(null);
  const [showDiscountFlow, setShowDiscountFlow] = useState(false);
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);
  const [voidRefundOrder, setVoidRefundOrder] = useState<CompletedOrder | null>(null);

  const saleId = `ORD-${String(orderNumber).padStart(4, '0')}`;

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
    if (itemId) setAddOnPromptItemId(itemId);
  }, [order]);

  const handleAddOn = useCallback((addOn: MenuItem) => {
    if (addOnPromptItemId) order.addItem(addOn);
  }, [addOnPromptItemId, order]);

  const handleAddOnDone = useCallback(() => setAddOnPromptItemId(null), []);

  const addOnPromptItem = addOnPromptItemId
    ? order.items.find(i => i.instanceId === addOnPromptItemId)
    : null;

  const handleProceedToPayment = useCallback(() => {
    if (order.items.length === 0) return;
    setView('payment');
  }, [order.items.length]);

  const buildReceiptData = useCallback((method: PaymentMethod): ReceiptData => {
    const now = new Date();
    const finalTotal = discountResult ? discountResult.finalAmount : order.total;
    return {
      orderNumber: `OS-${String(orderNumber).padStart(6, '0')}`,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      cashier: 'ANA',
      items: order.items.map(item => ({
        qty: item.quantity,
        name: item.menuItem.name,
        amount: calculateItemTotal(item),
      })),
      subtotal: order.total,
      discount: discountResult ? {
        type: discountResult.discountType,
        label: discountResult.discountType === 'SC' ? 'SC Discount' :
               discountResult.discountType === 'PWD' ? 'PWD Discount' :
               discountResult.discountType === 'EMP' ? 'Employee Discount' : 'Promo Discount',
        isVatExempt: discountResult.discountType === 'SC' || discountResult.discountType === 'PWD',
        customerName: discountResult.customerName || undefined,
        idNumber: discountResult.idNumber || undefined,
        vatRemoved: discountResult.vatRemoved,
        vatExclusive: discountResult.vatExclusive,
        discountPercent: discountResult.discountPercent,
        discountAmount: discountResult.discountAmount,
        finalAmount: discountResult.finalAmount,
      } : undefined,
      total: finalTotal,
      paymentMethod: method,
    };
  }, [order, orderNumber, discountResult]);

  const handleCompletePayment = useCallback(
    (method: PaymentMethod) => {
      const finalTotal = discountResult ? discountResult.finalAmount : order.total;
      completeOrder(order.items, finalTotal, method);
      toast.success(`Order #${String(orderNumber).padStart(4, '0')} completed ✓`);

      if (printer.settings.autoPrint || printer.status.connected) {
        const receiptData = buildReceiptData(method);
        printer.printReceipt(receiptData);
      }

      order.clearOrder();
      setOrderNumber(prev => prev + 1);
      setDiscountResult(null);
      setView('menu');
    },
    [order, completeOrder, orderNumber, discountResult, printer, buildReceiptData]
  );

  const handleClearOrder = useCallback(() => {
    const snapshot = [...order.items];
    order.clearOrder();
    setDiscountResult(null);
    toast('Order cleared', {
      action: { label: 'Undo', onClick: () => order.restoreOrder(snapshot) },
    });
  }, [order]);

  const handleCancelPayment = useCallback(() => setView('menu'), []);
  const handleAddIncidental = useCallback((item: MenuItem) => order.addItem(item), [order]);

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
    addDiscount({
      discountType: result.discountType,
      originalTotal: result.originalTotal,
      discountAmount: result.discountAmount,
      vatRemoved: result.vatRemoved,
      finalAmount: result.finalAmount,
      orderId: saleId,
    });
    toast.success(`${result.discountType} discount applied — Final: ₱${result.finalAmount.toFixed(2)}`);
  }, [addDiscount, saleId]);

  const handleVoidRefund = useCallback((completedOrder: CompletedOrder) => {
    setVoidRefundOrder(completedOrder);
  }, []);

  const handleVoidRefundComplete = useCallback((order: CompletedOrder, type: 'void' | 'refund') => {
    addVoidRefund({ orderId: order.id, type, amount: order.total });
    setVoidRefundOrder(null);
  }, [addVoidRefund]);

  const payableTotal = discountResult ? discountResult.finalAmount : order.total;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background touch-manipulation select-none" onContextMenu={e => e.preventDefault()}>
      {/* Header */}
      <header className="h-14 shrink-0 bg-primary flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src={logoEmblem} alt="FWT" className="h-9 w-9 rounded-full object-cover border-2 border-primary-foreground/20" />
          <span className="font-display text-xl font-bold text-primary-foreground">Featherweight Chicken</span>
          <span className="font-display text-xs text-primary-foreground/40 hidden sm:block uppercase tracking-widest">POS</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Printer status */}
          <button
            onClick={() => setView(view === 'printer-settings' ? 'menu' : 'printer-settings')}
            className={`h-10 w-10 rounded-lg flex items-center justify-center active:scale-[0.97] transition-transform ${
              printer.status.connected ? 'bg-pos-gold/20 text-pos-gold' : 'bg-primary-foreground/10 text-primary-foreground/40'
            }`}
            title={printer.status.connected ? `Printer: ${printer.status.deviceName}` : 'Printer disconnected'}
          >
            <Printer size={18} />
          </button>
          {/* Supervisor management */}
          <button
            onClick={() => setView(view === 'supervisors' ? 'menu' : 'supervisors')}
            className="h-10 w-10 rounded-lg bg-primary-foreground/10 text-primary-foreground/40 flex items-center justify-center active:scale-[0.97] transition-transform"
            title="Supervisor Management"
          >
            <Shield size={18} />
          </button>
          <span className="font-body text-sm text-primary-foreground/50">
            {new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
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
        <DailySummary summary={summary} onBack={() => setView('menu')} onVoidRefund={handleVoidRefund} onZReading={() => setView('z-reading')} />
      ) : view === 'z-reading' ? (
        <ZReadingReport summary={summary} onBack={() => setView('summary')} />
      ) : view === 'printer-settings' ? (
        <PrinterSettings onBack={() => setView('menu')} />
      ) : view === 'supervisors' ? (
        <SupervisorManagement onBack={() => setView('menu')} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[65%] overflow-y-auto bg-background">
            {view === 'menu' && <MenuPanel activeCategory={activeCategory} onCategoryChange={setActiveCategory} onItemTap={order.addItem} />}
            {view === 'payment' && <PaymentFlow total={payableTotal} onComplete={handleCompletePayment} onCancel={handleCancelPayment} />}
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

      {/* Overlays */}
      {order.pendingComboItem && (
        <ComboPrompt sandwichName={order.pendingComboItem.menuItem.name} onAcceptCombo={handleComboAccept} onDecline={handleComboDecline} />
      )}
      {addOnPromptItem && !order.pendingComboItem && (
        <AddOnPrompt itemName={addOnPromptItem.menuItem.name} onSelectAddOn={handleAddOn} onDone={handleAddOnDone} />
      )}
      {showDiscountFlow && (
        <DiscountFlow total={order.total} saleId={saleId} onApplyDiscount={handleDiscountApplied} onCancel={() => setShowDiscountFlow(false)} />
      )}
      {voidRefundOrder && (
        <VoidRefundFlow order={voidRefundOrder} onComplete={handleVoidRefundComplete} onCancel={() => setVoidRefundOrder(null)} />
      )}
    </div>
  );
};

export default POS;
