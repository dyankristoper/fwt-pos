import { useState, useCallback, useEffect, useRef } from 'react';
import { useOrderState, calculateItemFinal, calculateItemDiscount } from '@/components/pos/useOrderState';
import { useDailySummary } from '@/components/pos/useDailySummary';
import { usePrinter } from '@/components/pos/print/usePrinter';
import { useInventoryIntegration } from '@/components/pos/useInventoryIntegration';
import { useServiceCharge } from '@/components/pos/useServiceCharge';
import { ReceiptData } from '@/components/pos/print/escpos';
import {
  fetchBranchConfig, fetchVatMode, generateOrderSlipNumber,
  generateControlNumber, calculateVatBreakdown, saveSale,
  BranchConfig, VatBreakdown,
} from '@/components/pos/useSalesEngine';
import { downloadInvoice, InvoiceData } from '@/components/pos/generateInvoice';
import MenuPanel from '@/components/pos/MenuPanel';
import OrderPanel from '@/components/pos/OrderPanel';
import ComboPrompt from '@/components/pos/ComboPrompt';
import AddOnPrompt from '@/components/pos/AddOnPrompt';
import PaymentFlow from '@/components/pos/PaymentFlow';
import DailySummary from '@/components/pos/DailySummary';
import ZReadingReport from '@/components/pos/ZReadingReport';
import PrinterSettings from '@/components/pos/PrinterSettings';
import SupervisorManagement from '@/components/pos/SupervisorManagement';
import VoidRefundFlow from '@/components/pos/VoidRefundFlow';
import ItemDiscountFlow from '@/components/pos/ItemDiscountFlow';
import PrePaymentModal from '@/components/pos/PrePaymentModal';
import { MenuCategory, PaymentMethod, MenuItem, CompletedOrder, OrderItem, ItemDiscount } from '@/components/pos/types';
import { BarChart3, Printer, Shield, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import logoEmblem from '@/assets/logo-emblem.jpg';

type POSView = 'menu' | 'pre-payment' | 'payment' | 'summary' | 'z-reading' | 'printer-settings' | 'supervisors';

const POS = () => {
  const order = useOrderState();
  const { summary, completeOrder, addDiscount, addVoidRefund } = useDailySummary();
  const printer = usePrinter();
  const inventory = useInventoryIntegration();
  const serviceCharge = useServiceCharge();
  const [view, setView] = useState<POSView>('menu');
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('sandwiches');
  const [addOnPromptItemId, setAddOnPromptItemId] = useState<string | null>(null);
  const [voidRefundOrder, setVoidRefundOrder] = useState<CompletedOrder | null>(null);
  const [itemDiscountTarget, setItemDiscountTarget] = useState<OrderItem | null>(null);

  // Branch config + VAT mode loaded on mount
  const [branchConfig, setBranchConfig] = useState<BranchConfig | null>(null);
  const [vatMode, setVatMode] = useState<'inclusive' | 'exclusive'>('inclusive');
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const [bc, vm] = await Promise.all([fetchBranchConfig(), fetchVatMode()]);
      setBranchConfig(bc);
      setVatMode(vm);
    })();
  }, []);

  // Combo / add-on flow
  const handleComboAccept = useCallback(() => {
    const itemId = order.pendingComboItem?.instanceId;
    if (itemId) { order.makeCombo(itemId); setAddOnPromptItemId(itemId); }
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
    ? order.items.find(i => i.instanceId === addOnPromptItemId) : null;

  // Calculated totals
  const scAmount = serviceCharge.calculateServiceCharge(order.total);
  const vatBreakdown = calculateVatBreakdown(order.items, scAmount, vatMode);
  const payableTotal = vatBreakdown.totalAmountDue;

  // Phase 4: Pre-payment modal → payment
  const handleProceedToPayment = useCallback(() => {
    if (order.items.length === 0) return;
    setView('pre-payment');
  }, [order.items.length]);

  const handleContinueToPayment = useCallback(() => setView('payment'), []);
  const handleEditOrder = useCallback(() => setView('menu'), []);

  // Phase 6: Post-payment automation
  const handleCompletePayment = useCallback(
    async (method: PaymentMethod) => {
      if (!branchConfig) {
        toast.error('Branch config not loaded');
        return;
      }

      // 1. Inventory deduction
      const txId = `TXN-${Date.now()}`;
      const result = await inventory.deductInventory(order.items, txId, method, payableTotal);

      if (!result.success) {
        toast.error(result.error || 'Inventory deduction failed — cannot complete sale');
        setView('menu');
        return;
      }

      if (result.queued) {
        toast.info('Order saved — inventory pending validation');
      }

      // 2. Generate order slip number + control number
      let orderSlipNumber: string;
      let controlNumber: number;
      try {
        [orderSlipNumber, controlNumber] = await Promise.all([
          generateOrderSlipNumber(branchConfig.code),
          generateControlNumber(),
        ]);
      } catch (err) {
        toast.error('Failed to generate order/control numbers');
        console.error(err);
        // Still proceed, use fallback
        const now = new Date();
        const dateStr = `${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getFullYear()).slice(-2)}`;
        orderSlipNumber = `${dateStr}-0000-${branchConfig.code}`;
        controlNumber = 0;
      }

      // 3. Save to completed_sales
      try {
        await saveSale({
          orderSlipNumber,
          controlNumber,
          items: order.items,
          vatBreakdown,
          paymentMethod: method,
          cashierName: 'ANA',
          branchCode: branchConfig.code,
          serviceChargePercent: serviceCharge.config.percent,
          transactionId: txId,
        });
      } catch (err) {
        console.error('Failed to save sale:', err);
        toast.error('Sale record failed to save');
      }

      // Track in daily summary
      completeOrder(order.items, payableTotal, method);
      toast.success(`Order ${orderSlipNumber} completed ✓`);

      // 4. Print 3 copies of Order Slip
      const now = new Date();
      const receiptData: ReceiptData = {
        storeName: branchConfig.legal_name,
        branchName: branchConfig.name,
        orderSlipNumber,
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        cashier: 'ANA',
        items: order.items.map(item => {
          const discAmt = calculateItemDiscount(item);
          return {
            qty: item.quantity,
            name: item.menuItem.name,
            amount: calculateItemFinal(item),
            discountLabel: item.discount
              ? `${item.discount.discount_name || item.discount.reason} -₱${discAmt.toFixed(2)}`
              : undefined,
            idNumber: item.discount?.id_number,
          };
        }),
        subtotal: order.total,
        serviceCharge: serviceCharge.config.enabled ? {
          percent: serviceCharge.config.percent,
          amount: scAmount,
        } : undefined,
        total: payableTotal,
        paymentMethod: method,
      };

      // Print 3 copies
      for (let i = 0; i < 3; i++) {
        printer.printReceipt(receiptData);
      }

      // 5. Generate Sales Invoice PDF (save locally, don't print)
      try {
        const invoiceData: InvoiceData = {
          branchConfig,
          orderSlipNumber,
          controlNumber,
          date: now.toISOString().slice(0, 10),
          time: now.toTimeString().slice(0, 5),
          cashier: 'ANA',
          items: order.items,
          vatBreakdown,
          serviceChargePercent: serviceCharge.config.percent,
          paymentMethod: method,
        };
        downloadInvoice(invoiceData);
      } catch (err) {
        console.error('Invoice generation failed:', err);
        toast.error('Invoice PDF generation failed');
      }

      // 6. Clear and reset
      order.clearOrder();
      setView('menu');
    },
    [order, completeOrder, printer, inventory, branchConfig, vatBreakdown, payableTotal, serviceCharge, scAmount]
  );

  const handleClearOrder = useCallback(() => {
    const snapshot = [...order.items];
    order.clearOrder();
    toast('Order cleared', {
      action: { label: 'Undo', onClick: () => order.restoreOrder(snapshot) },
    });
  }, [order]);

  const handleCancelPayment = useCallback(() => setView('menu'), []);
  const handleAddIncidental = useCallback((item: MenuItem) => order.addItem(item), [order]);

  const handleVoidRefund = useCallback((completedOrder: CompletedOrder) => {
    setVoidRefundOrder(completedOrder);
  }, []);

  const handleVoidRefundComplete = useCallback((completedOrd: CompletedOrder, type: 'void' | 'refund') => {
    addVoidRefund({ orderId: completedOrd.id, type, amount: completedOrd.total });
    setVoidRefundOrder(null);
  }, [addVoidRefund]);

  const handleItemDiscount = useCallback((item: OrderItem) => { setItemDiscountTarget(item); }, []);

  const handleApplyItemDiscount = useCallback((instanceId: string, discount: ItemDiscount) => {
    order.applyItemDiscount(instanceId, discount);
    setItemDiscountTarget(null);
    toast.success(`${discount.discount_name || 'Discount'} applied`);
  }, [order]);

  const handleRemoveItemDiscount = useCallback((instanceId: string) => {
    order.removeItemDiscount(instanceId);
    setItemDiscountTarget(null);
    toast.success('Item discount removed');
  }, [order]);

  const scData = serviceCharge.config.enabled
    ? { enabled: true, percent: serviceCharge.config.percent, amount: scAmount } : undefined;

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
          <div
            className={`h-10 px-3 rounded-lg flex items-center gap-1.5 font-display font-semibold text-xs ${
              inventory.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {inventory.isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {inventory.isOnline ? 'Online' : 'Offline'}
          </div>
          <button
            onClick={() => setView(view === 'printer-settings' ? 'menu' : 'printer-settings')}
            className={`h-10 w-10 rounded-lg flex items-center justify-center active:scale-[0.97] transition-transform ${
              printer.status.connected ? 'bg-pos-gold/20 text-pos-gold' : 'bg-primary-foreground/10 text-primary-foreground/40'
            }`}
          >
            <Printer size={18} />
          </button>
          <button
            onClick={() => setView(view === 'supervisors' ? 'menu' : 'supervisors')}
            className="h-10 w-10 rounded-lg bg-primary-foreground/10 text-primary-foreground/40 flex items-center justify-center active:scale-[0.97] transition-transform"
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
            {(view === 'menu' || view === 'pre-payment') && (
              <MenuPanel activeCategory={activeCategory} onCategoryChange={setActiveCategory} onItemTap={order.addItem} />
            )}
            {view === 'payment' && (
              <PaymentFlow total={payableTotal} onComplete={handleCompletePayment} onCancel={handleCancelPayment} />
            )}
          </div>
          <div className="w-[35%] flex flex-col border-l-2 border-foreground/10 bg-card">
            <OrderPanel
              items={order.items}
              total={order.total}
              orderNumber={0}
              readOnly={view === 'payment' || view === 'pre-payment'}
              onIncrement={order.incrementQuantity}
              onDecrement={order.decrementQuantity}
              onRemoveItem={order.removeItem}
              onRemoveAddOn={order.removeAddOn}
              onClearOrder={handleClearOrder}
              onProceedToPayment={handleProceedToPayment}
              onAddIncidental={handleAddIncidental}
              onItemDiscount={handleItemDiscount}
              serviceCharge={scData}
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
      {view === 'pre-payment' && (
        <PrePaymentModal
          items={order.items}
          subtotal={order.total}
          serviceCharge={scData}
          vatBreakdown={vatBreakdown}
          totalAmountDue={payableTotal}
          onContinueToPayment={handleContinueToPayment}
          onEditOrder={handleEditOrder}
        />
      )}
    </div>
  );
};

export default POS;
