import { useState, useCallback } from 'react';
import { useOrderState } from '@/components/pos/useOrderState';
import { useDailySummary } from '@/components/pos/useDailySummary';
import { usePrinter } from '@/components/pos/print/usePrinter';
import { useInventoryIntegration } from '@/components/pos/useInventoryIntegration';
import { useServiceCharge } from '@/components/pos/useServiceCharge';
import { ReceiptData } from '@/components/pos/print/escpos';
import { calculateItemFinal } from '@/components/pos/useOrderState';
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
import ItemDiscountFlow from '@/components/pos/ItemDiscountFlow';
import { MenuCategory, PaymentMethod, MenuItem, CompletedOrder, OrderItem, ItemDiscount } from '@/components/pos/types';
import { BarChart3, Printer, Shield, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import logoEmblem from '@/assets/logo-emblem.jpg';

type POSView = 'menu' | 'payment' | 'summary' | 'z-reading' | 'printer-settings' | 'supervisors';

const POS = () => {
  const order = useOrderState();
  const { summary, completeOrder, addDiscount, addVoidRefund } = useDailySummary();
  const printer = usePrinter();
  const inventory = useInventoryIntegration();
  const serviceCharge = useServiceCharge();
  const [view, setView] = useState<POSView>('menu');
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('sandwiches');
  const [orderNumber, setOrderNumber] = useState(1);
  const [addOnPromptItemId, setAddOnPromptItemId] = useState<string | null>(null);
  const [showDiscountFlow, setShowDiscountFlow] = useState(false);
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);
  const [voidRefundOrder, setVoidRefundOrder] = useState<CompletedOrder | null>(null);
  const [itemDiscountTarget, setItemDiscountTarget] = useState<OrderItem | null>(null);

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
    const scAmount = serviceCharge.calculateServiceCharge(order.total);
    const subtotalWithSC = order.total + scAmount;
    const finalTotal = discountResult ? discountResult.finalAmount : subtotalWithSC;
    return {
      orderNumber: `OS-${String(orderNumber).padStart(6, '0')}`,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      cashier: 'ANA',
      items: order.items.map(item => ({
        qty: item.quantity,
        name: item.menuItem.name,
        amount: calculateItemFinal(item),
      })),
      subtotal: order.total,
      serviceCharge: serviceCharge.config.enabled ? {
        percent: serviceCharge.config.percent,
        amount: scAmount,
      } : undefined,
      discount: discountResult ? {
        type: discountResult.discountType,
        label: discountResult.discountType === 'SC' ? 'SC Discount' :
               discountResult.discountType === 'PWD' ? 'PWD Discount' :
               discountResult.discountType === 'EMP' ? 'Employee Discount' :
               discountResult.discountType === 'NATL_ATH' ? 'National Athlete Discount' : 'Promo Discount',
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
  }, [order, orderNumber, discountResult, serviceCharge]);

  const handleCompletePayment = useCallback(
    async (method: PaymentMethod) => {
      const finalTotal = discountResult ? discountResult.finalAmount : order.total;
      const currentOrderId = `ORD-${String(orderNumber).padStart(4, '0')}`;

      // Call inventory deduction API
      const result = await inventory.deductInventory(
        order.items,
        currentOrderId,
        method,
        finalTotal,
      );

      if (!result.success) {
        // Insufficient stock — block payment, allow edit
        toast.error(result.error || 'Inventory deduction failed');
        setView('menu');
        return;
      }

      if (result.queued) {
        toast.info('Order saved — inventory pending validation');
      }

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
    [order, completeOrder, orderNumber, discountResult, printer, buildReceiptData, inventory]
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

  const handleVoidRefundComplete = useCallback((completedOrd: CompletedOrder, type: 'void' | 'refund') => {
    addVoidRefund({ orderId: completedOrd.id, type, amount: completedOrd.total });
    setVoidRefundOrder(null);
  }, [addVoidRefund]);

  const handleItemDiscount = useCallback((item: OrderItem) => {
    setItemDiscountTarget(item);
  }, []);

  const handleApplyItemDiscount = useCallback((instanceId: string, discount: ItemDiscount) => {
    order.applyItemDiscount(instanceId, discount);
    setItemDiscountTarget(null);
    toast.success(`Discount applied to ${order.items.find(i => i.instanceId === instanceId)?.menuItem.name}`);
  }, [order]);

  const handleRemoveItemDiscount = useCallback((instanceId: string) => {
    order.removeItemDiscount(instanceId);
    setItemDiscountTarget(null);
    toast.success('Item discount removed');
  }, [order]);

  const scAmount = serviceCharge.calculateServiceCharge(order.total);
  const payableTotal = discountResult ? discountResult.finalAmount : (order.total + scAmount);

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
          {/* Online/Offline indicator */}
          <div
            className={`h-10 px-3 rounded-lg flex items-center gap-1.5 font-display font-semibold text-xs ${
              inventory.isOnline
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
            title={inventory.isOnline ? 'Connected to inventory' : 'Offline — orders will be queued'}
          >
            {inventory.isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {inventory.isOnline ? 'Online' : 'Offline'}
          </div>
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
              onItemDiscount={handleItemDiscount}
              discountApplied={discountResult ? { discountType: discountResult.discountType, finalAmount: discountResult.finalAmount } : null}
              serviceCharge={serviceCharge.config.enabled ? { enabled: true, percent: serviceCharge.config.percent, amount: scAmount } : undefined}
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
      {itemDiscountTarget && (
        <ItemDiscountFlow
          item={itemDiscountTarget}
          onApply={handleApplyItemDiscount}
          onRemove={handleRemoveItemDiscount}
          onClose={() => setItemDiscountTarget(null)}
        />
      )}
    </div>
  );
};

export default POS;
