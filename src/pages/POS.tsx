import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrderState, calculateItemFinal, calculateItemDiscount } from '@/components/pos/useOrderState';
import { useDailySummary } from '@/components/pos/useDailySummary';
import { usePrinter } from '@/components/pos/print/usePrinter';

import { useServiceCharge } from '@/components/pos/useServiceCharge';
import { useSlipManagement } from '@/components/pos/useSlipManagement';
import { ReceiptData } from '@/components/pos/print/escpos';
import { buildTwoCopyReceiptBytes } from '@/components/pos/print/escpos80';
import { bluetoothPrinter } from '@/components/pos/print/bluetoothPrinter';
import {
  fetchBranchConfig, fetchVatMode, generateOrderSlipNumber,
  generateControlNumber, calculateVatBreakdown, saveSale, saveSlipRecord,
  BranchConfig, VatBreakdown,
} from '@/components/pos/useSalesEngine';
// Invoice generation removed — computations stored in DB, no PDF printing
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
import TransactionsMasterlist from '@/components/pos/TransactionsMasterlist';
import TransactionsSummaryView from '@/components/pos/TransactionsSummaryView';
import { MenuCategory, PaymentMethod, MenuItem, CompletedOrder, OrderItem, ItemDiscount } from '@/components/pos/types';
import { BarChart3, Printer, Shield, AlertTriangle, Lock, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import logoEmblem from '@/assets/logo-emblem.jpg';

type POSView = 'menu' | 'pre-payment' | 'payment' | 'summary' | 'z-reading' | 'printer-settings' | 'supervisors' | 'transactions';

const POS = () => {
  const order = useOrderState();
  const { summary, completeOrder, addDiscount, addVoidRefund } = useDailySummary();
  const printer = usePrinter();
  
  const serviceCharge = useServiceCharge();
  const [view, setView] = useState<POSView>('menu');
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('sandwiches');
  const [addOnPromptItemId, setAddOnPromptItemId] = useState<string | null>(null);
  const [voidRefundOrder, setVoidRefundOrder] = useState<CompletedOrder | null | 'search'>(null);
  const [itemDiscountTarget, setItemDiscountTarget] = useState<OrderItem | null>(null);
  const [reprintOrder, setReprintOrder] = useState<CompletedOrder | null>(null);
  const [printerWarningDismissed, setPrinterWarningDismissed] = useState(false);
  // printModalData removed — now using auto-print ESC/POS

  // Branch config + VAT mode loaded on mount
  const [branchConfig, setBranchConfig] = useState<BranchConfig | null>(null);
  const [vatMode, setVatMode] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [cashierName, setCashierName] = useState('CASHIER');
  const loadedRef = useRef(false);
  const paymentInFlight = useRef(false);

  // Day-close state
  const slipMgmt = useSlipManagement(branchConfig?.code || 'QC01');

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const [bc, vm] = await Promise.all([fetchBranchConfig(), fetchVatMode()]);
      setBranchConfig(bc);
      setVatMode(vm);
      // Load cashier name
      const { data: cnData } = await supabase.from('pos_settings').select('setting_value').eq('setting_key', 'cashier_name').single();
      if (cnData?.setting_value && (cnData.setting_value as any).name) {
        setCashierName((cnData.setting_value as any).name);
      }
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
    async (method: PaymentMethod, cashReceived?: number, changeAmount?: number) => {
      if (paymentInFlight.current) return;
      paymentInFlight.current = true;
      if (!branchConfig) {
        toast.error('Branch config not loaded');
        paymentInFlight.current = false;
        return;
      }

      if (slipMgmt.dayClose.isClosed) {
        toast.error('Day is closed — cannot complete transaction');
        setView('menu');
        paymentInFlight.current = false;
        return;
      }

      // 1. Generate order slip number + control number
      const txId = `TXN-${Date.now()}`;
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
          cashierName,
          branchCode: branchConfig.code,
          serviceChargePercent: serviceCharge.config.percent,
          transactionId: txId,
          cashReceived: cashReceived ?? null,
          changeAmount: changeAmount ?? null,
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
        cashierName,
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
        cashier: cashierName,
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
        cashReceived: cashReceived,
        change: changeAmount,
      };
      // 5. Auto-print ESC/POS two copies (fire-and-forget)
      const bytes = buildTwoCopyReceiptBytes(receiptData);
      if (bluetoothPrinter.status.connected) {
        bluetoothPrinter.sendBytes(bytes).then(ok => {
          if (ok) toast.success('Receipt printed ✓');
          else toast.error('Print failed — check printer');
        });
      } else {
        toast.warning('Printer not connected — receipt not printed');
      }

      // 6. Clear order and reset view
      order.clearOrder();
      setView('menu');
      paymentInFlight.current = false;
    },
    [order, completeOrder, printer, branchConfig, vatBreakdown, payableTotal, serviceCharge, scAmount, slipMgmt.dayClose.isClosed]
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

    // Build ESC/POS reprint and send directly
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
            ? `${item.discount.discount_name || item.discount.reason} -PHP${discAmt.toFixed(2)}`
            : undefined,
          idNumber: item.discount?.id_number,
        };
      }),
      subtotal: completedOrder.total,
      total: completedOrder.total,
      paymentMethod: completedOrder.paymentMethod,
      isReprint: true,
    };

    const bytes = buildTwoCopyReceiptBytes(receiptData);
    if (bluetoothPrinter.status.connected) {
      bluetoothPrinter.sendBytes(bytes).then(ok => {
        if (ok) toast.success('Reprint sent to printer ✓');
        else toast.error('Reprint failed');
      });
    } else {
      toast.warning('Printer not connected — reprint not sent');
    }
  }, [branchConfig]);

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
      {/* Printer not connected warning banner */}
      {!printer.status.connected && view !== 'printer-settings' && !printerWarningDismissed && (
        <div className="fixed inset-0 z-50 bg-background/90 flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
            <AlertTriangle size={40} className="text-accent" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground text-center">Printer Not Connected</h2>
          <p className="font-body text-foreground/60 text-center max-w-md text-sm leading-relaxed">
            Printer not working? Please ensure you have a manual order slip ready before proceeding. You may also contact Tech Support for assistance.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => setView('printer-settings')}
              className="h-14 w-full bg-primary text-primary-foreground rounded-xl font-display font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.97] transition-transform"
            >
              <Printer size={20} />
              Connect Printer
            </button>
            <button
              onClick={() => setPrinterWarningDismissed(true)}
              className="h-12 w-full bg-foreground/10 text-foreground rounded-xl font-display font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              Continue Without Printer
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-14 shrink-0 bg-primary flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src={logoEmblem} alt="FWT" className="h-9 w-9 rounded-full object-cover border-2 border-primary-foreground/20" />
          <span className="font-display text-xl font-bold text-primary-foreground">Fifth D</span>
          <span className="font-display text-xs text-primary-foreground/40 hidden sm:block uppercase tracking-widest">POS</span>
          <span className="font-display text-xs text-primary-foreground/70 bg-primary-foreground/10 px-2 py-0.5 rounded-md">{cashierName}</span>
          {slipMgmt.dayClose.isClosed && (
            <span className="flex items-center gap-1 text-xs font-display font-bold text-accent bg-accent/20 px-2 py-1 rounded-lg">
              <Lock size={12} /> Day Closed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => setView(view === 'transactions' ? 'menu' : 'transactions')}
            className="h-10 w-10 rounded-lg bg-primary-foreground/10 text-primary-foreground/40 flex items-center justify-center active:scale-[0.97] transition-transform"
            title="Transactions Summary"
          >
            <ListChecks size={18} />
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
        <SupervisorManagement onBack={() => setView('menu')} onCashierNameChange={setCashierName} />
      ) : view === 'transactions' ? (
        <TransactionsSummaryView
          branchId={branchConfig?.code || 'QC01'}
          branchConfig={branchConfig}
          onBack={() => setView('menu')}
          onDayCloseChange={() => slipMgmt.checkDayClose()}
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
              onSpecialInstruction={order.setSpecialInstruction}
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
    </div>
  );
};

export default POS;
