import { useState, useCallback, useEffect, useRef } from 'react';
import { useOrderState, calculateItemFinal, calculateItemDiscount } from '@/components/pos/useOrderState';
import { useDailySummary } from '@/components/pos/useDailySummary';
import { usePrinter } from '@/components/pos/print/usePrinter';
import { useInventoryIntegration } from '@/components/pos/useInventoryIntegration';
import { useServiceCharge } from '@/components/pos/useServiceCharge';
import { useSlipManagement } from '@/components/pos/useSlipManagement';
import { ReceiptData } from '@/components/pos/print/escpos';
import {
  fetchBranchConfig, fetchVatMode, generateOrderSlipNumber,
  generateControlNumber, calculateVatBreakdown, saveSale, saveSlipRecord,
  BranchConfig, VatBreakdown,
} from '@/components/pos/useSalesEngine';
import { downloadInvoice, InvoiceData, renderInvoiceToCanvas } from '@/components/pos/generateInvoice';
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
import ReprintFlow from '@/components/pos/ReprintFlow';
import SlipSummaryDashboard from '@/components/pos/SlipSummaryDashboard';
import ManualPrintModal from '@/components/pos/ManualPrintModal';
import { MenuCategory, PaymentMethod, MenuItem, CompletedOrder, OrderItem, ItemDiscount } from '@/components/pos/types';
import { BarChart3, Printer, Shield, Wifi, WifiOff, AlertTriangle, FileText, Lock } from 'lucide-react';
import { toast } from 'sonner';
import logoEmblem from '@/assets/logo-emblem.jpg';

type POSView = 'menu' | 'pre-payment' | 'payment' | 'summary' | 'z-reading' | 'printer-settings' | 'supervisors' | 'slip-summary';

const POS = () => {
  const order = useOrderState();
  const { summary, completeOrder, addDiscount, addVoidRefund } = useDailySummary();
  const printer = usePrinter();
  const inventory = useInventoryIntegration();
  const serviceCharge = useServiceCharge();
  const [view, setView] = useState<POSView>('menu');
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('sandwiches');
  const [addOnPromptItemId, setAddOnPromptItemId] = useState<string | null>(null);
  const [voidRefundOrder, setVoidRefundOrder] = useState<CompletedOrder | null | 'search'>(null);
  const [itemDiscountTarget, setItemDiscountTarget] = useState<OrderItem | null>(null);
  const [reprintOrder, setReprintOrder] = useState<CompletedOrder | null>(null);
  const [printModalData, setPrintModalData] = useState<{ receipt: ReceiptData; invoice: InvoiceData } | null>(null);

  // Branch config + VAT mode loaded on mount
  const [branchConfig, setBranchConfig] = useState<BranchConfig | null>(null);
  const [vatMode, setVatMode] = useState<'inclusive' | 'exclusive'>('inclusive');
  const loadedRef = useRef(false);

  // Day-close state
  const slipMgmt = useSlipManagement(branchConfig?.code || 'QC01');

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
    if (slipMgmt.dayClose.isClosed) {
      toast.error('Day is closed — no new transactions allowed');
      return;
    }
    setView('pre-payment');
  }, [order.items.length, slipMgmt.dayClose.isClosed]);

  const handleContinueToPayment = useCallback(() => setView('payment'), []);
  const handleEditOrder = useCallback(() => setView('menu'), []);

  // Phase 6: Post-payment automation
  const handleCompletePayment = useCallback(
    async (method: PaymentMethod) => {
      if (!branchConfig) {
        toast.error('Branch config not loaded');
        return;
      }

      if (slipMgmt.dayClose.isClosed) {
        toast.error('Day is closed — cannot complete transaction');
        setView('menu');
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
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth()+1).padStart(2,'0');
        const dd = String(now.getDate()).padStart(2,'0');
        orderSlipNumber = `OS-${branchConfig.code}-${yy}${mm}${dd}-0000`;
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

      // 3b. Save slip record
      saveSlipRecord({
        slipNumber: orderSlipNumber,
        branchId: branchConfig.code,
        deviceId: 'TAB-A8-01',
        cashierName: 'ANA',
        total: payableTotal,
      });

      // Track in daily summary
      completeOrder(order.items, payableTotal, method, orderSlipNumber);
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

      // 5. Build invoice data
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

      // 6. Show manual print modal (no auto-loop)
      setPrintModalData({ receipt: receiptData, invoice: invoiceData });

      // 7. Clear order and reset view
      order.clearOrder();
      setView('menu');
    },
    [order, completeOrder, printer, inventory, branchConfig, vatBreakdown, payableTotal, serviceCharge, scAmount, slipMgmt.dayClose.isClosed]
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
    addVoidRefund({ orderId: completedOrd.orderSlipNumber, type, amount: completedOrd.total });
    setVoidRefundOrder(null);
  }, [addVoidRefund]);

  const handleReprint = useCallback((completedOrder: CompletedOrder) => {
    setReprintOrder(completedOrder);
  }, []);

  const handleReprintComplete = useCallback((completedOrder: CompletedOrder, isReprint: boolean) => {
    if (!branchConfig) return;
    setReprintOrder(null);

    // Print 3 copies with REPRINT COPY label
    const now = new Date();
    const receiptData: ReceiptData = {
      storeName: branchConfig.legal_name,
      branchName: branchConfig.name,
      orderSlipNumber: completedOrder.orderSlipNumber,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      cashier: 'ANA',
      items: completedOrder.items.map(item => {
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
      subtotal: completedOrder.total,
      total: completedOrder.total,
      paymentMethod: completedOrder.paymentMethod,
      isReprint: true,
    };

    const invoiceData: InvoiceData = {
      branchConfig,
      orderSlipNumber: completedOrder.orderSlipNumber,
      controlNumber: 0,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      cashier: 'ANA',
      items: completedOrder.items,
      vatBreakdown: calculateVatBreakdown(completedOrder.items, 0, vatMode),
      serviceChargePercent: 0,
      paymentMethod: completedOrder.paymentMethod,
      isReprint: true,
    };

    // Show manual print modal instead of auto-loop
    setPrintModalData({ receipt: receiptData, invoice: invoiceData });
    toast.success('Reprint ready — use print modal');
  }, [branchConfig, vatMode]);

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
          {slipMgmt.dayClose.isClosed && (
            <span className="flex items-center gap-1 text-xs font-display font-bold text-accent bg-accent/20 px-2 py-1 rounded-lg">
              <Lock size={12} /> Day Closed
            </span>
          )}
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
          <button
            onClick={() => setVoidRefundOrder('search')}
            className="h-10 w-10 rounded-lg bg-primary-foreground/10 text-primary-foreground/40 flex items-center justify-center active:scale-[0.97] transition-transform"
            title="Void / Refund"
          >
            <AlertTriangle size={18} />
          </button>
          <button
            onClick={() => setView(view === 'slip-summary' ? 'menu' : 'slip-summary')}
            className="h-10 w-10 rounded-lg bg-primary-foreground/10 text-primary-foreground/40 flex items-center justify-center active:scale-[0.97] transition-transform"
            title="Slip Summary"
          >
            <FileText size={18} />
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
        <DailySummary summary={summary} onBack={() => setView('menu')} onVoidRefund={handleVoidRefund} onReprint={handleReprint} onZReading={() => setView('z-reading')} />
      ) : view === 'z-reading' ? (
        <ZReadingReport summary={summary} onBack={() => setView('summary')} />
      ) : view === 'printer-settings' ? (
        <PrinterSettings onBack={() => setView('menu')} />
      ) : view === 'supervisors' ? (
        <SupervisorManagement onBack={() => setView('menu')} />
      ) : view === 'slip-summary' ? (
        <SlipSummaryDashboard
          branchId={branchConfig?.code || 'QC01'}
          onBack={() => setView('menu')}
          onDayCloseChange={(closed) => slipMgmt.checkDayClose()}
        />
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
        <VoidRefundFlow
          order={voidRefundOrder === 'search' ? undefined : voidRefundOrder}
          onComplete={handleVoidRefundComplete}
          onCancel={() => setVoidRefundOrder(null)}
        />
      )}
      {reprintOrder && (
        <ReprintFlow
          order={reprintOrder}
          onReprint={handleReprintComplete}
          onCancel={() => setReprintOrder(null)}
        />
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
      {printModalData && (
        <ManualPrintModal
          receiptData={printModalData.receipt}
          invoiceData={printModalData.invoice}
          onClose={() => setPrintModalData(null)}
        />
      )}
    </div>
  );
};

export default POS;
